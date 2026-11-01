/**
 * cursor.js — Virtual Touch Cursor System
 *
 * Provides an optional software pointer for touch users who prefer
 * a PC-like experience. Disabled by default.
 *
 * Rules:
 * - Never shown when a real mouse is in use (detected via 'mouse' pointerType).
 * - Never interferes with native scrolling, pinch-zoom, or form inputs.
 * - Cursor stays within viewport bounds.
 * - Settings persisted in localStorage (non-sensitive client prefs only).
 */

const VirtualCursor = (() => {
  // ─── Default Settings ─────────────────────────────────────
  const DEFAULTS = {
    enabled: false,
    size: 'medium',          // 'small' | 'medium' | 'large'
    appearance: 'standard',  // 'standard' | 'highcontrast' | 'accent'
    sensitivity: 1.4,        // movement multiplier
    speed: 1.0,
    clickAssist: false,
    doubleTapToOpen: true,
    longPressContextMenu: true,
  };

  const SIZE_MAP = { small: 20, medium: 28, large: 40 };

  const APPEARANCE_MAP = {
    standard:     { fill: '#ffffff', border: '#000000', opacity: 0.92 },
    highcontrast: { fill: '#ffff00', border: '#000000', opacity: 1.0  },
    accent:       { fill: 'var(--accent)', border: '#000', opacity: 0.92 },
  };

  let settings = Object.assign({}, DEFAULTS);
  let cursorEl = null;
  let padEl = null;
  let curX = window.innerWidth / 2;
  let curY = window.innerHeight / 2;
  let isActive = false;

  // Touchpad drag state
  let padTouching = false;
  let padLastX = 0, padLastY = 0;

  // ─── Persistence ─────────────────────────────────────────
  function loadSettings() {
    try {
      const raw = localStorage.getItem('win11_cursor_settings');
      if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) {}
  }

  function saveSettings() {
    try { localStorage.setItem('win11_cursor_settings', JSON.stringify(settings)); } catch (e) {}
  }

  // ─── Cursor Element ───────────────────────────────────────
  function buildCursorEl() {
    if (cursorEl) return;
    cursorEl = document.createElement('div');
    cursorEl.id = 'virtual-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    cursorEl.style.cssText = `
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      transition: transform 0.04s linear;
      will-change: transform;
      border-radius: 50% 50% 50% 0;
      transform-origin: top left;
      rotate: -45deg;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: none;
    `;
    document.body.appendChild(cursorEl);
    updateCursorStyle();
  }

  function updateCursorStyle() {
    if (!cursorEl) return;
    const sz = SIZE_MAP[settings.size] || 28;
    const ap = APPEARANCE_MAP[settings.appearance] || APPEARANCE_MAP.standard;
    cursorEl.style.width  = `${sz}px`;
    cursorEl.style.height = `${sz}px`;
    cursorEl.style.background = ap.fill;
    cursorEl.style.border = `2px solid ${ap.border}`;
    cursorEl.style.opacity = ap.opacity;
  }

  function moveCursorTo(x, y) {
    curX = Math.max(0, Math.min(window.innerWidth,  x));
    curY = Math.max(0, Math.min(window.innerHeight - 56, y)); // keep above taskbar
    if (cursorEl) {
      cursorEl.style.left = `${curX}px`;
      cursorEl.style.top  = `${curY}px`;
    }
  }

  // ─── Touchpad control pad ─────────────────────────────────
  function buildPadEl() {
    if (padEl) return;
    padEl = document.createElement('div');
    padEl.id = 'virtual-cursor-pad';
    padEl.setAttribute('aria-label', 'Virtual cursor touchpad');
    padEl.style.cssText = `
      position: fixed;
      bottom: calc(var(--taskbar-h, 48px) + 10px);
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 120px;
      background: rgba(30,38,58,0.82);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      z-index: 9999;
      touch-action: none;
      display: none;
      cursor: none;
    `;
    padEl.innerHTML = `
      <div style="text-align:center;font-size:10px;color:rgba(255,255,255,0.4);padding:6px 0 2px;pointer-events:none;">
        TOUCHPAD — drag to move cursor
      </div>
      <div style="display:flex;gap:8px;padding:8px 12px;pointer-events:none;">
        <button id="vpad-click" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:12px;cursor:pointer;touch-action:manipulation;">Click</button>
        <button id="vpad-dbl" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:12px;cursor:pointer;touch-action:manipulation;">DblClick</button>
        <button id="vpad-ctx" style="flex:1;padding:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;font-size:12px;cursor:pointer;touch-action:manipulation;">Menu</button>
      </div>
    `;
    document.body.appendChild(padEl);
    setupPadEvents();
  }

  function setupPadEvents() {
    if (!padEl) return;

    // Drag area (upper portion of pad)
    padEl.addEventListener('pointerdown', e => {
      if (e.target.tagName === 'BUTTON') return;
      padTouching = true;
      padLastX = e.clientX;
      padLastY = e.clientY;
      padEl.setPointerCapture(e.pointerId);
    });

    padEl.addEventListener('pointermove', e => {
      if (!padTouching) return;
      const dx = (e.clientX - padLastX) * settings.sensitivity * settings.speed;
      const dy = (e.clientY - padLastY) * settings.sensitivity * settings.speed;
      padLastX = e.clientX;
      padLastY = e.clientY;
      moveCursorTo(curX + dx, curY + dy);
    });

    padEl.addEventListener('pointerup', () => { padTouching = false; });
    padEl.addEventListener('pointercancel', () => { padTouching = false; });

    // Click button
    padEl.querySelector('#vpad-click')?.addEventListener('click', e => {
      e.stopPropagation();
      fireVirtualClick(curX, curY);
    });

    // Double-click button
    padEl.querySelector('#vpad-dbl')?.addEventListener('click', e => {
      e.stopPropagation();
      fireVirtualClick(curX, curY);
      setTimeout(() => fireVirtualClick(curX, curY), 80);
    });

    // Context menu button
    padEl.querySelector('#vpad-ctx')?.addEventListener('click', e => {
      e.stopPropagation();
      const target = getElementAt(curX, curY);
      if (target) {
        const ctxEvt = new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true,
          clientX: curX, clientY: curY,
          view: window,
        });
        target.dispatchEvent(ctxEvt);
      }
    });
  }

  function getElementAt(x, y) {
    if (!cursorEl) return document.elementFromPoint(x, y);
    cursorEl.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    cursorEl.style.display = '';
    return el;
  }

  function fireVirtualClick(x, y) {
    const target = getElementAt(x, y);
    if (!target) return;
    ['pointerdown', 'pointerup', 'click'].forEach(type => {
      target.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true,
        clientX: x, clientY: y, view: window,
      }));
    });
  }

  // ─── Real Mouse Detection ─────────────────────────────────
  // When a real mouse moves, hide the virtual cursor + pad
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && isActive) {
      hideCursor();
    }
  }, { passive: true });

  // ─── Public API ───────────────────────────────────────────
  function enable() {
    settings.enabled = true;
    isActive = true;
    buildCursorEl();
    buildPadEl();
    updateCursorStyle();
    moveCursorTo(curX, curY);
    if (cursorEl) cursorEl.style.display = 'block';
    if (padEl) padEl.style.display = 'block';
    saveSettings();
    // Set CSS cursor to none on desktop area while virtual cursor is active
    document.getElementById('desktop-screen')?.style.setProperty('cursor', 'none');
  }

  function disable() {
    settings.enabled = false;
    isActive = false;
    hideCursor();
    saveSettings();
    document.getElementById('desktop-screen')?.style.removeProperty('cursor');
  }

  function hideCursor() {
    if (cursorEl) cursorEl.style.display = 'none';
    if (padEl) padEl.style.display = 'none';
  }

  function toggle() {
    if (settings.enabled) disable(); else enable();
    return settings.enabled;
  }

  function applySettings(newSettings) {
    Object.assign(settings, newSettings);
    updateCursorStyle();
    if (settings.enabled && !isActive) enable();
    if (!settings.enabled && isActive) disable();
    saveSettings();
  }

  function getSettings() { return Object.assign({}, settings); }
  function isEnabled() { return settings.enabled; }

  // Init
  loadSettings();
  if (settings.enabled) {
    // Defer until after DOM ready
    document.addEventListener('DOMContentLoaded', () => enable(), { once: true });
  }

  return { enable, disable, toggle, applySettings, getSettings, isEnabled, updateCursorStyle };
})();

// ─── Cursor Settings App ──────────────────────────────────────────────────────
function openCursorSettings() {
  const s = VirtualCursor.getSettings();

  const content = `
    <div style="display:flex;height:100%;background:var(--window-bg);">
      <!-- Sidebar -->
      <div style="width:180px;background:var(--acrylic-subtle);border-right:1px solid var(--acrylic-border);padding:12px 8px;flex-shrink:0;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);padding:4px 10px 8px;">Cursor</div>
        <div class="sidebar-item active" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;background:var(--accent-subtle);color:var(--accent);">
          <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-7 1-3 7-4-17z"/></svg>
          Virtual Cursor
        </div>
      </div>

      <!-- Main settings area -->
      <div style="flex:1;overflow-y:auto;padding:24px 28px;">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:4px;">Virtual Cursor Settings</h2>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:24px;">
          Enable a software pointer for touch devices. Not available when a physical mouse is connected.
        </p>

        <!-- Enable toggle -->
        <div class="settings-card" style="margin-bottom:18px;">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Enable Virtual Cursor</div>
              <div class="settings-row-desc">Show a software pointer and touchpad control.</div>
            </div>
            <label class="win-toggle" title="Toggle virtual cursor">
              <input type="checkbox" id="cur-enabled" ${s.enabled ? 'checked' : ''} />
              <div class="win-toggle-track"></div>
            </label>
          </div>
        </div>

        <!-- Size -->
        <div class="settings-card" style="margin-bottom:18px;">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Cursor Size</div>
              <div class="settings-row-desc">Small (20px) · Medium (28px) · Large (40px)</div>
            </div>
            <select id="cur-size" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text-main);font-family:var(--font-ui);font-size:13px;outline:none;">
              <option value="small"  ${s.size==='small'  ?'selected':''}>Small</option>
              <option value="medium" ${s.size==='medium' ?'selected':''}>Medium</option>
              <option value="large"  ${s.size==='large'  ?'selected':''}>Large</option>
            </select>
          </div>

          <div class="settings-row">
            <div>
              <div class="settings-row-label">Cursor Appearance</div>
              <div class="settings-row-desc">Standard · High Contrast · Accent Color</div>
            </div>
            <select id="cur-appearance" style="padding:6px 10px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:6px;color:var(--text-main);font-family:var(--font-ui);font-size:13px;outline:none;">
              <option value="standard"     ${s.appearance==='standard'     ?'selected':''}>Standard</option>
              <option value="highcontrast" ${s.appearance==='highcontrast' ?'selected':''}>High Contrast</option>
              <option value="accent"       ${s.appearance==='accent'       ?'selected':''}>Accent Color</option>
            </select>
          </div>
        </div>

        <!-- Movement -->
        <div class="settings-card" style="margin-bottom:18px;">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Pointer Sensitivity</div>
              <div class="settings-row-desc">How far the cursor moves per drag unit.</div>
            </div>
            <input type="range" id="cur-sensitivity" min="0.5" max="3.0" step="0.1"
              value="${s.sensitivity}"
              style="width:120px;accent-color:var(--accent-dark);" />
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Pointer Speed</div>
              <div class="settings-row-desc">Overall movement speed multiplier.</div>
            </div>
            <input type="range" id="cur-speed" min="0.5" max="2.0" step="0.1"
              value="${s.speed}"
              style="width:120px;accent-color:var(--accent-dark);" />
          </div>
        </div>

        <!-- Interaction -->
        <div class="settings-card" style="margin-bottom:18px;">
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Click Assist</div>
              <div class="settings-row-desc">Auto-click when pointer hovers an element for 1.5s.</div>
            </div>
            <label class="win-toggle">
              <input type="checkbox" id="cur-clickassist" ${s.clickAssist ? 'checked' : ''} />
              <div class="win-toggle-track"></div>
            </label>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Double-Tap to Open</div>
              <div class="settings-row-desc">Two taps on virtual Click button opens items.</div>
            </div>
            <label class="win-toggle">
              <input type="checkbox" id="cur-doubletap" ${s.doubleTapToOpen ? 'checked' : ''} />
              <div class="win-toggle-track"></div>
            </label>
          </div>
        </div>

        <!-- Limitations notice -->
        <div style="padding:12px 16px;background:rgba(255,185,0,0.08);border:1px solid rgba(255,185,0,0.2);border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:20px;line-height:1.5;">
          <strong style="color:var(--warning);">Browser limitation:</strong>
          A web app cannot reliably detect every connected hardware mouse on all mobile browsers.
          The virtual cursor hides when a <em>mouse pointermove</em> event is detected.
          On some devices with both touch and mouse support, you may need to toggle manually.
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="cur-apply-btn" class="btn-primary" style="width:auto;padding:9px 20px;">Apply Settings</button>
          <button id="cur-reset-btn" style="padding:9px 20px;background:transparent;border:1px solid var(--acrylic-border);border-radius:8px;color:var(--text-secondary);cursor:pointer;font-family:var(--font-ui);font-size:13px;">Reset to Defaults</button>
        </div>
      </div>
    </div>
  `;

  const iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M5 3l14 9-7 1-3 7-4-17z"/></svg>`;

  WindowManager.createWindow(
    'cursor-settings',
    'Cursor Settings',
    iconHtml,
    content,
    {
      width: 680, height: 520,
      onInit: (win) => {
        win.querySelector('#cur-apply-btn')?.addEventListener('click', () => {
          const newSettings = {
            enabled:           win.querySelector('#cur-enabled')?.checked,
            size:              win.querySelector('#cur-size')?.value,
            appearance:        win.querySelector('#cur-appearance')?.value,
            sensitivity:       parseFloat(win.querySelector('#cur-sensitivity')?.value || 1.4),
            speed:             parseFloat(win.querySelector('#cur-speed')?.value || 1.0),
            clickAssist:       win.querySelector('#cur-clickassist')?.checked,
            doubleTapToOpen:   win.querySelector('#cur-doubletap')?.checked,
          };
          VirtualCursor.applySettings(newSettings);
          showToast('Cursor Settings', 'Preferences saved and applied.', 'success');
        });

        win.querySelector('#cur-reset-btn')?.addEventListener('click', () => {
          VirtualCursor.applySettings({
            enabled: false, size: 'medium', appearance: 'standard',
            sensitivity: 1.4, speed: 1.0, clickAssist: false, doubleTapToOpen: true,
          });
          WindowManager.closeWindow('cursor-settings');
          showToast('Cursor Settings', 'Reset to defaults.', 'info');
        });
      }
    }
  );
}

// ─── Quick Settings tile toggle ───────────────────────────────────────────────
// Called by the QS tile in index.html
function toggleVirtualCursor() {
  const enabled = VirtualCursor.toggle();
  const tile = document.getElementById('qs-cursor');
  if (tile) tile.classList.toggle('active', enabled);
  showToast('Virtual Cursor', enabled ? 'Cursor enabled.' : 'Cursor disabled.', 'info');
}
