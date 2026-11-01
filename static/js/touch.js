/**
 * touch.js — Targeted patch for:
 *   1. Mobile touch-to-open (tap-select + second-tap-opens, no duplicate clicks)
 *   2. Long-press context menu on desktop icons and file cards
 *   3. Browser Back button / Android hardware back handling
 *   4. Pointer-event deduplication (touch + mouse on hybrid devices)
 *
 * PC mouse behavior is NOT changed. All changes are conditional on
 * pointer type ("touch") or explicit touch event paths.
 */

// ─── Device detection — prefer pointer API, not just screen width ────────────
const InputCapability = {
  hasTouch: navigator.maxTouchPoints > 0 || ('ontouchstart' in window),
  lastPointerType: 'mouse', // updated live by pointerdown events
};

document.addEventListener('pointerdown', e => {
  InputCapability.lastPointerType = e.pointerType || 'mouse';
}, { passive: true, capture: true });

// ─── History / Browser-Back management ───────────────────────────────────────
/**
 * NavHistory — wraps window.history so the app owns one entry per "screen".
 * Strategy:
 *   - On desktop init (after login), push a sentinel entry.
 *   - When a flyout, window, or overlay opens, push another entry.
 *   - popstate: close the topmost overlay/window first. Only if nothing is
 *     open, show the exit confirmation.
 *   - Never pushes duplicate entries. Never creates an infinite loop.
 */
const NavHistory = {
  _depth: 0,
  _exitConfirmOpen: false,

  // Call once after login to "anchor" the app in history.
  anchor() {
    this._depth = 0;
    history.replaceState({ winDesk: true, depth: 0 }, '');
  },

  // Call whenever a modal/window opens.
  push() {
    this._depth++;
    history.pushState({ winDesk: true, depth: this._depth }, '');
  },

  // Call whenever a modal/window closes.
  pop() {
    if (this._depth > 0) {
      this._depth--;
      // history.back() is NOT called here — the browser already fired popstate.
    }
  },

  // Handle Android / browser Back.
  handlePopState(e) {
    if (!e.state || !e.state.winDesk) return; // not our entry — let browser navigate

    const state = e.state;

    // 1. Close context menu if open
    const ctxMenu = document.getElementById('win-context-menu');
    if (ctxMenu && ctxMenu.style.display === 'block') {
      hideContextMenu();
      NavHistory._repush();
      return;
    }

    // 2. Close any open flyout (start menu, quick settings, notifications)
    const flyouts = ['start-menu', 'quick-settings', 'notification-center'];
    const openFlyoutEl = flyouts.map(id => document.getElementById(id)).find(el => el?.classList.contains('open'));
    if (openFlyoutEl) {
      openFlyoutEl.classList.remove('open');
      NavHistory._repush();
      return;
    }

    // 3. Close topmost window
    const winIds = Object.keys(AppState.windows);
    if (winIds.length > 0) {
      const topId = winIds[winIds.length - 1];
      WindowManager.closeWindow(topId);
      NavHistory._repush();
      return;
    }

    // 4. Nothing open → show exit confirmation (only once)
    if (NavHistory._exitConfirmOpen) return;
    NavHistory._exitConfirmOpen = true;
    NavHistory._repush(); // stay in history so user can cancel

    showExitConfirmation(() => {
      // Confirmed exit: let browser handle naturally — go back one more step
      NavHistory._exitConfirmOpen = false;
      history.back();
    }, () => {
      // Cancelled — do nothing, we already re-pushed
      NavHistory._exitConfirmOpen = false;
    });
  },

  // After handling a Back, push a new state so the next Back can be caught.
  _repush() {
    history.pushState({ winDesk: true, depth: ++this._depth }, '');
  },
};

window.addEventListener('popstate', e => NavHistory.handlePopState(e));

// Exit confirmation dialog (Windows 11 style)
function showExitConfirmation(onConfirm, onCancel) {
  // Reuse existing win-dialog if possible
  const overlay = document.createElement('div');
  overlay.className = 'win-dialog-overlay';
  overlay.id = 'exit-confirm-overlay';
  overlay.innerHTML = `
    <div class="win-dialog" role="alertdialog" aria-modal="true" aria-labelledby="exit-dlg-title">
      <div class="win-dialog-title" id="exit-dlg-title">Leave Virtual Desktop?</div>
      <div class="win-dialog-body">
        Are you sure you want to exit? Any unsaved changes in Notepad may be lost.
      </div>
      <div class="win-dialog-actions">
        <button class="win-dialog-btn" id="exit-cancel-btn">Stay</button>
        <button class="win-dialog-btn danger" id="exit-confirm-btn">Exit</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#exit-cancel-btn').addEventListener('click', () => {
    overlay.remove();
    if (typeof onCancel === 'function') onCancel();
  });
  overlay.querySelector('#exit-confirm-btn').addEventListener('click', () => {
    overlay.remove();
    if (typeof onConfirm === 'function') onConfirm();
  });
}

// ─── Desktop Icon Touch Interaction ─────────────────────────────────────────
/**
 * Problem: ondblclick on HTML elements doesn't fire on mobile touch.
 * Fix: track "last tapped" icon. First tap = select. Second tap on same = open.
 * PC double-click unchanged. No duplicate events via pointer dedup guard.
 */
const TapTracker = {
  lastTapped: null,
  lastTappedTime: 0,
  DOUBLE_TAP_MS: 400,

  // Returns true if this is the second tap on the same element within threshold.
  isDoubleTap(el) {
    const now = Date.now();
    const isSame = this.lastTapped === el;
    const inTime = (now - this.lastTappedTime) < this.DOUBLE_TAP_MS;
    this.lastTapped = el;
    this.lastTappedTime = now;
    return isSame && inTime;
  },

  reset() {
    this.lastTapped = null;
    this.lastTappedTime = 0;
  },
};

// Long press tracker for desktop icons and file cards
const LongPress = {
  _timer: null,
  _moved: false,
  _startX: 0,
  _startY: 0,
  THRESHOLD_MS: 600,
  MOVE_PX: 8,

  start(e, onLongPress) {
    if (e.pointerType === 'mouse') return; // mouse uses contextmenu event
    this._moved = false;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._timer = setTimeout(() => {
      if (!this._moved) onLongPress(e);
    }, this.THRESHOLD_MS);
  },

  move(e) {
    const dx = Math.abs(e.clientX - this._startX);
    const dy = Math.abs(e.clientY - this._startY);
    if (dx > this.MOVE_PX || dy > this.MOVE_PX) {
      this._moved = true;
      clearTimeout(this._timer);
    }
  },

  cancel() {
    clearTimeout(this._timer);
    this._moved = false;
  },
};

// Attach touch-aware interaction to a desktop icon element.
// opener: function to call when the icon is activated (opened).
// contextFn: function(x, y) to show context menu at position.
function attachDesktopIconTouchInteraction(iconEl, opener, contextFn) {
  // Guard: prevent touch + click double-firing on the same gesture
  let _lastTouchActivation = 0;

  // Pointer-based long press
  iconEl.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    LongPress.start(e, (ev) => {
      // Long press → context menu, prevent open
      _lastTouchActivation = Date.now();
      if (typeof contextFn === 'function') contextFn(ev.clientX, ev.clientY);
      TapTracker.reset();
    });
  }, { passive: true });

  iconEl.addEventListener('pointermove', e => {
    if (e.pointerType !== 'touch') return;
    LongPress.move(e);
  }, { passive: true });

  iconEl.addEventListener('pointerup', e => {
    if (e.pointerType !== 'touch') return;
    LongPress.cancel();
  }, { passive: true });

  iconEl.addEventListener('pointercancel', () => LongPress.cancel(), { passive: true });

  // Touch click (tap) handler — deduped against mouse
  iconEl.addEventListener('click', e => {
    // If this click fired within 400ms of a touch activation (long-press or
    // programmatic), ignore it to prevent double-open.
    if (Date.now() - _lastTouchActivation < 400) {
      e.stopPropagation();
      return;
    }

    // If this was triggered by touch (pointer type = touch), use tap logic
    if (InputCapability.lastPointerType === 'touch') {
      e.stopPropagation();

      // Check if icon is already selected
      if (iconEl.classList.contains('selected')) {
        // Second tap on same selected icon → open it
        iconEl.classList.remove('selected');
        _lastTouchActivation = Date.now();
        opener();
      } else {
        // First tap → select
        document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
        iconEl.classList.add('selected');
      }
      return;
    }

    // Mouse: single click = select (handled by existing selectDesktopIcon)
    // dblclick handles open. Nothing to do here.
  });
}

// Patch existing desktop icons after DOM ready
function patchDesktopIconsForTouch() {
  document.querySelectorAll('.desktop-icon').forEach(iconEl => {
    // Extract the opener from the existing ondblclick attribute
    const dblAttr = iconEl.getAttribute('ondblclick');
    if (!dblAttr) return;

    const opener = () => {
      try { eval(dblAttr); } catch(err) { console.warn('opener error:', err); }
    };

    // Context menu function for this icon
    const contextFn = (x, y) => {
      showDesktopIconContextMenu(iconEl, x, y);
    };

    // Remove inline onclick that calls selectDesktopIcon (we handle it now)
    iconEl.removeAttribute('onclick');

    // Re-add PC click = select behavior (non-touch)
    iconEl.addEventListener('click', e => {
      if (InputCapability.lastPointerType === 'touch') return; // touch handled above
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
      iconEl.classList.add('selected');
    });

    attachDesktopIconTouchInteraction(iconEl, opener, contextFn);
  });
}

function showDesktopIconContextMenu(iconEl, x, y) {
  const label = iconEl.querySelector('.desktop-icon-label')?.textContent || 'Item';
  const dblAttr = iconEl.getAttribute('ondblclick') || '';

  const menu = document.getElementById('win-context-menu');
  if (!menu) return;

  menu.innerHTML = `
    <div class="context-item" id="ctx-open-icon">
      <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.folder : ''}</span>
      <span>Open ${label}</span>
    </div>
    <div class="context-separator"></div>
    <div class="context-item" onclick="openPersonalization();hideContextMenu();">
      <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span>
      <span>Personalize</span>
    </div>
    <div class="context-item" onclick="openAdminSettings();hideContextMenu();">
      <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span>
      <span>Settings</span>
    </div>
  `;

  menu.querySelector('#ctx-open-icon')?.addEventListener('click', () => {
    hideContextMenu();
    try { eval(dblAttr); } catch(e) {}
  });

  menu.style.display = 'block';
  const mw = 220, mh = 160;
  const safeX = Math.min(window.innerWidth - mw, Math.max(0, x));
  const safeY = Math.min(window.innerHeight - mh, Math.max(0, y));
  menu.style.left = `${safeX}px`;
  menu.style.top  = `${safeY}px`;
}

// ─── Prevent click-through after window close / dialog close ─────────────────
/**
 * When a window or dialog closes, a residual touch-to-click event can fire
 * on whatever element is now under the pointer. We suppress that for 300ms.
 */
let _suppressNextClick = false;

function suppressNextClickThrough() {
  _suppressNextClick = true;
  setTimeout(() => { _suppressNextClick = false; }, 350);
}

// Intercept clicks that immediately follow a touch close event
document.addEventListener('click', e => {
  if (_suppressNextClick && InputCapability.lastPointerType === 'touch') {
    // Only suppress on desktop area, not interactive controls
    if (!e.target.closest('#taskbar') && !e.target.closest('.win11-window') && !e.target.closest('.win-context-menu')) {
      e.stopPropagation();
      _suppressNextClick = false;
    }
  }
}, true); // capture phase

// ─── Delegate Long-Press for File Explorer Items ──────────────────────────────
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  const fileItem = e.target.closest('.file-card, tr[data-path]');
  if (!fileItem) return;
  const path = fileItem.getAttribute('data-path');
  if (!path) return;

  LongPress.start(e, ev => {
    _lastTouchActivation = Date.now();
    if (typeof handleContextMenu === 'function') {
      handleContextMenu(ev, path);
    }
  });
}, { passive: true });

document.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') LongPress.move(e);
}, { passive: true });

document.addEventListener('pointerup', e => {
  if (e.pointerType === 'touch') LongPress.cancel();
}, { passive: true });

document.addEventListener('pointercancel', () => LongPress.cancel(), { passive: true });

// Patch WindowManager.closeWindow to suppress click-through on touch
function patchWindowManagerForTouch() {
  if (typeof WindowManager === 'undefined' || WindowManager._touchPatched) return;
  WindowManager._touchPatched = true;

  const origClose = WindowManager.closeWindow.bind(WindowManager);
  WindowManager.closeWindow = function(id) {
    if (InputCapability.lastPointerType === 'touch') {
      suppressNextClickThrough();
    }
    origClose(id);
    NavHistory.pop();
  };

  const origCreate = WindowManager.createWindow.bind(WindowManager);
  WindowManager.createWindow = function(id, title, iconHtml, contentHtml, options) {
    const result = origCreate(id, title, iconHtml, contentHtml, options);
    if (result && !AppState._historyAnchored) return result;
    NavHistory.push();
    return result;
  };
}
patchWindowManagerForTouch();

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  patchWindowManagerForTouch();
  // Patch desktop icons after they are rendered
  // Use MutationObserver to also catch icons added dynamically
  patchDesktopIconsForTouch();

  const observer = new MutationObserver(() => {
    patchDesktopIconsForTouch();
  });
  const iconArea = document.getElementById('desktop-icons-area');
  if (iconArea) {
    observer.observe(iconArea, { childList: true });
  }

  // Apply user preferences if available
  if (typeof UserPrefs !== 'undefined') UserPrefs.apply();
});

// Called by app.js after successful login to anchor history
function anchorAppHistory() {
  NavHistory.anchor();
  AppState._historyAnchored = true;
}
