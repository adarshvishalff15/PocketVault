/**
 * Windows 11 Desktop Environment & Window Manager.
 * Orchestrates window lifecycle, taskbar, start menu, theme,
 * Quick Settings, Notification Center, and authentication.
 */

const AppState = {
  user: null,
  csrfToken: "",
  theme: localStorage.getItem("win11_theme") || "dark",
  activeRoots: [],
  currentRootId: 0,
  windows: {},
  activeWindowId: null,
  highestZIndex: 100,
  isMobile: window.innerWidth <= 768,
  wallpaper: localStorage.getItem("win11_wallpaper") || "wallpaper",
};

// ─── Window Manager ────────────────────────────────────────
const WindowManager = {
  createWindow(id, title, iconHtml, contentHtml, options = {}) {
    if (AppState.windows[id]) {
      this.bringToFront(id);
      if (AppState.windows[id].minimized) this.restoreWindow(id);
      return AppState.windows[id];
    }

    const container = document.getElementById("windows-container");
    const win = document.createElement("div");
    win.id = `win-${id}`;
    win.className = "win11-window";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", title);

    const isMobile = window.innerWidth <= 768;
    const defaultWidth  = isMobile ? window.innerWidth  : (options.width  || 880);
    const defaultHeight = isMobile ? window.innerHeight - parseInt(getComputedStyle(document.documentElement).getPropertyValue("--taskbar-h"))
                                    : (options.height || 560);
    const cascade = Object.keys(AppState.windows).length;
    const defaultLeft   = isMobile ? 0 : Math.max(30, (window.innerWidth  - defaultWidth)  / 2 + cascade * 24);
    const defaultTop    = isMobile ? 0 : Math.max(20, (window.innerHeight - defaultHeight) / 2 + cascade * 24);

    win.style.cssText = `width:${defaultWidth}px;height:${defaultHeight}px;left:${defaultLeft}px;top:${defaultTop}px;z-index:${++AppState.highestZIndex};`;

    // Windows 11 title bar: 36px, controls flush-right
    win.innerHTML = `
      <div class="win-titlebar ${options.titlebarClass || ''}" id="titlebar-${id}">
        ${options.customTitlebarHtml || `
        <div class="win-title-left">
          <div class="win-title-icon">${iconHtml}</div>
          <span class="win-title-text">${title}</span>
        </div>
        `}
        <div class="win-controls">
          <button class="win-btn minimize" title="Minimize" aria-label="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button class="win-btn maximize" title="Maximize" aria-label="Maximize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>
          </button>
          <button class="win-btn close" title="Close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="win-body" id="body-${id}">${contentHtml}</div>
    `;

    container.appendChild(win);
    if (typeof renderIcons === "function") renderIcons(win);

    const winObj = { id, el: win, title, iconHtml, minimized: false, maximized: isMobile };
    if (isMobile) win.classList.add("maximized");

    AppState.windows[id] = winObj;
    this.bringToFront(id);
    this.setupEvents(winObj);
    this.setupResize(winObj);
    this.updateTaskbar();

    if (options.onInit) options.onInit(win);
    return winObj;
  },

  bringToFront(id) {
    const w = AppState.windows[id];
    if (!w) return;
    w.el.style.zIndex = ++AppState.highestZIndex;
    AppState.activeWindowId = id;
    this.updateTaskbar();
  },

  minimizeWindow(id) {
    const w = AppState.windows[id];
    if (!w) return;
    w.minimized = true;
    w.el.classList.add("minimized");
    this.updateTaskbar();
  },

  restoreWindow(id) {
    const w = AppState.windows[id];
    if (!w) return;
    w.minimized = false;
    w.el.classList.remove("minimized");
    this.bringToFront(id);
  },

  maximizeToggle(id) {
    const w = AppState.windows[id];
    if (!w) return;
    w.maximized = !w.maximized;
    w.el.classList.toggle("maximized", w.maximized);
  },

  closeWindow(id) {
    const w = AppState.windows[id];
    if (!w) return;
    w.el.remove();
    delete AppState.windows[id];
    if (AppState.activeWindowId === id) {
      const rem = Object.keys(AppState.windows);
      AppState.activeWindowId = rem.length ? rem[rem.length - 1] : null;
    }
    this.updateTaskbar();
  },

  setupEvents(winObj) {
    const titlebar = winObj.el.querySelector(".win-titlebar");
    const minBtn   = winObj.el.querySelector(".win-btn.minimize");
    const maxBtn   = winObj.el.querySelector(".win-btn.maximize");
    const closeBtn = winObj.el.querySelector(".win-btn.close");

    winObj.el.addEventListener("mousedown",  () => this.bringToFront(winObj.id));
    winObj.el.addEventListener("touchstart", () => this.bringToFront(winObj.id), { passive: true });

    minBtn.addEventListener("click",   e => { e.stopPropagation(); this.minimizeWindow(winObj.id); });
    maxBtn.addEventListener("click",   e => { e.stopPropagation(); this.maximizeToggle(winObj.id); });
    closeBtn.addEventListener("click", e => { e.stopPropagation(); this.closeWindow(winObj.id); });

    // Double-click titlebar to maximize/restore
    titlebar.addEventListener("dblclick", e => {
      if (!e.target.closest(".win-controls")) this.maximizeToggle(winObj.id);
    });

    // Dragging: touch, pen, and mouse pointer events
    let isDragging = false, pointerStartX, pointerStartY, winStartLeft, winStartTop;

    const onPointerMove = ev => {
      if (!isDragging) return;
      const dx = ev.clientX - pointerStartX;
      const dy = ev.clientY - pointerStartY;

      const winW = winObj.el.offsetWidth || 320;
      const taskbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--taskbar-h")) || 48;

      // Clamp so title bar stays reachable and window doesn't get lost
      const maxTop = Math.max(0, window.innerHeight - taskbarH - 36);
      const minLeft = -winW + 80;
      const maxLeft = window.innerWidth - 80;

      const newLeft = Math.max(minLeft, Math.min(maxLeft, winStartLeft + dx));
      const newTop  = Math.max(0, Math.min(maxTop, winStartTop + dy));

      winObj.el.style.left = `${newLeft}px`;
      winObj.el.style.top  = `${newTop}px`;
    };

    const onPointerEnd = ev => {
      if (!isDragging) return;
      isDragging = false;
      try {
        if (ev && typeof ev.pointerId !== "undefined") {
          titlebar.releasePointerCapture(ev.pointerId);
        }
      } catch (err) {}
      document.body.classList.remove("window-is-dragging");
      winObj.el.classList.remove("dragging");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };

    titlebar.addEventListener("pointerdown", e => {
      // Ignore clicks on minimize/maximize/close or form inputs
      if (e.target.closest(".win-controls") || e.target.closest("button, input, select, textarea, a")) return;

      this.bringToFront(winObj.id);

      // If maximized, dragging restores it smoothly under the pointer
      if (winObj.maximized) {
        if (window.innerWidth > 768) {
          this.maximizeToggle(winObj.id);
          const r = winObj.el.getBoundingClientRect();
          winObj.el.style.left = `${Math.max(0, Math.min(window.innerWidth - r.width, e.clientX - r.width / 2))}px`;
          winObj.el.style.top  = `${Math.max(0, e.clientY - 18)}px`;
        } else {
          winObj.maximized = false;
          winObj.el.classList.remove("maximized");
          winObj.el.style.width = `${Math.min(window.innerWidth - 20, 360)}px`;
          winObj.el.style.height = `${Math.min(window.innerHeight - 100, 480)}px`;
        }
      }

      isDragging = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      const rect = winObj.el.getBoundingClientRect();
      winStartLeft = rect.left;
      winStartTop = rect.top;

      try {
        titlebar.setPointerCapture(e.pointerId);
      } catch (err) {}

      document.body.classList.add("window-is-dragging");
      winObj.el.classList.add("dragging");

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerEnd);
      window.addEventListener("pointercancel", onPointerEnd);

      e.preventDefault();
    });
  },

  setupResize(winObj) {
    const handles = [
      { dir: "nw", className: "handle-nw" },
      { dir: "ne", className: "handle-ne" },
      { dir: "sw", className: "handle-sw" },
      { dir: "se", className: "handle-se", grip: true },
      { dir: "n",  className: "handle-n" },
      { dir: "s",  className: "handle-s" },
      { dir: "e",  className: "handle-e" },
      { dir: "w",  className: "handle-w" },
    ];

    handles.forEach(h => {
      const el = document.createElement("div");
      el.className = `win-resize-handle ${h.className}`;
      el.setAttribute("data-dir", h.dir);
      el.setAttribute("aria-hidden", "true");
      if (h.grip) {
        el.innerHTML = `
          <svg class="win-resize-grip-icon" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M8.5 2.5L2.5 8.5M8.5 5.5L5.5 8.5M8.5 8.5L8.5 8.51" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        `;
      }
      winObj.el.appendChild(el);

      el.addEventListener("pointerdown", e => {
        if (e.button && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        this.bringToFront(winObj.id);

        // If window is currently maximized, smoothly un-maximize and capture current screen bounds
        if (winObj.maximized) {
          const r = winObj.el.getBoundingClientRect();
          winObj.maximized = false;
          winObj.el.classList.remove("maximized");
          winObj.el.style.left = `${Math.round(r.left)}px`;
          winObj.el.style.top = `${Math.round(r.top)}px`;
          winObj.el.style.width = `${Math.round(r.width)}px`;
          winObj.el.style.height = `${Math.round(r.height)}px`;
        }

        const startX = e.clientX;
        const startY = e.clientY;
        const startRect = winObj.el.getBoundingClientRect();
        const startW = startRect.width;
        const startH = startRect.height;
        const startL = startRect.left;
        const startT = startRect.top;
        const dir = h.dir;

        let isResizing = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch (err) {}

        winObj.el.classList.add("resizing");
        document.body.classList.add("window-is-resizing");

        const onPointerMove = ev => {
          if (!isResizing) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          const isMobile = window.innerWidth <= 768;
          const minW = isMobile ? 200 : 280;
          const minH = isMobile ? 140 : 180;
          const taskbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--taskbar-h")) || 48;
          const maxW = window.innerWidth;
          const maxH = window.innerHeight - taskbarH;

          let newW = startW;
          let newH = startH;
          let newL = startL;
          let newT = startT;

          // Horizontal resizing
          if (dir.includes("e")) {
            newW = Math.max(minW, Math.min(maxW - startL, startW + dx));
          } else if (dir.includes("w")) {
            const clampedL = Math.max(0, Math.min(startL + startW - minW, startL + dx));
            newL = clampedL;
            newW = (startL + startW) - clampedL;
          }

          // Vertical resizing
          if (dir.includes("s")) {
            newH = Math.max(minH, Math.min(maxH - startT, startH + dy));
          } else if (dir.includes("n")) {
            const clampedT = Math.max(0, Math.min(startT + startH - minH, startT + dy));
            newT = clampedT;
            newH = (startT + startH) - clampedT;
          }

          winObj.el.style.width  = `${Math.round(newW)}px`;
          winObj.el.style.height = `${Math.round(newH)}px`;
          winObj.el.style.left   = `${Math.round(newL)}px`;
          winObj.el.style.top    = `${Math.round(newT)}px`;
        };

        const onPointerEnd = ev => {
          if (!isResizing) return;
          isResizing = false;
          try {
            if (ev && typeof ev.pointerId !== "undefined") {
              el.releasePointerCapture(ev.pointerId);
            }
          } catch (err) {}

          winObj.el.classList.remove("resizing");
          document.body.classList.remove("window-is-resizing");

          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerEnd);
          window.removeEventListener("pointercancel", onPointerEnd);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerEnd);
        window.addEventListener("pointercancel", onPointerEnd);
      });
    });
  },

  updateTaskbar() {
    const center = document.querySelector(".taskbar-center");
    document.querySelectorAll(".taskbar-btn.dynamic-app").forEach(el => el.remove());
    Object.values(AppState.windows).forEach(w => {
      const btn = document.createElement("button");
      const isActive  = w.id === AppState.activeWindowId && !w.minimized;
      const isOpen    = !w.minimized;
      btn.className = `taskbar-btn dynamic-app${isActive ? " focused" : isOpen ? " active" : ""}`;
      btn.title = w.title;
      btn.setAttribute("aria-label", w.title);
      btn.innerHTML = `<div style="width:22px;height:22px;">${w.iconHtml}</div>`;
      btn.addEventListener("click", () => {
        if (w.minimized) this.restoreWindow(w.id);
        else if (w.id === AppState.activeWindowId) this.minimizeWindow(w.id);
        else this.bringToFront(w.id);
      });
      center.appendChild(btn);
    });
  },
};

// ─── Toast Notifications ────────────────────────────────────
function showToast(title, message, type = "info", duration = 4000) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  if (type === "success") iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  if (type === "error")   iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  if (type === "warning") iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

  toast.innerHTML = `
    <div style="width:20px;height:20px;flex-shrink:0;">${iconSvg}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-weight:600;font-size:12px;margin-bottom:2px;">${title}</div>
      <div style="font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${message}</div>
    </div>
  `;

  container.appendChild(toast);
  pushNotification(title, message, type);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(48px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Notification Center ─────────────────────────────────────
const _notifications = [];
function pushNotification(title, message, type = "info") {
  _notifications.unshift({ title, message, type, time: new Date() });
  renderNotifications();
  // Badge on notif button
  const btn = document.getElementById("notif-btn");
  if (btn) btn.style.color = "var(--accent)";
}

function renderNotifications() {
  const list  = document.getElementById("notif-list");
  const empty = document.getElementById("notif-empty");
  if (!list) return;
  list.innerHTML = "";
  if (!_notifications.length) {
    list.innerHTML = `<div class="notif-empty" id="notif-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span>No new notifications</span></div>`;
    return;
  }
  const icons = { info: "var(--info)", success: "var(--success)", error: "var(--danger)", warning: "var(--warning)" };
  _notifications.slice(0, 20).forEach(n => {
    const card = document.createElement("div");
    card.className = "notif-card";
    card.innerHTML = `
      <div class="notif-card-icon" style="color:${icons[n.type]||'var(--info)'};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      </div>
      <div class="notif-card-body">
        <div class="notif-card-title">${n.title}</div>
        <div class="notif-card-msg">${n.message}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

// ─── System Clock ────────────────────────────────────────────
function updateClock() {
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });

  const tt = document.getElementById("tray-time");
  const td = document.getElementById("tray-date");
  const lc = document.getElementById("lock-clock");
  const ld = document.getElementById("lock-date");
  if (tt) tt.textContent = time;
  if (td) td.textContent = date;
  if (lc) lc.textContent = time;
  if (ld) ld.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Theme ───────────────────────────────────────────────────
function setTheme(theme) {
  AppState.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("win11_theme", theme);

  const icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    icon.innerHTML = theme === "dark"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }

  const qsDark = document.getElementById("qs-dark");
  if (qsDark) qsDark.classList.toggle("active", theme === "dark");
}

// ─── Wallpaper Switcher ───────────────────────────────────────
function setWallpaper(name) {
  AppState.wallpaper = name;
  localStorage.setItem("win11_wallpaper", name);
  const url = `/static/assets/windows-theme/wallpaper/${name}.jpg`;
  const desktop = document.getElementById("desktop-screen");
  const lock    = document.getElementById("lock-screen");
  if (desktop) desktop.style.backgroundImage = `url('${url}')`;
  if (lock)    lock.style.backgroundImage    = `url('${url}')`;
}

// ─── Flyout helper ────────────────────────────────────────────
function openFlyout(id) {
  const all = ["quick-settings", "notification-center", "start-menu"];
  all.forEach(fid => {
    if (fid !== id) document.getElementById(fid)?.classList.remove("open");
  });
  document.getElementById(id)?.classList.toggle("open");
}

// ─── Context Menu helper ──────────────────────────────────────
function hideContextMenu() {
  const m = document.getElementById("win-context-menu");
  if (m) { m.style.display = "none"; m.innerHTML = ""; }
}

// ─── Windows 11 Lock & Sign-in System ────────────────────────
function showSignInStage() {
  const lock = document.getElementById("lock-screen");
  if (!lock || lock.classList.contains("unlocked")) return;
  lock.classList.add("show-login");
  setTimeout(() => {
    const pwd = document.getElementById("login-password");
    if (pwd) pwd.focus();
  }, 120);
}

function hideSignInStage() {
  const lock = document.getElementById("lock-screen");
  if (!lock || lock.classList.contains("unlocked")) return;
  lock.classList.remove("show-login");
  const errDiv = document.getElementById("login-error");
  if (errDiv) errDiv.textContent = "";
}

function lockSystem() {
  sessionStorage.removeItem("win11_session_unlocked");
  const lock = document.getElementById("lock-screen");
  if (lock) {
    lock.classList.remove("unlocked");
    lock.classList.remove("show-login");
  }
  const pwd = document.getElementById("login-password");
  if (pwd) pwd.value = "";
  const err = document.getElementById("login-error");
  if (err) err.textContent = "";
  document.getElementById("start-menu")?.classList.remove("open");
  showToast("Locked", "Screen locked. Enter password to unlock.", "info");
}

async function checkAuthStatus() {
  try {
    const isSessionUnlocked = sessionStorage.getItem("win11_session_unlocked") === "true";

    // If new session or browser/tab was closed ("cut one time"), ensure backend session is cleared
    if (!isSessionUnlocked) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (e) {}
    }

    const res  = await fetch("/api/auth/status");
    const data = await res.json();
    AppState.csrfToken = data.csrf_token || "";

    const lock  = document.getElementById("lock-screen");
    const login = document.getElementById("login-card");
    const setup = document.getElementById("setup-card");

    // Populate remembered username / display name
    const lastUser    = localStorage.getItem("win11_last_user") || data.username || "vishal";
    const lastDisplay = localStorage.getItem("win11_last_display_name") || data.display_name || "Vishal";
    const nameEl = document.getElementById("signin-user-name");
    const uInput = document.getElementById("login-username");
    if (nameEl) nameEl.textContent = lastDisplay;
    if (uInput) uInput.value = lastUser;

    if (data.authenticated && isSessionUnlocked) {
      AppState.user = data;
      lock.classList.add("unlocked");
      initDesktopUI();
    } else {
      AppState.user = null;
      lock.classList.remove("unlocked");
      lock.classList.remove("show-login");
      if (data.setup_needed) {
        login && (login.style.display = "none");
        setup && (setup.style.display = "flex");
        lock.classList.add("show-login");
      } else {
        login && (login.style.display = "flex");
        setup && (setup.style.display = "none");
      }
    }
  } catch (err) { console.error("Auth check failed:", err); }
}

async function handleLogin(e) {
  e.preventDefault();
  const form     = e.target;
  const username = (form.username && form.username.value.trim()) || localStorage.getItem("win11_last_user") || "vishal";
  const password = form.password.value;
  const errDiv   = document.getElementById("login-error");
  const spinner  = document.getElementById("signin-spinner-state");
  const pwdWrap  = form.querySelector(".win11-pwd-wrapper");
  const card     = document.getElementById("login-card");

  errDiv.textContent = "";
  if (spinner) spinner.style.display = "flex";
  if (pwdWrap) pwdWrap.style.opacity = "0.5";

  try {
    const res  = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      AppState.user      = data;
      AppState.csrfToken = data.csrf_token;
      sessionStorage.setItem("win11_session_unlocked", "true");
      localStorage.setItem("win11_last_user", data.username);
      localStorage.setItem("win11_last_display_name", data.display_name || data.username);

      setTimeout(() => {
        document.getElementById("lock-screen").classList.add("unlocked");
        if (spinner) spinner.style.display = "none";
        if (pwdWrap) pwdWrap.style.opacity = "1";
        form.password.value = "";
        showToast("Signed In", `Welcome back, ${data.display_name}!`, "success");
        initDesktopUI();
      }, 400);
    } else {
      if (spinner) spinner.style.display = "none";
      if (pwdWrap) pwdWrap.style.opacity = "1";
      if (card) {
        card.classList.remove("win11-shake");
        void card.offsetWidth;
        card.classList.add("win11-shake");
      }
      errDiv.textContent = data.error || "The password is incorrect. Please try again.";
      form.password.select();
      form.password.focus();
    }
  } catch (err) {
    if (spinner) spinner.style.display = "none";
    if (pwdWrap) pwdWrap.style.opacity = "1";
    errDiv.textContent = "Server connection error.";
  }
}

async function handleSetup(e) {
  e.preventDefault();
  const form         = e.target;
  const username     = form.username.value.trim();
  const display_name = form.display_name.value.trim();
  const password     = form.password.value;
  const errDiv       = document.getElementById("setup-error");
  errDiv.textContent = "";

  try {
    const res  = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, display_name }),
    });
    const data = await res.json();
    if (data.success) {
      AppState.csrfToken = data.csrf_token;
      sessionStorage.setItem("win11_session_unlocked", "true");
      localStorage.setItem("win11_last_user", username);
      localStorage.setItem("win11_last_display_name", display_name || username);
      showToast("Setup Complete", "Admin account initialized.", "success");
      await checkAuthStatus();
    } else {
      errDiv.textContent = data.error || "Setup failed.";
    }
  } catch (err) { errDiv.textContent = "Server connection error."; }
}

async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": AppState.csrfToken } });
  } finally {
    sessionStorage.removeItem("win11_session_unlocked");
    window.location.reload();
  }
}

// ─── Desktop Init ─────────────────────────────────────────────
function initDesktopUI() {
  setTheme(AppState.theme);
  setWallpaper(AppState.wallpaper);
  if (typeof renderIcons === "function") renderIcons(document);

  // User avatar & name
  if (AppState.user) {
    const initial = (AppState.user.display_name || AppState.user.username)[0].toUpperCase();
    const name    = AppState.user.display_name || AppState.user.username;
    const av   = document.getElementById("start-user-avatar");
    const unam = document.getElementById("start-username");
    if (av)   av.textContent   = initial;
    if (unam) unam.textContent = name;
  }

  // Load roots
  fetch("/api/roots").then(r => r.json()).then(data => {
    if (data.success && data.roots) {
      AppState.activeRoots   = data.roots;
      AppState.currentRootId = data.roots[0]?.id || 0;
    }
  });

  // Anchor browser history so Back button is caught by the app
  if (typeof anchorAppHistory === 'function') anchorAppHistory();
}

// ─── DOM Ready ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    setTheme(AppState.theme === "dark" ? "light" : "dark");
  });

  // Start menu
  document.getElementById("start-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    openFlyout("start-menu");
  });

  // Quick settings
  document.getElementById("quick-settings-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    openFlyout("quick-settings");
  });

  // Notification center
  document.getElementById("notif-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    openFlyout("notification-center");
    // Clear badge
    const btn = document.getElementById("notif-btn");
    if (btn) btn.style.color = "";
  });

  // Close flyouts on outside click
  document.addEventListener("click", e => {
    const flyouts = ["start-menu", "quick-settings", "notification-center"];
    const triggers = ["start-btn", "quick-settings-btn", "notif-btn"];
    const clickedInsideFlyout  = flyouts.some(id => e.target.closest(`#${id}`));
    const clickedTrigger       = triggers.some(id => e.target.closest(`#${id}`));
    if (!clickedInsideFlyout && !clickedTrigger) {
      flyouts.forEach(id => document.getElementById(id)?.classList.remove("open"));
    }
    // Close context menu
    if (!e.target.closest(".win-context-menu")) hideContextMenu();
    // Deselect desktop icons
    if (!e.target.closest(".desktop-icon")) {
      document.querySelectorAll(".desktop-icon.selected").forEach(i => i.classList.remove("selected"));
    }
  });

  // Auth forms & Lock screen interactions
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);
  document.getElementById("setup-form")?.addEventListener("submit", handleSetup);
  document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
  document.getElementById("lock-btn")?.addEventListener("click", lockSystem);

  // Phase 1 Lock Screen click & mobile touch to show Sign-in stage
  const lockClockStage = document.getElementById("lock-stage-clock");
  if (lockClockStage) {
    lockClockStage.addEventListener("click", showSignInStage);
    let touchStartY = 0;
    lockClockStage.addEventListener("touchstart", e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    lockClockStage.addEventListener("touchend", e => {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchStartY - touchEndY > 20 || Math.abs(touchStartY - touchEndY) < 10) {
        showSignInStage();
      }
    }, { passive: true });
  }

  // Back button on Sign-in stage returns to Clock view
  document.getElementById("lock-back-btn")?.addEventListener("click", hideSignInStage);

  // Password reveal eye toggle
  const pwdInput = document.getElementById("login-password");
  const eyeBtn   = document.getElementById("login-pwd-eye");
  if (eyeBtn && pwdInput) {
    eyeBtn.addEventListener("click", () => {
      const isPwd = pwdInput.type === "password";
      pwdInput.type = isPwd ? "text" : "password";
      eyeBtn.style.color = isPwd ? "var(--accent)" : "rgba(255,255,255,0.6)";
    });
  }

  // Switch account button
  const switchBtn = document.getElementById("btn-switch-account");
  const userRow   = document.getElementById("username-row");
  if (switchBtn && userRow) {
    switchBtn.addEventListener("click", () => {
      const isHidden = userRow.style.display === "none";
      userRow.style.display = isHidden ? "block" : "none";
      switchBtn.textContent = isHidden ? "Cancel" : "Other user";
      if (isHidden) {
        const uInput = document.getElementById("login-username");
        uInput?.focus();
        uInput?.select();
      }
    });
  }

  // Power button on sign-in screen
  document.getElementById("signin-power-btn")?.addEventListener("click", e => {
    e.stopPropagation();
    showToast("Windows Power", "Sleep, Shut down, and Restart are ready.", "info");
  });

  // Desktop right-click context menu
  document.getElementById("desktop-screen")?.addEventListener("contextmenu", e => {
    if (e.target.closest(".win11-window") || e.target.closest("#taskbar") || e.target.closest("#start-menu")) return;
    e.preventDefault();

    const menu = document.getElementById("win-context-menu");
    menu.innerHTML = `
      <div class="context-item" onclick="if(typeof loadExplorerDirectory==='function')loadExplorerDirectory();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.transfer : ''}</span><span>Refresh</span>
      </div>
      <div class="context-separator"></div>
      <div class="context-item" onclick="openNotepad();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.notepad : ''}</span><span>New Text Document</span>
      </div>
      <div class="context-item" onclick="openCalculator();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.calculator : ''}</span><span>Calculator</span>
      </div>
      <div class="context-item" onclick="openStorageOverview();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.storage : ''}</span><span>Storage Overview</span>
      </div>
      <div class="context-separator"></div>
      <div class="context-item" onclick="openPersonalization();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span><span>Personalize</span>
      </div>
      <div class="context-item" onclick="openAdminSettings();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span><span>Display Settings</span>
      </div>
      <div class="context-separator"></div>
      <div class="context-item" onclick="openAboutDialog();hideContextMenu();">
        <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.help : ''}</span><span>About</span>
      </div>
    `;
    menu.style.display = "block";
    const mw = 220, mh = 280;
    menu.style.left = `${Math.min(window.innerWidth  - mw, e.clientX)}px`;
    menu.style.top  = `${Math.min(window.innerHeight - mh, e.clientY)}px`;
  });

  // Long-press context menu on mobile
  let longPressTimer = null;
  document.getElementById("desktop-screen")?.addEventListener("touchstart", e => {
    if (e.target.closest(".win11-window") || e.target.closest(".desktop-icon")) return;
    longPressTimer = setTimeout(() => {
      const menu = document.getElementById("win-context-menu");
      if (menu) {
        menu.innerHTML = `
          <div class="context-item" onclick="openExplorer();hideContextMenu();">
            <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.folder : ''}</span><span>Open File Explorer</span>
          </div>
          <div class="context-separator"></div>
          <div class="context-item" onclick="openPersonalization();hideContextMenu();">
            <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span><span>Personalize</span>
          </div>
          <div class="context-item" onclick="openAdminSettings();hideContextMenu();">
            <span class="ctx-icon">${typeof ICONS !== 'undefined' ? ICONS.settings : ''}</span><span>Settings</span>
          </div>
        `;
        menu.style.display = "block";
      }
    }, 600);
  }, { passive: true });
  document.getElementById("desktop-screen")?.addEventListener("touchend", () => clearTimeout(longPressTimer));

  // Keyboard shortcuts
  document.addEventListener("keydown", e => {
    // If on Lock Screen and not yet unlocked:
    const lock = document.getElementById("lock-screen");
    if (lock && !lock.classList.contains("unlocked")) {
      if (!lock.classList.contains("show-login")) {
        // Any key unlocks the clock view and transitions to sign-in stage
        showSignInStage();
        return;
      } else if (e.key === "Escape") {
        // Escape returns to clock stage
        hideSignInStage();
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      lockSystem();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "e") { e.preventDefault(); openExplorer(); }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openCalculator(); }
    if (e.key === "Escape") {
      ["start-menu","quick-settings","notification-center"].forEach(id =>
        document.getElementById(id)?.classList.remove("open"));
      hideContextMenu();
    }
  });

  // Initial auth check
  checkAuthStatus();

  // Keep isMobile accurate and adapt open windows to portrait/landscape changes
  const adaptViewport = () => {
    AppState.isMobile = window.innerWidth <= 768;
    const taskbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--taskbar-h")) || 48;
    const availH = window.innerHeight - taskbarH;

    Object.values(AppState.windows).forEach(w => {
      if (!w || !w.el) return;
      if (w.maximized) {
        w.el.style.width = `${window.innerWidth}px`;
        w.el.style.height = `${availH}px`;
        w.el.style.left = "0px";
        w.el.style.top = "0px";
      } else {
        const rect = w.el.getBoundingClientRect();
        if (rect.top > availH - 40) {
          w.el.style.top = `${Math.max(0, availH - 80)}px`;
        }
        if (rect.left > window.innerWidth - 60) {
          w.el.style.left = `${Math.max(0, window.innerWidth - rect.width)}px`;
        }
      }
    });
  };
  window.addEventListener("resize", adaptViewport, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", adaptViewport, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(adaptViewport, 150));
});
