# BuiltFolio

**Find the people who built it.**

A portfolio platform for architects, civil/structural engineers and contractors in India. One project page credits everyone who worked on it (architect, structural, contractor), shows interactive drawings, and links to a cost estimate on [Civimetric](https://civimetric.in).

> Status: pre-MVP, interactive prototype only. Launch niche: residential projects in Pune.

---

## Why

Developers have GitHub. Designers have Behance. Civil engineers, structural engineers and contractors have nothing: their work lives in WhatsApp groups and client files, and architects only get Instagram-style photo grids that hide who engineered and built the project.

BuiltFolio makes the whole project team visible and verifiable, and lets people explore the drawings, not just the photos.

## What makes it different

1. **Multi-credit projects.** One page, every discipline. Each credit is confirmed by the credited person, otherwise it shows as "unconfirmed".
2. **Interactive drawings.** Pan/zoom floor plans, column grids and a 3D view in the browser. No download needed.
3. **Controlled access.** Drawings are public, request-only or private. Owners approve every download.
4. **Estimate this project.** One click opens Civimetric with area, type and city prefilled.

## MVP scope

| In | Out (later) |
| --- | --- |
| Profiles with discipline, city, registration no. | Firm pages |
| Projects with images + PDF drawings | DWG/DXF/IFC viewers |
| Multi-credit with confirm/dispute | Collections, journal |
| Access levels: Public, On request, Private | Payments, premium plans |
| Explore with filters (type, city, area, year, role) | Hindi/Marathi UI |
| Enquiry via OTP, relayed to the professional | Public API |
| Manual verification by admin | Automated verification |
| Civimetric estimate link with prefill | Analytics dashboards |

Not in scope, ever: structural design or sign-off, BOQ tools, floor plan generation. Those belong to other products.

## Stack (kept deliberately small)

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router), TypeScript, Tailwind |
| DB, auth, storage | Supabase (Postgres, OTP auth, private storage buckets) |
| Search | Postgres full-text + filters. Move to Typesense only when slow |
| Files | PDFs and images only. Strip EXIF, signed URLs |
| Hosting | Vercel + Supabase, region ap-south-1 / Mumbai where possible |

Queues, virus scanning, a separate API server and Terraform are added when there is real load, not before.

## Data model

```
User ──1:1── Profile ──M:N── Credit ──N:1── Project ──1:N── Asset
                                              │
                                              └──1:N── Enquiry
Asset ──1:N── DownloadRequest
Profile ──1:N── Verification
```

| Entity | Key fields |
| --- | --- |
| Profile | handle, discipline, city, bio, reg_body, reg_no, verified_at |
| Project | slug, title, type, city, year, area_value, area_unit, area_sqft (normalised), cost_band_inr, status |
| Credit | project_id, profile_id, role, scope_note, confirmed_at, disputed |
| Asset | project_id, kind, drawing_type, sheet_no, scale, revision, access_level, file_key |
| DownloadRequest | asset_id, requester_contact, status, decided_at |
| Enquiry | project_id, to_profile_id, from_contact, message |

Notes:
- Area is stored as entered (`area_value` + `area_unit`) and also as a normalised `area_sqft` so filters work across units.
- Project status: `DRAFT` → `REVIEW` → `PUBLIC` / `HIDDEN`. A profile's first project needs admin approval.

## Access levels

| Level | Visitor sees |
| --- | --- |
| `PUBLIC` | Full preview |
| `ON_REQUEST` | Preview only. Owner approves, then a signed link valid for 24 h |
| `PRIVATE` | Owner and credited team only |

Structural and MEP drawings always show: **Project reference only, not for construction.**

## Civimetric link

Button on project pages (Residential, Commercial, Industrial): **"Estimate this project on Civimetric"**.

Opens in a new tab with prefilled parameters. No personal data is sent.

```
https://www.civimetric.in/app
  ?type=residential
  &area=1100
  &unit=sqft
  &city=Pune
  &utm_source=builtfolio&utm_medium=referral&utm_campaign=project_page
```

Shown beside the button: "Powered by Civimetric. Indicative, not a quotation."
Event logged: `civimetric_estimate_click` (project_id, type, city).

## Routes

| Page | Route |
| --- | --- |
| Home | `/` |
| Explore | `/projects` |
| Project | `/projects/[slug]` |
| Flagship showcase | `/projects/courtyard-house-pune` |
| People | `/people` |
| Profile | `/p/[handle]` |
| Dashboard | `/dashboard` |
| Admin | `/admin` |
| Legal | `/about /privacy /terms /takedown` |

## Trust and safety

- Registration numbers (e.g. Council of Architecture) checked manually by admin.
- Ownership declaration and client-consent confirmation before a project goes public.
- Hide plot/survey number and exact address by default (city-level location).
- Takedown form on every project and asset.
- DPDP Act 2023: consent at signup and upload, deletion on request, grievance contact on `/privacy`.
- Contact details never shown publicly. Enquiries are relayed.

## Cold start plan

A portfolio platform with no portfolios is dead. Before building features:

1. Pick one niche: residential architects and structural engineers in Pune.
2. Interview 10 professionals. Ask what they use today and what would make them upload.
3. Build 20-30 project pages **for them** (white-glove) from their existing files.
4. Every confirmed credit invites the credited person to claim their profile. That is the growth loop.

## Roadmap

| Phase | Goal |
| --- | --- |
| 0. Prove it | Flagship showcase page live, 10 interviews, 5+ professionals agree to be featured |
| 1. MVP | Auth, profiles, projects, credits, uploads, access levels, Explore, enquiry, admin, Civimetric prefill |
| 2. Growth | Firm pages, verification badges, DXF preview, collections, Hindi/Marathi |
| 3. Monetise | Premium profiles, featured placement, lead credits, 3D/IFC viewer |

## Local setup

### Prototype (no backend)

```bash
npx serve . --listen 3000
```

Open `http://localhost:3000`. Start with `Courtyard-House.dc.html` (flagship) and `Explore.dc.html`.

### App (once `apps/web` exists)

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `NEXT_PUBLIC_CIVIMETRIC_URL` | `https://www.civimetric.in/app` |
| `SMS_PROVIDER_KEY`, `SMS_SENDER_ID`, `SMS_DLT_TEMPLATE_ID` | OTP SMS (India DLT) |
| `SENTRY_DSN` | Error tracking |

## Conventions

- TypeScript strict, ESLint, Prettier, Conventional Commits.
- Amounts as `₹1,25,000.00` (en-IN). Areas and volumes 2 decimals. Never mix units on one screen.
- Tests required for: Civimetric URL builder, access-level guards, ₹ and area formatters.

## Open decisions

| # | Decision |
| --- | --- |
| 1 | Final name and domain |
| 2 | Launch city (Pune assumed) |
| 3 | Who pays: professionals (premium) or clients (leads)? |
| 4 | SMS/email providers and DLT registration |
| 5 | Verification SLA and who reviews |

## Disclaimers

- Project pages are showcases. Structural and MEP drawings are reference only, not for construction.
- Civimetric estimates are indicative, not quotations.
- Uploaders are responsible for ownership and client consent.
