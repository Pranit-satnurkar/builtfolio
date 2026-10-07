/**
 * BuiltFolio Runtime & DCLogic Support Engine
 * Supports reactive components (<x-dc>, DCLogic, <sc-if>, <sc-for>, {{interpolation}})
 * and platform interactive behaviors (Civimetric deep links, toasts, modals, filters).
 */

// Toast notification helper
const Toast = {
  container: null,
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'bf-toast-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: 'DM Sans', system-ui, sans-serif;
    `;
    document.body.appendChild(this.container);
  },
  show(msg, icon = 'check_circle', duration = 3600) {
    this.init();
    const item = document.createElement('div');
    item.style.cssText = `
      background: #15181E;
      color: #FFFFFF;
      padding: 12px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      max-width: 380px;
      line-height: 1.4;
    `;
    item.innerHTML = `
      <span style="font-family:'Material Symbols Outlined';font-size:20px;color:#C94F12">${icon}</span>
      <span>${msg}</span>
    `;
    this.container.appendChild(item);
    requestAnimationFrame(() => {
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      setTimeout(() => item.remove(), 250);
    }, duration);
  }
};

// Civimetric copy & launch helper (Section 5 of README)
window.BuiltFolio = {
  toast: (msg, icon, d) => Toast.show(msg, icon, d),
  civimetricEstimate(specs) {
    const { typeLabel = 'Residential Building', area = 1100, areaUnit = 'SQFT', city = 'Nagpur' } = specs;
    const unit = areaUnit.toUpperCase() === 'SQFT' ? 'sqft' : 'sqm';
    const text = `${typeLabel} ${Math.round(area)} ${unit}, ${city}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    Toast.show(`Copied: "<b>${text}</b>"<br><small style="color:#B8C2D0">Paste in Civimetric estimator tab</small>`, 'content_copy', 4500);

    const url = 'https://www.civimetric.in/app?utm_source=builtfolio&utm_medium=referral&utm_campaign=project_page';
    setTimeout(() => {
      window.open(url, '_blank', 'noopener');
    }, 450);
  },
  openEnquiryModal(projectName = 'Project') {
    let modal = document.getElementById('bf-enquiry-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bf-enquiry-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(14,21,32,0.65);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        padding: 20px; opacity: 0; transition: opacity 0.2s ease;
      `;
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;max-width:460px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;font-family:'DM Sans',system-ui,sans-serif">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
            <div>
              <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1F4E8C">Direct Enquiry</span>
              <h3 id="bf-modal-title" style="font-family:'Sora',system-ui,sans-serif;font-size:20px;margin:4px 0 0;color:#15181E">Enquire about Project</h3>
            </div>
            <button id="bf-modal-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:#626B78;padding:4px">✕</button>
          </div>
          <form id="bf-modal-form" style="display:flex;flex-direction:column;gap:14px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#626B78;display:block;margin-bottom:4px">Your Name</label>
              <input required id="bf-input-name" placeholder="Vikram Mehta" style="width:100%;box-sizing:border-box;border:1.5px solid #DDD9CF;border-radius:8px;padding:10px 12px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#626B78;display:block;margin-bottom:4px">Mobile / WhatsApp (for OTP verification)</label>
              <input required id="bf-input-phone" type="tel" placeholder="+91 98220 00000" style="width:100%;box-sizing:border-box;border:1.5px solid #DDD9CF;border-radius:8px;padding:10px 12px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#626B78;display:block;margin-bottom:4px">Message / Project Requirement</label>
              <textarea rows="3" placeholder="Hello, I saw your work on BuiltFolio. I am planning a residential project in Pune..." style="width:100%;box-sizing:border-box;border:1.5px solid #DDD9CF;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;resize:vertical"></textarea>
            </div>
            <div style="font-size:12px;color:#626B78;line-height:1.4">
              🛡️ Verified transmission. Direct notification sent to credited professionals via SMS/Email.
            </div>
            <button type="submit" style="background:#C94F12;color:#fff;border:none;border-radius:8px;padding:12px;font-weight:700;font-size:15px;cursor:pointer;margin-top:4px">
              Send Enquiry via OTP →
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#bf-modal-close').onclick = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 200);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.style.opacity = '0';
          setTimeout(() => modal.style.display = 'none', 200);
        }
      };
      modal.querySelector('#bf-modal-form').onsubmit = (e) => {
        e.preventDefault();
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 200);
        Toast.show('Enquiry sent! The team will reach out within 48h.', 'mark_email_read', 4000);
      };
    }

    modal.querySelector('#bf-modal-title').textContent = `Enquire about ${projectName}`;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.style.opacity = '1');
  },
  openDownloadModal(sheetName = 'Architectural Drawing') {
    let modal = document.getElementById('bf-dw-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bf-dw-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; background: rgba(14,21,32,0.65);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        z-index: 10000; display: flex; align-items: center; justify-content: center;
        padding: 20px; opacity: 0; transition: opacity 0.2s ease;
      `;
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative;font-family:'DM Sans',system-ui,sans-serif">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
            <div>
              <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1F4E8C">Access Control</span>
              <h3 id="bf-dw-title" style="font-family:'Sora',system-ui,sans-serif;font-size:20px;margin:4px 0 0;color:#15181E">Request Drawing Access</h3>
            </div>
            <button id="bf-dw-close" style="background:none;border:none;cursor:pointer;font-size:20px;color:#626B78;padding:4px">✕</button>
          </div>
          <p style="font-size:13px;color:#626B78;line-height:1.5;margin-top:0">
            Original CAD (DWG) and un-watermarked high-resolution construction sheets are protected by BuiltFolio access control.
          </p>
          <form id="bf-dw-form" style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#626B78;display:block;margin-bottom:4px">Your Name & Role</label>
              <input required placeholder="Ar. / Er. / Client" style="width:100%;box-sizing:border-box;border:1.5px solid #DDD9CF;border-radius:8px;padding:9px 12px;font-size:14px;outline:none">
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#626B78;display:block;margin-bottom:4px">Email or Mobile (for 24h Signed Link)</label>
              <input required type="text" placeholder="architect@firm.in" style="width:100%;box-sizing:border-box;border:1.5px solid #DDD9CF;border-radius:8px;padding:9px 12px;font-size:14px;outline:none">
            </div>
            <div style="background:#F6F4EF;border-radius:8px;padding:10px 12px;font-size:12px;color:#626B78">
              🔒 <b>24-Hour Signed Link:</b> Upon uploader approval, a time-limited download link will be dispatched to your contact.
            </div>
            <button type="submit" style="background:#1F4E8C;color:#fff;border:none;border-radius:8px;padding:11px;font-weight:700;font-size:14px;cursor:pointer">
              Submit Request for Approval →
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#bf-dw-close').onclick = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 200);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          modal.style.opacity = '0';
          setTimeout(() => modal.style.display = 'none', 200);
        }
      };
      modal.querySelector('#bf-dw-form').onsubmit = (e) => {
        e.preventDefault();
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 200);
        Toast.show('Download request submitted! Uploader notified.', 'lock_open', 4000);
      };
    }

    modal.querySelector('#bf-dw-title').textContent = `Request ${sheetName}`;
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.style.opacity = '1');
  }
};

/**
 * Base DCLogic component class
 */
class DCLogic {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this._el = null;
    this._template = null;
  }

  setState(newState) {
    Object.assign(this.state, newState);
    this._scheduleUpdate();
  }

  _scheduleUpdate() {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    requestAnimationFrame(() => {
      this._updateScheduled = false;
      this._render();
    });
  }

  renderVals() {
    return {};
  }

  _bind(el) {
    this._el = el;
    this._template = el.innerHTML;
    this._render();
  }

  _render() {
    if (!this._el) return;
    const vals = this.renderVals() || {};
    
    // Parse template with state
    let html = this._template;

    // Handle <sc-if value="{{cond}}">...</sc-if>
    html = html.replace(/<sc-if\s+value="\{\{([^}]+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/gi, (match, key, content) => {
      const val = vals[key.trim()];
      return val ? content : '';
    });

    // Handle <sc-for list="{{listKey}}" as="varName">...</sc-for>
    html = html.replace(/<sc-for\s+list="\{\{([^}]+)\}\}"\s+as="([^"]+)"[^>]*>([\s\S]*?)<\/sc-for>/gi, (match, listKey, asVar, body) => {
      const list = vals[listKey.trim()] || [];
      return list.map(item => {
        let itemHtml = body;
        // Replace {{asVar.prop}}
        itemHtml = itemHtml.replace(new RegExp(`\\{\\{${asVar}\\.([^}]+)\\}\\}`, 'g'), (m, prop) => {
          return item[prop] !== undefined ? item[prop] : '';
        });
        return itemHtml;
      }).join('');
    });

    // Replace {{val}} with rendered values (strings or numbers)
    html = html.replace(/\{\{([a-zA-Z0-9_$]+)\}\}/g, (match, key) => {
      const v = vals[key];
      if (typeof v === 'function') {
        return `__fn_${key}__`;
      }
      return v !== undefined && v !== null ? v : '';
    });

    this._el.innerHTML = html;

    // Wire up events
    this._wireEvents(this._el, vals);
  }

  _wireEvents(root, vals) {
    const eventAttrs = [
      ['onClick', 'click'],
      ['onMouseDown', 'mousedown'],
      ['onMouseMove', 'mousemove'],
      ['onMouseUp', 'mouseup'],
      ['onMouseLeave', 'mouseleave']
    ];

    eventAttrs.forEach(([attrName, eventType]) => {
      const els = root.querySelectorAll(`[${attrName}]`);
      els.forEach(el => {
        const valAttr = el.getAttribute(attrName);
        el.removeAttribute(attrName);
        if (valAttr) {
          const match = valAttr.match(/__fn_([a-zA-Z0-9_$]+)__|{{([a-zA-Z0-9_$]+)}}/);
          const key = match ? (match[1] || match[2]) : null;
          if (key && typeof vals[key] === 'function') {
            el.addEventListener(eventType, (e) => {
              vals[key](e);
            });
          }
        }
      });
    });

    // Also wire SVG or interactive elements that have pick handler in corners
    if (vals.corners && Array.isArray(vals.corners)) {
      const circles = root.querySelectorAll('circle');
      circles.forEach((c, idx) => {
        const corner = vals.corners[idx];
        if (corner && typeof corner.pick === 'function') {
          c.style.cursor = 'pointer';
          c.addEventListener('click', (e) => {
            e.stopPropagation();
            corner.pick(e);
          });
        }
      });
    }
  }
}

window.DCLogic = DCLogic;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Execute dc-script if present
  const dcScript = document.querySelector('script[data-dc-script]');
  const xdc = document.querySelector('x-dc');

  if (dcScript && xdc) {
    try {
      const scriptCode = dcScript.textContent;
      const fn = new Function('DCLogic', `${scriptCode}; return typeof Component !== 'undefined' ? Component : null;`);
      const CompClass = fn(DCLogic);
      if (CompClass) {
        const inst = new CompClass();
        inst._bind(xdc);
        window._currentDCComponent = inst;
      }
    } catch (err) {
      console.warn('DCLogic evaluation note:', err);
    }
  }

  // Delegated global click handler for Civimetric, modals, saving, and filter chips
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, .chip, .tile-save');
    if (!target) return;

    const txt = target.textContent.trim().toLowerCase();

    // 1. Civimetric Estimator
    if (txt.includes('civimetric') || target.dataset.action === 'civimetric') {
      e.preventDefault();
      const pName = document.querySelector('h1')?.textContent.trim() || 'Residential Building';
      const city = document.querySelector('.sec div')?.textContent.includes('Nagpur') ? 'Nagpur' : 'Pune';
      window.BuiltFolio.civimetricEstimate({
        typeLabel: pName.includes('G+2') ? 'G+2 Residential Building' : (pName.includes('Courtyard') ? 'Courtyard House' : 'Residential Building'),
        area: pName.includes('Courtyard') ? 2400 : 1100,
        areaUnit: 'SQFT',
        city: city
      });
      return;
    }

    // 2. Enquiry modal
    if (txt.includes('enquire about') || txt.includes('send enquiry') || target.dataset.action === 'enquiry') {
      e.preventDefault();
      const pName = document.querySelector('h1')?.textContent.trim() || 'this project';
      window.BuiltFolio.openEnquiryModal(pName);
      return;
    }

    // 3. Download / Access request modal
    if (txt.includes('request download') || txt.includes('request the file') || target.dataset.action === 'download') {
      e.preventDefault();
      window.BuiltFolio.openDownloadModal('Architectural CAD & High-Res Drawings');
      return;
    }

    // 4. Save bookmark
    if (txt === 'save' || txt === 'bookmark_border' || target.classList.contains('tile-save')) {
      e.preventDefault();
      target.style.color = '#C94F12';
      if (target.textContent.trim() === 'bookmark_border') target.textContent = 'bookmark';
      window.BuiltFolio.toast('Project bookmarked in your private collection!', 'bookmark_added', 2500);
      return;
    }

    // 5. Filter chips
    if (target.classList.contains('chip')) {
      target.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      target.classList.add('on');
      window.BuiltFolio.toast(`Filtering by: ${target.textContent.trim()}`, 'filter_list', 1800);
      return;
    }
  });
});
