/**
 * PocketVault - Mobile OS Client Controller (v2.1)
 * Authentic Samsung One UI / Android 15 Mobile Experience
 * 100% full-screen mobile workstation with native gesture navigation,
 * dynamic shared screen wallpapers, live widgets, and category-first file explorer.
 */

const PocketVault = {
  csrfToken: "",
  currentUser: null,
  cachedRoots: [],
  activeWallpaper: null,
  activeSheet: null,
  currentRootId: 0,
  currentPath: "",
  sheetHistory: [],
  searchDebounceTimer: null,
  autoFetchEnabled: true,
  currentViewMode: "roots", // "roots" or "browser"

  async init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.initBattery();
    await this.loadWallpaper();
    await this.checkAuthStatus();
    this.setupEventListeners();
    this.setupMediaSession();
  },

  // --------------------------------------------------------------------------
  // Live Clock & Status Bar
  // --------------------------------------------------------------------------
  updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    const clockEl = document.getElementById("ambient-time-display");
    if (clockEl) clockEl.textContent = timeStr;

    const statusTimeEl = document.getElementById("status-time-display");
    if (statusTimeEl) statusTimeEl.textContent = timeStr;

    const dateEl = document.getElementById("ambient-date-display");
    if (dateEl) {
      const options = { weekday: "long", month: "long", day: "numeric" };
      dateEl.textContent = now.toLocaleDateString(undefined, options);
    }
  },

  // --------------------------------------------------------------------------
  // Battery Status API
  // --------------------------------------------------------------------------
  async initBattery() {
    const batteryText = document.getElementById("status-battery-pct");
    const batteryIcon = document.getElementById("status-battery-icon");
    if (!batteryText) return;

    if ("getBattery" in navigator) {
      try {
        const battery = await navigator.getBattery();
        const update = () => {
          const level = Math.round(battery.level * 100);
          batteryText.textContent = `${level}%`;
          batteryIcon.textContent = battery.charging ? "⚡" : "🔋";
        };
        update();
        battery.addEventListener("levelchange", update);
        battery.addEventListener("chargingchange", update);
      } catch (e) {
        batteryText.textContent = "95%";
      }
    } else {
      batteryText.textContent = "95%";
    }
  },

  // --------------------------------------------------------------------------
  // Quick Settings / Control Center Shade
  // --------------------------------------------------------------------------
  toggleQuickSettings() {
    this.vibrate(25);
    const shade = document.getElementById("quick-settings-shade");
    if (shade) {
      shade.classList.toggle("open");
    }
  },

  // --------------------------------------------------------------------------
  // Dynamic Shared Screen Wallpaper Engine
  // --------------------------------------------------------------------------
  async loadWallpaper() {
    try {
      const res = await fetch("/api/wallpaper/current");
      const data = await res.json();
      if (data.success && data.wallpaper) {
        this.applyWallpaper(data.wallpaper);
      }
    } catch (e) {
      console.warn("Wallpaper fetch error:", e);
    }
  },

  applyWallpaper(wp) {
    this.activeWallpaper = wp;
    const backdrop = document.getElementById("wallpaper-backdrop");
    const overlay = document.getElementById("wallpaper-overlay");
    const statusText = document.getElementById("wallpaper-status-text");
    const descText = document.getElementById("active-wallpaper-desc");
    const blurSlider = document.getElementById("wallpaper-blur-slider");
    const dimSlider = document.getElementById("wallpaper-dim-slider");

    if (!backdrop) return;

    const blur = wp.blur_level !== undefined ? wp.blur_level : 16;
    const dim = wp.dim_level !== undefined ? wp.dim_level : 35;

    if (blurSlider) blurSlider.value = blur;
    if (dimSlider) dimSlider.value = dim;

    if (wp.url) {
      backdrop.style.backgroundImage = `url('${wp.url}')`;
      backdrop.style.filter = `blur(${blur}px)`;
    } else if (wp.gradient) {
      backdrop.style.backgroundImage = wp.gradient;
      backdrop.style.filter = "none";
    }

    if (overlay) {
      const opacity = dim / 100;
      overlay.style.background = `radial-gradient(circle at 50% 20%, rgba(15, 23, 42, ${opacity * 0.7}) 0%, rgba(6, 9, 14, ${opacity}) 100%)`;
    }

    const title = wp.title || "Shared Screen Wallpaper";
    if (statusText) statusText.textContent = `Synced: ${title}`;
    if (descText) descText.textContent = title;
  },

  handleBlurSlider(val) {
    const backdrop = document.getElementById("wallpaper-backdrop");
    if (backdrop) backdrop.style.filter = `blur(${val}px)`;
    this.saveWallpaperAdjustments();
  },

  handleDimSlider(val) {
    const overlay = document.getElementById("wallpaper-overlay");
    if (overlay) {
      const opacity = val / 100;
      overlay.style.background = `radial-gradient(circle at 50% 20%, rgba(15, 23, 42, ${opacity * 0.7}) 0%, rgba(6, 9, 14, ${opacity}) 100%)`;
    }
    this.saveWallpaperAdjustments();
  },

  async saveWallpaperAdjustments() {
    const blur = document.getElementById("wallpaper-blur-slider")?.value || 16;
    const dim = document.getElementById("wallpaper-dim-slider")?.value || 35;
    try {
      await fetch("/api/wallpaper/set", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
        body: JSON.stringify({ blur_level: blur, dim_level: dim }),
      });
    } catch (e) {}
  },

  async toggleAutoFetch() {
    this.vibrate(20);
    this.autoFetchEnabled = !this.autoFetchEnabled;
    this.updateAutoFetchUI(this.autoFetchEnabled);
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ auto_fetch: this.autoFetchEnabled }),
    });
  },

  async toggleAutoFetchFromCheckbox(checked) {
    this.autoFetchEnabled = checked;
    this.updateAutoFetchUI(checked);
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ auto_fetch: checked }),
    });
  },

  updateAutoFetchUI(enabled) {
    const tile = document.getElementById("toggle-autofetch");
    const label = document.getElementById("autofetch-status-label");
    const checkbox = document.getElementById("hero-autofetch-checkbox");
    const dot = document.getElementById("status-auto-sync-dot");

    if (tile) tile.classList.toggle("active", enabled);
    if (label) label.textContent = enabled ? "Enabled" : "Disabled";
    if (checkbox) checkbox.checked = enabled;
    if (dot) dot.style.display = enabled ? "inline-block" : "none";
  },

  async triggerInstantScreenRescan() {
    this.vibrate(30);
    const syncDot = document.getElementById("status-auto-sync-dot");
    if (syncDot) syncDot.style.animation = "spinSlow 1s linear infinite";

    try {
      const res = await fetch("/api/wallpaper/auto_fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      });
      const data = await res.json();
      if (data.success && data.wallpaper) {
        this.applyWallpaper(data.wallpaper);
        if (this.activeSheet && this.activeSheet.id === "sheet-wallpaper") {
          this.loadWallpaperPicker();
        }
      }
    } catch (e) {
      console.warn("Screen rescan failed:", e);
    } finally {
      if (syncDot) syncDot.style.animation = "spinSlow 12s linear infinite";
    }
  },

  // --------------------------------------------------------------------------
  // Authentication & Security
  // --------------------------------------------------------------------------
  async checkAuthStatus() {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      this.csrfToken = data.csrf_token || "";

      if (data.authenticated) {
        this.currentUser = data;
        this.showHomeScreen();
        this.loadStorageSummary();
      } else {
        this.showLoginScreen(data.setup_needed);
      }
    } catch (e) {
      this.showLoginScreen(false);
    }
  },

  showLoginScreen(isSetup) {
    const loginOverlay = document.getElementById("login-overlay");
    const homeScreen = document.getElementById("home-screen");
    if (loginOverlay) loginOverlay.style.display = "flex";
    if (homeScreen) homeScreen.style.display = "none";

    const titleEl = document.getElementById("login-card-title");
    const subEl = document.getElementById("login-card-subtitle");
    if (isSetup) {
      if (titleEl) titleEl.textContent = "Setup Master Access";
      if (subEl) subEl.textContent = "Create password for PocketVault";
    } else {
      if (titleEl) titleEl.textContent = "PocketVault";
      if (subEl) subEl.textContent = "Personal Mobile File Server";
    }
  },

  showHomeScreen() {
    const loginOverlay = document.getElementById("login-overlay");
    const homeScreen = document.getElementById("home-screen");
    if (loginOverlay) loginOverlay.style.display = "none";
    if (homeScreen) homeScreen.style.display = "flex";
  },

  async handleLogin(username, password) {
    const errBox = document.getElementById("login-error-msg");
    if (errBox) errBox.textContent = "Authenticating...";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        this.csrfToken = data.csrf_token;
        this.currentUser = data;
        this.showHomeScreen();
        this.loadStorageSummary();
      } else {
        if (errBox) errBox.textContent = data.error || "Login failed.";
      }
    } catch (e) {
      if (errBox) errBox.textContent = "Connection error to server.";
    }
  },

  async handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
    });
    window.location.reload();
  },

  // --------------------------------------------------------------------------
  // Storage Summary & Roots
  // --------------------------------------------------------------------------
  async loadStorageSummary() {
    try {
      const res = await fetch("/api/storage/info");
      const data = await res.json();
      if (data.success && data.storage) {
        const bar = document.getElementById("storage-progress-bar");
        const text = document.getElementById("storage-text-summary");
        if (bar) bar.style.width = `${data.storage.percent_used}%`;
        if (text) text.textContent = `${data.storage.free_human} free of ${data.storage.total_human}`;
      }
    } catch (e) {}
  },

  // --------------------------------------------------------------------------
  // Navigation & App Sheets
  // --------------------------------------------------------------------------
  openApp(appName) {
    this.vibrate(25);
    const shade = document.getElementById("quick-settings-shade");
    if (shade && shade.classList.contains("open")) {
      shade.classList.remove("open");
    }

    const sheet = document.getElementById(`sheet-${appName}`);
    if (!sheet) return;

    if (this.activeSheet) {
      this.activeSheet.classList.remove("active");
    }

    sheet.classList.add("active");
    this.sheetHistory.push(this.activeSheet);
    this.activeSheet = sheet;

    switch (appName) {
      case "files":
        this.loadRootsView();
        break;
      case "gallery":
        this.loadGallery();
        break;
      case "video":
        this.loadVideos();
        break;
      case "docs":
        this.loadDocuments();
        break;
      case "music":
        this.loadMusic();
        break;
      case "archives":
        this.loadArchives();
        break;
      case "apps":
        this.loadInstalledApps();
        break;
      case "wallpaper":
        this.loadWallpaperPicker();
        break;
      case "settings":
        this.loadSettings();
        break;
    }
  },

  closeActiveSheet() {
    this.vibrate(15);
    if (this.activeSheet) {
      this.activeSheet.classList.remove("active");
      this.activeSheet = this.sheetHistory.pop() || null;
      if (this.activeSheet) {
        this.activeSheet.classList.add("active");
      }
    }
  },

  goHome() {
    this.vibrate(20);
    const shade = document.getElementById("quick-settings-shade");
    if (shade) shade.classList.remove("open");

    if (this.activeSheet) {
      this.activeSheet.classList.remove("active");
      this.activeSheet = null;
      this.sheetHistory = [];
    }
  },

  vibrate(ms) {
    if ("vibrate" in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  },

  // --------------------------------------------------------------------------
  // Universal Search
  // --------------------------------------------------------------------------
  openSearchSheet() {
    this.openApp("search");
    setTimeout(() => {
      const input = document.getElementById("live-search-input");
      if (input) input.focus();
    }, 200);
  },

  handleSearchInput(query) {
    clearTimeout(this.searchDebounceTimer);
    const q = (query || "").trim();
    const container = document.getElementById("search-results-container");
    if (!container) return;

    if (q.length < 2) {
      container.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">Type at least 2 characters to search...</div>';
      return;
    }

    container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Searching device storage...</div>';

    this.searchDebounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/files/search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
          container.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">No files matching "${q}"</div>`;
          return;
        }

        let html = "";
        data.results.forEach(f => {
          const isImg = f.category === "image";
          const isAud = f.category === "audio";
          const isVid = f.category === "video";
          let icon = "📄";
          if (isImg) icon = "🖼️";
          if (isAud) icon = "🎵";
          if (isVid) icon = "🎬";

          const encPath = encodeURIComponent(f.rel_path);
          const encName = encodeURIComponent(f.name);

          html += `
            <div class="file-row" onclick="PocketVault.onSearchItemClick(this)" data-root="${f.root_id || 0}" data-path="${encPath}" data-cat="${f.category}" data-name="${encName}">
              <div class="file-icon-box" style="background: rgba(56, 189, 248, 0.15);">${icon}</div>
              <div class="file-info-col">
                <div class="file-name">${f.name}</div>
                <div class="file-meta">${f.size_human} • ${f.root_name || "Storage"}</div>
              </div>
              <a href="/api/files/download?root_id=${f.root_id || 0}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
            </div>
          `;
        });
        container.innerHTML = html;
      } catch (e) {
        container.innerHTML = '<div style="color:#f43f5e; padding:20px;">Search failed.</div>';
      }
    }, 280);
  },

  onSearchItemClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    const category = el.dataset.cat || "";
    const name = decodeURIComponent(el.dataset.name || "");
    this.handleFileClick(rootId, relPath, category, name);
  },

  // --------------------------------------------------------------------------
  // File Explorer (Samsung One UI My Files Style)
  // --------------------------------------------------------------------------
  onFilesBackClick() {
    if (this.currentViewMode === "browser") {
      if (this.currentPath) {
        // Go to parent directory
        const parts = this.currentPath.split("/").filter(Boolean);
        parts.pop();
        const parentPath = parts.join("/");
        this.loadDirectory(this.currentRootId, parentPath);
      } else {
        // Return to Storage Overview
        this.loadRootsView();
      }
    } else {
      this.closeActiveSheet();
    }
  },

  async refreshFiles() {
    if (this.currentViewMode === "browser") {
      await this.loadDirectory(this.currentRootId, this.currentPath);
    } else {
      await this.loadRootsView();
    }
  },

  async loadRootsView() {
    this.vibrate(20);
    this.currentViewMode = "roots";
    this.currentPath = "";

    const overviewSec = document.getElementById("files-overview-section");
    const browserSec = document.getElementById("files-browser-section");
    const titleEl = document.getElementById("files-sheet-title");
    const list = document.getElementById("storage-locations-list");

    if (titleEl) titleEl.textContent = "My Files";
    if (overviewSec) overviewSec.style.display = "block";
    if (browserSec) browserSec.style.display = "none";
    if (!list) return;

    list.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Scanning device storage...</div>';

    try {
      const res = await fetch("/api/roots");
      const data = await res.json();
      if (!data.success || !data.roots || data.roots.length === 0) {
        list.innerHTML = '<div style="color:#f43f5e; padding:16px;">No storage locations detected.</div>';
        return;
      }

      this.cachedRoots = data.roots;
      let html = "";

      data.roots.forEach(r => {
        let icon = "📁";
        const nameLower = (r.name || "").toLowerCase();
        if (nameLower.includes("internal") || nameLower.includes("phone")) icon = "📱";
        else if (nameLower.includes("sd") || nameLower.includes("card") || nameLower.includes("drive")) icon = "💾";
        else if (nameLower.includes("download")) icon = "📥";
        else if (nameLower.includes("picture") || nameLower.includes("wallpaper")) icon = "🖼️";
        else if (nameLower.includes("camera") || nameLower.includes("dcim")) icon = "📸";
        else if (nameLower.includes("music") || nameLower.includes("audio")) icon = "🎵";
        else if (nameLower.includes("video") || nameLower.includes("movie")) icon = "🎬";
        else if (nameLower.includes("doc")) icon = "📄";
        else if (nameLower.includes("home")) icon = "🏠";

        const storage = r.storage || {};
        const metaText = (storage.free_human && storage.total_human)
          ? `${storage.free_human} free of ${storage.total_human}`
          : "Ready";
        const pct = storage.percent_used || 0;

        html += `
          <div class="storage-root-card" onclick="PocketVault.loadDirectory(${r.id}, '')">
            <div class="storage-root-card-icon">${icon}</div>
            <div class="storage-root-card-info">
              <div class="storage-root-card-title">${r.name}</div>
              <div class="storage-root-card-meta">${metaText}</div>
              ${storage.total ? `
                <div class="storage-root-progress-bar">
                  <div class="storage-root-progress-fill" style="width: ${pct}%"></div>
                </div>
              ` : ''}
            </div>
            <div style="font-size:18px; color:#94a3b8; margin-left:8px;">›</div>
          </div>
        `;
      });

      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:16px;">Failed to scan storage locations.</div>';
    }
  },

  async loadRootsBar() {
    const bar = document.getElementById("files-roots-bar");
    if (!bar) return;
    try {
      const roots = this.cachedRoots.length > 0 ? this.cachedRoots : (await (await fetch("/api/roots")).json()).roots || [];
      this.cachedRoots = roots;

      let html = "";
      roots.forEach(r => {
        const isActive = r.id === this.currentRootId;
        let icon = "📁";
        const nameLower = (r.name || "").toLowerCase();
        if (nameLower.includes("internal") || nameLower.includes("phone")) icon = "📱";
        else if (nameLower.includes("sd") || nameLower.includes("card") || nameLower.includes("drive")) icon = "💾";
        else if (nameLower.includes("download")) icon = "📥";
        else if (nameLower.includes("picture") || nameLower.includes("wallpaper")) icon = "🖼️";
        else if (nameLower.includes("camera") || nameLower.includes("dcim")) icon = "📸";
        else if (nameLower.includes("music") || nameLower.includes("audio")) icon = "🎵";
        else if (nameLower.includes("video") || nameLower.includes("movie")) icon = "🎬";
        else if (nameLower.includes("doc")) icon = "📄";
        else if (nameLower.includes("home")) icon = "🏠";

        html += `
          <button class="storage-root-chip ${isActive ? 'active' : ''}" onclick="PocketVault.loadDirectory(${r.id}, '')">
            <span>${icon}</span>
            <span>${r.name}</span>
          </button>
        `;
      });
      bar.innerHTML = html;
    } catch (e) {}
  },

  async loadDirectory(rootId, path) {
    this.currentViewMode = "browser";
    this.currentRootId = (rootId !== undefined && rootId !== null) ? rootId : (this.currentRootId || 0);
    this.currentPath = path || "";

    const overviewSec = document.getElementById("files-overview-section");
    const browserSec = document.getElementById("files-browser-section");
    const titleEl = document.getElementById("files-sheet-title");
    const list = document.getElementById("files-list-container");
    const bc = document.getElementById("files-breadcrumbs");

    if (overviewSec) overviewSec.style.display = "none";
    if (browserSec) browserSec.style.display = "block";
    if (!list) return;

    this.loadRootsBar();

    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Reading storage...</div>';

    try {
      const res = await fetch(`/api/files/list?root_id=${this.currentRootId}&path=${encodeURIComponent(this.currentPath)}`);
      const data = await res.json();
      if (!data.success) {
        list.innerHTML = `<div style="color:#f43f5e; padding:20px;">${data.error || "Cannot access folder"}</div>`;
        return;
      }

      if (titleEl) {
        titleEl.textContent = data.current_path ? data.current_path.split("/").pop() : (data.root_name || "Files");
      }

      this.renderBreadcrumbs(bc, data.breadcrumbs, this.currentRootId, data.root_name);

      const directories = data.directories || (data.items ? data.items.filter(i => i.is_dir) : []);
      const files = data.files || (data.items ? data.items.filter(i => !i.is_dir) : []);

      if (directories.length === 0 && files.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Folder is empty</div>';
        return;
      }

      let html = "";
      directories.forEach(d => {
        const encPath = encodeURIComponent(d.rel_path);
        html += `
          <div class="file-row" onclick="PocketVault.onDirClick(this)" data-root="${this.currentRootId}" data-path="${encPath}">
            <div class="file-icon-box" style="background:#0284c7;">📁</div>
            <div class="file-info-col">
              <div class="file-name">${d.name}</div>
              <div class="file-meta">Folder • ${d.modified_human || d.modified_str || ""}</div>
            </div>
            <div style="font-size:18px; color:#94a3b8; margin-left:8px;">›</div>
          </div>
        `;
      });

      files.forEach(f => {
        const isImg = f.category === "image";
        const icon = this.getFileIcon(f.category, f.extension);
        const encPath = encodeURIComponent(f.rel_path);
        const encName = encodeURIComponent(f.name);

        let iconHtml = `<div class="file-icon-box" style="background: rgba(255,255,255,0.08); font-size:18px;">${icon}</div>`;
        if (isImg) {
          const thumbUrl = `/api/files/thumbnail?root_id=${this.currentRootId}&path=${encPath}&size=100`;
          iconHtml = `
            <div class="file-icon-box" style="padding:0; overflow:hidden; background: rgba(255,255,255,0.04);">
              <img src="${thumbUrl}" class="file-thumb-mini" loading="lazy" alt="${f.name}" onerror="this.onerror=null; this.parentNode.innerHTML='🖼️';" />
            </div>
          `;
        } else if (f.category === "archive" || (f.extension && f.extension.toLowerCase() === ".zip")) {
          iconHtml = `<div class="file-icon-box" style="background: rgba(236, 72, 153, 0.18); font-size:18px;">📦</div>`;
        }

        html += `
          <div class="file-row" onclick="PocketVault.onFileClick(this)" data-root="${this.currentRootId}" data-path="${encPath}" data-cat="${f.category}" data-name="${encName}" data-size="${f.size_human || ''}">
            ${iconHtml}
            <div class="file-info-col">
              <div class="file-name">${f.name}</div>
              <div class="file-meta">${f.size_human} • ${f.modified_human || f.modified_str || ""}</div>
            </div>
            <a href="/api/files/download?root_id=${this.currentRootId}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()" title="Download file">↓</a>
          </div>
        `;
      });

      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load files.</div>';
    }
  },

  onDirClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    this.loadDirectory(rootId, relPath);
  },

  onFileClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    const category = el.dataset.cat || "";
    const name = decodeURIComponent(el.dataset.name || "");
    const size = el.dataset.size || "";
    this.handleFileClick(rootId, relPath, category, name, size);
  },

  onCrumbClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    this.loadDirectory(rootId, relPath);
  },

  renderBreadcrumbs(el, crumbs, rootId, rootName) {
    if (!el) return;
    let html = `<span class="crumb-item" onclick="PocketVault.loadRootsView()">Storage</span>`;
    if (crumbs && crumbs.length > 0) {
      crumbs.forEach((c, idx) => {
        const isLast = idx === crumbs.length - 1;
        const style = isLast ? 'style="color:#f8fafc; font-weight:600;"' : '';
        const encPath = encodeURIComponent(c.path);
        html += ` <span style="opacity:0.4;">›</span> <span class="crumb-item" ${style} onclick="PocketVault.onCrumbClick(this)" data-root="${rootId}" data-path="${encPath}">${c.name}</span>`;
      });
    } else if (rootName) {
      html += ` <span style="opacity:0.4;">›</span> <span class="crumb-item" style="color:#f8fafc; font-weight:600;" onclick="PocketVault.loadDirectory(${rootId}, '')">${rootName}</span>`;
    }
    el.innerHTML = html;
  },

  handleFileClick(rootId, relPath, category, name, sizeHuman) {
    const ext = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
    if (category === "image") {
      this.openLightbox(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, name);
    } else if (category === "audio") {
      this.playMediaStream(rootId, relPath, "audio", name);
    } else if (category === "video") {
      this.playMediaStream(rootId, relPath, "video", name);
    } else if (category === "archive" || ext === ".zip" || ext === ".tar" || ext === ".gz" || ext === ".7z" || ext === ".rar" || ext === ".apk") {
      this.openZipModal(rootId, relPath, name, sizeHuman);
    } else {
      window.open(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, "_blank");
    }
  },

  // --------------------------------------------------------------------------
  // Universal File Icon & Category Engine
  // --------------------------------------------------------------------------
  getFileIcon(cat, ext) {
    const e = (ext || "").toLowerCase();
    if (cat === "image") return "🖼️";
    if (cat === "video") return "🎬";
    if (cat === "audio") return "🎵";
    if (cat === "archive" || e === ".zip" || e === ".tar" || e === ".gz" || e === ".7z" || e === ".rar" || e === ".iso") return "📦";
    if (cat === "executable" || e === ".apk") return "📱";
    if (e === ".exe" || e === ".msi" || e === ".deb" || e === ".rpm") return "⚙️";
    if (cat === "pdf" || e === ".pdf") return "📕";
    if (cat === "spreadsheet" || e === ".xlsx" || e === ".xls" || e === ".csv") return "📊";
    if (cat === "presentation" || e === ".pptx" || e === ".ppt") return "📽️";
    if (cat === "document" || e === ".docx" || e === ".doc") return "📄";
    if (cat === "text" || e === ".txt" || e === ".md" || e === ".log") return "📝";
    if (e === ".py" || e === ".js" || e === ".ts" || e === ".html" || e === ".css" || e === ".sh" || e === ".bat" || e === ".json" || e === ".xml") return "💻";
    return "📄";
  },

  openDownloads() {
    this.vibrate(20);
    const roots = this.cachedRoots || [];
    const dlRoot = roots.find(r => (r.name || "").toLowerCase().includes("download"));
    if (dlRoot) {
      this.openApp("files");
      this.loadDirectory(dlRoot.id, "");
    } else {
      this.openApp("files");
    }
  },

  async openZipModal(rootId, relPath, name, sizeHuman) {
    this.vibrate(20);
    const modal = document.getElementById("zip-inspector-modal");
    const titleEl = document.getElementById("zip-modal-title");
    const summaryEl = document.getElementById("zip-modal-summary");
    const entriesList = document.getElementById("zip-entries-list");
    const dlBtn = document.getElementById("zip-modal-download-btn");

    if (!modal) return;

    const downloadUrl = `/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`;
    if (titleEl) titleEl.textContent = name;
    if (dlBtn) {
      dlBtn.href = downloadUrl;
      dlBtn.download = name;
      dlBtn.innerHTML = `<span>📥 Download ${name} (${sizeHuman || "Archive"})</span>`;
    }

    if (summaryEl) summaryEl.textContent = "Reading archive contents...";
    if (entriesList) entriesList.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Inspecting ZIP structure...</div>';
    modal.style.display = "flex";

    try {
      const res = await fetch(`/api/preview/zip?root_id=${rootId}&path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (data.success && data.entries) {
        if (summaryEl) {
          summaryEl.textContent = `${data.total_files || data.entries.length} items • ${data.total_uncompressed_human || ""} uncompressed`;
        }
        let html = "";
        data.entries.forEach(item => {
          const isDir = item.is_dir;
          const icon = isDir ? "📁" : "📄";
          html += `
            <div class="file-row" style="margin-bottom:6px; padding:8px 12px;">
              <div class="file-icon-box" style="width:34px; height:34px; font-size:14px; background:${isDir ? '#0284c7' : 'rgba(255,255,255,0.06)'};">${icon}</div>
              <div class="file-info-col">
                <div class="file-name" style="font-size:13px;">${item.name}</div>
                <div class="file-meta">${isDir ? "Folder" : (item.size_human || "")}</div>
              </div>
            </div>
          `;
        });
        if (entriesList) entriesList.innerHTML = html || '<div style="color:#64748b; padding:10px;">Archive is empty.</div>';
      } else {
        if (summaryEl) summaryEl.textContent = sizeHuman ? `File size: ${sizeHuman}` : "Archive ready";
        if (entriesList) entriesList.innerHTML = '<div style="color:#94a3b8; padding:10px; font-size:12.5px;">Click the download button above to download and extract this archive on your device.</div>';
      }
    } catch (e) {
      if (summaryEl) summaryEl.textContent = sizeHuman ? `File size: ${sizeHuman}` : "Archive ready";
      if (entriesList) entriesList.innerHTML = '<div style="color:#94a3b8; padding:10px; font-size:12.5px;">Click the download button above to download and extract this archive on your device.</div>';
    }
  },

  closeZipModal() {
    const modal = document.getElementById("zip-inspector-modal");
    if (modal) modal.style.display = "none";
  },

  async loadArchives() {
    this.vibrate(20);
    const list = document.getElementById("archives-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning for ZIP & archive files...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=archive");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">No ZIP or archive files found</div>';
        return;
      }
      let html = "";
      data.results.forEach(arch => {
        const encPath = encodeURIComponent(arch.rel_path);
        const encName = encodeURIComponent(arch.name);
        const icon = (arch.extension === ".apk") ? "📱" : "📦";
        html += `
          <div class="file-row" onclick="PocketVault.onFileClick(this)" data-root="${arch.root_id || 0}" data-path="${encPath}" data-cat="${arch.category}" data-name="${encName}" data-size="${arch.size_human || ''}">
            <div class="file-icon-box" style="background: rgba(236, 72, 153, 0.18); font-size:18px;">${icon}</div>
            <div class="file-info-col">
              <div class="file-name">${arch.name}</div>
              <div class="file-meta">${arch.size_human} • ${arch.root_name || "Storage"}</div>
            </div>
            <a href="/api/files/download?root_id=${arch.root_id || 0}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()" title="Download file">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load archives.</div>';
    }
  },



  // --------------------------------------------------------------------------
  // Gallery
  // --------------------------------------------------------------------------
  async loadGallery() {
    const grid = document.getElementById("gallery-grid-container");
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8; grid-column: span 3;">Scanning device photos...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=image");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b; grid-column: span 3;">No pictures found</div>';
        return;
      }

      let html = "";
      data.results.forEach(img => {
        const thumbUrl = `/api/files/thumbnail?root_id=${img.root_id || 0}&path=${encodeURIComponent(img.rel_path)}&size=300`;
        const fullUrl = `/api/files/download?root_id=${img.root_id || 0}&path=${encodeURIComponent(img.rel_path)}`;
        const encName = encodeURIComponent(img.name);

        html += `
          <div class="gallery-thumbnail-card" onclick="PocketVault.onGalleryItemClick(this)" data-url="${fullUrl}" data-name="${encName}">
            <img src="${thumbUrl}" loading="lazy" alt="${img.name}" />
          </div>
        `;
      });
      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load gallery.</div>';
    }
  },

  onGalleryItemClick(el) {
    const url = el.dataset.url || "";
    const name = decodeURIComponent(el.dataset.name || "");
    this.openLightbox(url, name);
  },

  openLightbox(url, caption) {
    this.vibrate(20);
    const box = document.getElementById("media-lightbox");
    const img = document.getElementById("lightbox-img");
    const cap = document.getElementById("lightbox-caption");
    if (!box) return;

    if (img) img.src = url;
    if (cap) cap.textContent = caption || "";
    box.style.display = "flex";
  },

  closeLightbox() {
    const box = document.getElementById("media-lightbox");
    if (box) box.style.display = "none";
  },

  // --------------------------------------------------------------------------
  // Video Streaming
  // --------------------------------------------------------------------------
  async loadVideos() {
    const list = document.getElementById("video-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning video clips...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=video");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No videos found</div>';
        return;
      }
      let html = "";
      data.results.forEach(v => {
        const encPath = encodeURIComponent(v.rel_path);
        const encName = encodeURIComponent(v.name);
        html += `
          <div class="file-row" onclick="PocketVault.onMediaClick(this)" data-root="${v.root_id || 0}" data-path="${encPath}" data-type="video" data-name="${encName}">
            <div class="file-icon-box" style="background:#dc2626;">🎬</div>
            <div class="file-info-col">
              <div class="file-name">${v.name}</div>
              <div class="file-meta">${v.size_human} • Stream (HTTP 206)</div>
            </div>
            <a href="/api/files/download?root_id=${v.root_id || 0}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load videos.</div>';
    }
  },

  // --------------------------------------------------------------------------
  // Documents
  // --------------------------------------------------------------------------
  async loadDocuments() {
    const list = document.getElementById("docs-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning documents...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=document");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No documents found</div>';
        return;
      }
      let html = "";
      data.results.forEach(doc => {
        const encPath = encodeURIComponent(doc.rel_path);
        html += `
          <div class="file-row" onclick="window.open('/api/files/download?root_id=${doc.root_id || 0}&path=${encPath}', '_blank')">
            <div class="file-icon-box" style="background:#2563eb;">📄</div>
            <div class="file-info-col">
              <div class="file-name">${doc.name}</div>
              <div class="file-meta">${doc.size_human} • Tap to view</div>
            </div>
            <a href="/api/files/download?root_id=${doc.root_id || 0}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load documents.</div>';
    }
  },

  // --------------------------------------------------------------------------
  // Music & Floating Mini Player
  // --------------------------------------------------------------------------
  async loadMusic() {
    const list = document.getElementById("music-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning audio tracks...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=audio");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No music found</div>';
        return;
      }
      let html = "";
      data.results.forEach(m => {
        const encPath = encodeURIComponent(m.rel_path);
        const encName = encodeURIComponent(m.name);
        html += `
          <div class="file-row" onclick="PocketVault.onMediaClick(this)" data-root="${m.root_id || 0}" data-path="${encPath}" data-type="audio" data-name="${encName}">
            <div class="file-icon-box" style="background:#059669;">🎵</div>
            <div class="file-info-col">
              <div class="file-name">${m.name}</div>
              <div class="file-meta">${m.size_human} • Audio Stream</div>
            </div>
            <a href="/api/files/download?root_id=${m.root_id || 0}&path=${encPath}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load music.</div>';
    }
  },

  onMediaClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    const type = el.dataset.type || "audio";
    const name = decodeURIComponent(el.dataset.name || "");
    this.playMediaStream(rootId, relPath, type, name);
  },

  playMediaStream(rootId, relPath, type, title) {
    this.vibrate(25);
    const streamUrl = `/api/files/stream?root_id=${rootId}&path=${encodeURIComponent(relPath)}`;

    if (type === "audio") {
      const audio = document.getElementById("global-audio-stream");
      const mini = document.getElementById("mini-music-player");
      const miniTitle = document.getElementById("mini-player-title");
      const playBtn = document.getElementById("mini-play-toggle");

      if (audio) {
        audio.src = streamUrl;
        audio.play().catch(() => {});
        if (mini) mini.style.display = "flex";
        if (miniTitle) miniTitle.textContent = title;
        if (playBtn) playBtn.textContent = "⏸";
        this.updateMediaSessionMetadata(title, "PocketVault Audio Stream");
      }
    } else if (type === "video") {
      const modal = document.getElementById("stream-player-modal");
      const video = document.getElementById("main-stream-video");
      const vTitle = document.getElementById("stream-video-title");

      if (video) {
        video.src = streamUrl;
        video.play().catch(() => {});
      }
      if (vTitle) vTitle.textContent = title;
      if (modal) modal.style.display = "flex";
    }
  },

  toggleAudioPlayback() {
    const audio = document.getElementById("global-audio-stream");
    const playBtn = document.getElementById("mini-play-toggle");
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      if (playBtn) playBtn.textContent = "⏸";
    } else {
      audio.pause();
      if (playBtn) playBtn.textContent = "▶";
    }
  },

  stopAudioPlayback() {
    const audio = document.getElementById("global-audio-stream");
    const mini = document.getElementById("mini-music-player");
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    if (mini) mini.style.display = "none";
  },

  closePlayerModal() {
    const modal = document.getElementById("stream-player-modal");
    const video = document.getElementById("main-stream-video");
    if (video) {
      video.pause();
      video.src = "";
    }
    if (modal) modal.style.display = "none";
  },

  setupMediaSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => this.toggleAudioPlayback());
      navigator.mediaSession.setActionHandler("pause", () => this.toggleAudioPlayback());
      navigator.mediaSession.setActionHandler("stop", () => this.stopAudioPlayback());
    }
  },

  updateMediaSessionMetadata(title, artist) {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: "PocketVault Mobile",
      });
    }
  },

  // --------------------------------------------------------------------------
  // Installed Apps Inventory (Android Package Inspector)
  // --------------------------------------------------------------------------
  async loadInstalledApps() {
    const container = document.getElementById("apps-list-container");
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning installed applications...</div>';

    try {
      const res = await fetch("/api/apps/list");
      const data = await res.json();
      if (!data.success || !data.apps || data.apps.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No third-party packages detected.</div>';
        return;
      }

      let html = "";
      data.apps.forEach(app => {
        html += `
          <div class="file-row">
            <div class="file-icon-box" style="background: rgba(168, 85, 247, 0.15); font-size:16px;">📱</div>
            <div class="file-info-col">
              <div class="file-name">${app.name}</div>
              <div class="file-meta">${app.package}</div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not list apps.</div>';
    }
  },

  // --------------------------------------------------------------------------
  // Wallpapers & Screen Capture Sync Picker
  // --------------------------------------------------------------------------
  async loadWallpaperPicker() {
    const grid = document.getElementById("wallpaper-grid-container");
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning shared screen devices...</div>';

    try {
      const res = await fetch("/api/wallpaper/list");
      const data = await res.json();
      if (!data.success) {
        grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load wallpapers.</div>';
        return;
      }

      let html = "";

      // System Screen Wallpapers
      if (data.system_screen && data.system_screen.exists) {
        html += `
          <div class="wallpaper-section-title">🖥️ Live Screen Wallpaper</div>
          <div class="wallpaper-grid-row">
            <div class="wallpaper-card" onclick="PocketVault.setSystemScreenWallpaper()">
              <img src="/api/wallpaper/system_screen?t=${Date.now()}" alt="Active Screen" />
              <div class="card-label">Active Host Wallpaper</div>
            </div>
          </div>
        `;
      }

      // Screen captures
      if (data.screen_captures && data.screen_captures.length > 0) {
        html += '<div class="wallpaper-section-title">📸 Shared Screen Captures</div><div class="wallpaper-grid-row">';
        data.screen_captures.forEach(sc => {
          const encPath = encodeURIComponent(sc.rel_path);
          html += `
            <div class="wallpaper-card" onclick="PocketVault.onWallpaperCardClick(this)" data-root="${sc.root_id}" data-path="${encPath}">
              <img src="/api/files/thumbnail?root_id=${sc.root_id}&path=${encPath}&size=300" alt="${sc.name}" />
              <div class="card-label">${sc.name}</div>
            </div>
          `;
        });
        html += '</div>';
      }

      // Wallpaper folder
      if (data.wallpapers && data.wallpapers.length > 0) {
        html += '<div class="wallpaper-section-title">🖼️ Wallpaper Library</div><div class="wallpaper-grid-row">';
        data.wallpapers.forEach(wp => {
          const encPath = encodeURIComponent(wp.rel_path);
          html += `
            <div class="wallpaper-card" onclick="PocketVault.onWallpaperCardClick(this)" data-root="${wp.root_id}" data-path="${encPath}">
              <img src="/api/files/thumbnail?root_id=${wp.root_id}&path=${encPath}&size=300" alt="${wp.name}" />
              <div class="card-label">${wp.name}</div>
            </div>
          `;
        });
        html += '</div>';
      }

      // Presets
      if (data.presets && data.presets.length > 0) {
        html += '<div class="wallpaper-section-title">✨ Galaxy & One UI Presets</div><div class="wallpaper-grid-row">';
        data.presets.forEach(p => {
          html += `
            <div class="wallpaper-preset-card" style="background:${p.gradient}" onclick="PocketVault.setPresetWallpaper('${p.id}', '${p.name}')">
              <div class="preset-name">${p.name}</div>
            </div>
          `;
        });
        html += '</div>';
      }

      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load wallpapers.</div>';
    }
  },

  onWallpaperCardClick(el) {
    const rootId = parseInt(el.dataset.root, 10);
    const relPath = decodeURIComponent(el.dataset.path || "");
    this.setCustomWallpaper(rootId, relPath);
  },

  async setSystemScreenWallpaper() {
    this.vibrate(25);
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ active_type: "system_screen" }),
    });
    await this.loadWallpaper();
  },

  async setPresetWallpaper(presetId, title) {
    this.vibrate(25);
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ preset_id: presetId }),
    });
    await this.loadWallpaper();
  },

  async setCustomWallpaper(rootId, relPath) {
    this.vibrate(25);
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ custom_rel_path: relPath, root_id: rootId }),
    });
    await this.loadWallpaper();
  },

  // --------------------------------------------------------------------------
  // Settings & QR
  // --------------------------------------------------------------------------
  async loadSettings() {
    try {
      const res = await fetch("/api/system/status");
      const data = await res.json();
      if (data.success) {
        const portEl = document.getElementById("setting-port");
        const envEl = document.getElementById("setting-env");
        const modeEl = document.getElementById("setting-mode");
        if (portEl) portEl.textContent = data.port || "8288";
        if (envEl) envEl.textContent = data.is_android ? "Android (Termux / Linux)" : data.platform;
        if (modeEl) modeEl.textContent = data.mode || "READ-ONLY v1.0";
      }
    } catch (e) {}
  },

  showQRCode() {
    alert(`Access PocketVault on any device:\n${window.location.origin}\nEnsure both phones or computers are on the same Wi-Fi.`);
  },

  setupEventListeners() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.onsubmit = (e) => {
        e.preventDefault();
        const user = document.getElementById("login-username").value.trim();
        const pass = document.getElementById("login-password").value.trim();
        this.handleLogin(user, pass);
      };
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  PocketVault.init();
});
