-- ============================================================================
-- BuiltFolio Database Schema & Row Level Security (RLS)
-- Target: Supabase Postgres (ap-south-1)
-- Revision: 0001_initial_schema
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. UNIFIED DISCIPLINES & ROLES LOOKUP
-- ============================================================================
create table public.disciplines (
  code text primary key,
  label text not null,
  sort_order int not null default 0
);

insert into public.disciplines (code, label, sort_order) values
  ('ARCHITECT', 'Architect', 1),
  ('STRUCTURAL', 'Structural Engineer', 2),
  ('CIVIL', 'Civil Engineer', 3),
  ('INTERIOR', 'Interior Designer', 4),
  ('CONTRACTOR', 'Contractor', 5),
  ('MEP', 'MEP Engineer', 6),
  ('LANDSCAPE', 'Landscape Architect', 7),
  ('QS', 'Quantity Surveyor', 8);

-- Helper function to check if current user is an admin
create or replace function public.is_admin()
returns boolean security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid()),
    false
  );
$$ language sql stable;

-- ============================================================================
-- 2. PROFILES & CONTACT DETAILS
-- ============================================================================
-- profiles.id is independent UUID; user_id is nullable for unclaimed profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  handle text unique not null check (handle ~* '^[a-z0-9_-]{3,30}$'),
  full_name text not null,
  discipline text not null references public.disciplines(code),
  city text not null default 'Pune',
  state text not null default 'Maharashtra',
  bio text,
  experience_yrs int check (experience_yrs >= 0),
  reg_body text, -- 'COA', 'IEI', 'PWD', 'ISOLA'
  reg_no text,   -- e.g. 'CA/2012/55490'
  avatar_url text,
  is_admin boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sensitive contact info isolated from public table
create table public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public-facing view without phone/email
create or replace view public.profiles_public as
select
  id,
  user_id,
  handle,
  full_name,
  discipline,
  city,
  state,
  bio,
  experience_yrs,
  reg_body,
  reg_no,
  avatar_url,
  verified_at is not null as is_verified,
  created_at
from public.profiles;

-- Prevent non-admins from self-granting is_admin or verified_at
create or replace function public.trg_protect_profile_fields()
returns trigger as $$
begin
  if not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Only administrators may alter is_admin.';
    end if;
    if new.verified_at is distinct from old.verified_at then
      raise exception 'Only administrators may alter verified_at.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger protect_profile_fields
before update on public.profiles
for each row execute function public.trg_protect_profile_fields();

-- ============================================================================
-- 3. VERIFICATIONS (Admin moderation queue)
-- ============================================================================
create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text not null check (doc_type in ('COA_CERT', 'IEI_CERT', 'PWD_LICENSE', 'DEGREE', 'GOVT_ID')),
  doc_path text not null, -- Private storage path
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. PROJECTS
-- ============================================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~* '^[a-z0-9-]+$'),
  title text not null,
  type text not null check (type in ('Residential', 'Commercial', 'Industrial', 'Interiors', 'Landscape', 'Infrastructure')),
  type_label text not null, -- e.g. 'Courtyard House', '3BHK Villa'
  city text not null default 'Pune',
  state text not null default 'Maharashtra',
  year int not null check (year between 1950 and 2035),
  
  -- Area storage: stored as entered + immutable generated area_sqft
  area_value numeric(10,2) not null check (area_value > 0),
  area_unit text not null check (area_unit in ('SQFT', 'SQM')),
  area_sqft numeric(10,2) generated always as (
    case
      when area_unit = 'SQFT' then area_value
      when area_unit = 'SQM'  then round(area_value * 10.7639, 2)
    end
  ) stored,
  
  cost_band_inr text, -- '₹1,40,00,000.00 – ₹1,55,00,000.00'
  status text not null default 'DRAFT' check (status in ('DRAFT', 'REVIEW', 'PUBLIC', 'HIDDEN')),
  description text,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Trust and legal compliance
  ownership_declared boolean not null default false,
  client_consent boolean not null default false,
  address_hidden boolean not null default true,
  
  -- Cached credited names for unified full-text search
  credited_names_cached text not null default '',
  
  -- Postgres FTS with titles, typology, location, description, and credited entities
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(type_label, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(credited_names_cached, '')
    )
  ) stored,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- CHECK: PUBLIC status strictly requires ownership declaration and client consent
  constraint chk_public_prerequisites check (
    status != 'PUBLIC' or (ownership_declared = true and client_consent = true)
  )
);

create index projects_fts_idx on public.projects using gin (fts);
create index projects_filter_idx on public.projects (status, type, city, area_sqft, year);

-- Enforce state transition: Owners can only move DRAFT -> REVIEW. Only Admins can set PUBLIC.
create or replace function public.trg_enforce_project_status_transitions()
returns trigger as $$
begin
  if not public.is_admin() then
    -- Non-admin cannot set status to PUBLIC
    if new.status = 'PUBLIC' and old.status != 'PUBLIC' then
      raise exception 'Only administrators can approve projects to PUBLIC status.';
    end if;
    -- Non-admin can only transition DRAFT -> REVIEW, or return to DRAFT
    if new.status not in ('DRAFT', 'REVIEW') and old.status in ('DRAFT', 'REVIEW') then
      raise exception 'Owners may only transition projects between DRAFT and REVIEW.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger enforce_project_status
before update on public.projects
for each row execute function public.trg_enforce_project_status_transitions();

-- ============================================================================
-- 5. PROJECT CREDITS
-- ============================================================================
create table public.project_credits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  role text not null references public.disciplines(code),
  firm_name text,
  reg_body text,
  reg_no text,
  scope_note text,
  invited_contact text, -- Phone or email for unlinked professionals
  status text not null default 'UNCONFIRMED' check (status in ('UNCONFIRMED', 'CONFIRMED', 'DISPUTED')),
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credits_project_idx on public.project_credits(project_id);
create index credits_profile_idx on public.project_credits(profile_id);

-- Sync credited names cache into projects.credited_names_cached for FTS
create or replace function public.trg_sync_project_credited_names()
returns trigger as $$
declare
  target_project_id uuid;
begin
  target_project_id := coalesce(new.project_id, old.project_id);
  update public.projects
  set credited_names_cached = (
    select coalesce(string_agg(name || ' ' || coalesce(firm_name, ''), ' '), '')
    from public.project_credits
    where project_id = target_project_id
  )
  where id = target_project_id;
  return null;
end;
$$ language plpgsql;

create trigger sync_credited_names
after insert or update or delete on public.project_credits
for each row execute function public.trg_sync_project_credited_names();

-- Protect credit status changes: Only credited profile or admin can set CONFIRMED / DISPUTED
create or replace function public.trg_protect_credit_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if not public.is_admin() then
      if old.profile_id is null or old.profile_id not in (
        select id from public.profiles where user_id = auth.uid()
      ) then
        raise exception 'Only the credited professional or an admin can confirm or dispute a credit.';
      end if;
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger protect_credit_status
before update on public.project_credits
for each row execute function public.trg_protect_credit_status();

-- ============================================================================
-- 6. PROJECT ASSETS & REVISION VERSIONING
-- ============================================================================
create table public.project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('IMAGE', 'DRAWING', 'MODEL', 'DOC')),
  drawing_type text,
  sheet_no text not null default 'A-01',
  revision int not null default 1 check (revision >= 1),
  scale text,
  units text not null default 'm' check (units in ('mm', 'm', 'ft', 'in')),
  access_level text not null default 'PUBLIC' check (access_level in ('PUBLIC', 'ON_REQUEST', 'PRIVATE')),
  storage_path text not null,
  preview_path text,
  mime_type text not null,
  size_bytes bigint not null,
  sort_order int not null default 0,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),

  -- Unique constraint per project sheet revision
  constraint uq_project_sheet_rev unique (project_id, sheet_no, revision)
);

create index assets_project_idx on public.project_assets(project_id, sort_order);

-- ============================================================================
-- 7. DOWNLOAD REQUESTS (Time-gated 24h signed links)
-- ============================================================================
create table public.download_requests (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.project_assets(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  requester_name text not null,
  requester_contact text not null,
  message text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DENIED')),
  download_token text unique,
  link_expires_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 8. ENQUIRIES
-- ============================================================================
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  to_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_contact text not null,
  message text not null,
  status text not null default 'NEW' check (status in ('NEW', 'READ', 'REPLIED', 'ARCHIVED')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 9. CIVIMETRIC TELEMETRY (Strictly non-PII project clicks)
-- ============================================================================
create table public.civimetric_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_type text not null,
  city text not null,
  area_sqft numeric(10,2) not null,
  clicked_at timestamptz not null default now()
);

-- ============================================================================
-- 10. TAKEDOWNS & COMPLAINTS
-- ============================================================================
create table public.takedown_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  asset_id uuid references public.project_assets(id) on delete set null,
  complainant_name text not null,
  complainant_contact text not null,
  reason text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'REVIEWED', 'ACTIONED', 'REJECTED')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 11. ADMIN AUDIT LOG
-- ============================================================================
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null, -- 'APPROVE_PROJECT', 'REJECT_PROJECT', 'VERIFY_USER', 'TAKEDOWN_ASSET'
  target_table text not null,
  target_id uuid not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.disciplines enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.verifications enable row level security;
alter table public.projects enable row level security;
alter table public.project_credits enable row level security;
alter table public.project_assets enable row level security;
alter table public.download_requests enable row level security;
alter table public.enquiries enable row level security;
alter table public.civimetric_events enable row level security;
alter table public.takedown_requests enable row level security;
alter table public.admin_audit_log enable row level security;

-- 1. DISCIPLINES
create policy "Disciplines are public readable"
  on public.disciplines for select using (true);

-- 2. PROFILES
create policy "Profiles public viewable"
  on public.profiles for select using (true);

create policy "Users update own profile"
  on public.profiles for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins full manage profiles"
  on public.profiles for all using (public.is_admin());

-- 3. PROFILE CONTACTS (Private)
create policy "Contacts viewable only by owner or admin"
  on public.profile_contacts for select using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Contacts updateable by owner"
  on public.profile_contacts for update using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Contacts insertable by owner"
  on public.profile_contacts for insert with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

-- 4. VERIFICATIONS
create policy "Owners view own verifications"
  on public.verifications for select using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Owners insert verifications"
  on public.verifications for insert with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );

create policy "Admins manage verifications"
  on public.verifications for all using (public.is_admin());

-- 5. PROJECTS
create policy "Public projects readable by anyone"
  on public.projects for select using (
    status = 'PUBLIC'
    or owner_profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Owners insert projects as DRAFT"
  on public.projects for insert with check (
    owner_profile_id in (select id from public.profiles where user_id = auth.uid())
    and status in ('DRAFT', 'REVIEW')
  );

create policy "Owners update own non-public projects"
  on public.projects for update using (
    owner_profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Owners delete own draft projects"
  on public.projects for delete using (
    owner_profile_id in (select id from public.profiles where user_id = auth.uid())
    and status = 'DRAFT'
  );

-- 6. PROJECT CREDITS
create policy "Credits on public projects are viewable"
  on public.project_credits for select using (
    project_id in (select id from public.projects where status = 'PUBLIC')
    or project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Project owners insert credits"
  on public.project_credits for insert with check (
    project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or public.is_admin()
  );

create policy "Credited person or owner updates credit"
  on public.project_credits for update using (
    profile_id in (select id from public.profiles where user_id = auth.uid())
    or project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or public.is_admin()
  );

create policy "Project owners delete credits"
  on public.project_credits for delete using (
    project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or public.is_admin()
  );

-- 7. PROJECT ASSETS
create policy "Public and On-Request metadata viewable on public projects"
  on public.project_assets for select using (
    (
      access_level in ('PUBLIC', 'ON_REQUEST')
      and project_id in (select id from public.projects where status = 'PUBLIC')
    )
    or project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or project_id in (select project_id from public.project_credits where profile_id in (select id from public.profiles where user_id = auth.uid()) and status = 'CONFIRMED')
    or public.is_admin()
  );

create policy "Project owners manage assets"
  on public.project_assets for all using (
    project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or public.is_admin()
  );

-- 8. DOWNLOAD REQUESTS
create policy "Project owners read received download requests"
  on public.download_requests for select using (
    project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or (requester_id is not null and requester_id = auth.uid())
    or public.is_admin()
  );

create policy "Anyone can insert download request"
  on public.download_requests for insert with check (true);

create policy "Project owner or admin decides download request"
  on public.download_requests for update using (
    project_id in (select id from public.projects where owner_profile_id in (select id from public.profiles where user_id = auth.uid()))
    or public.is_admin()
  );

-- 9. ENQUIRIES
create policy "Target profile or admin reads enquiries"
  on public.enquiries for select using (
    to_profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

create policy "Anyone can insert enquiry"
  on public.enquiries for insert with check (true);

create policy "Target profile updates enquiry status"
  on public.enquiries for update using (
    to_profile_id in (select id from public.profiles where user_id = auth.uid())
    or public.is_admin()
  );

-- 10. CIVIMETRIC TELEMETRY
create policy "Anyone can log civimetric event"
  on public.civimetric_events for insert with check (true);

create policy "Only admin reads civimetric telemetry"
  on public.civimetric_events for select using (public.is_admin());

-- 11. TAKEDOWNS
create policy "Anyone can submit takedown"
  on public.takedown_requests for insert with check (true);

create policy "Only admin views and reviews takedowns"
  on public.takedown_requests for select using (public.is_admin());

create policy "Admin updates takedowns"
  on public.takedown_requests for update using (public.is_admin());

-- 12. ADMIN AUDIT LOG
create policy "Only admin reads audit log"
  on public.admin_audit_log for select using (public.is_admin());

create policy "Admin writes audit log"
  on public.admin_audit_log for insert with check (public.is_admin());

-- ============================================================================
-- STORAGE BUCKETS & POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false),
       ('verifications', 'verifications', false)
on conflict (id) do nothing;

create policy "Asset download via signed URL or owner"
  on storage.objects for select using (
    bucket_id = 'project-assets'
    and (
      auth.uid() is not null
      or public.is_admin()
    )
  );

create policy "Asset upload by authenticated project owner"
  on storage.objects for insert with check (
    bucket_id = 'project-assets'
    and auth.uid() is not null
  );

create policy "Verification docs viewable by owner or admin"
  on storage.objects for select using (
    bucket_id = 'verifications'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "Verification upload by profile owner"
  on storage.objects for insert with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
