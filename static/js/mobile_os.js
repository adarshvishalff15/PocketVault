/**
 * PocketVault - Mobile OS Client Controller (v2.0)
 * Powers the Samsung One UI / Android style mobile experience with dynamic screen wallpaper
 * auto-fetching from shared devices, live widgets, and quick settings control center.
 */

const PocketVault = {
  csrfToken: "",
  currentUser: null,
  activeWallpaper: null,
  activeSheet: null,
  currentRootId: 0,
  currentPath: "",
  sheetHistory: [],
  searchDebounceTimer: null,
  autoFetchEnabled: true,
  displayMode: "phone", // 'phone' or 'wide'

  async init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.initBattery();
    this.initDisplayMode();
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
        batteryText.textContent = "88%";
      }
    } else {
      batteryText.textContent = "88%";
    }
  },

  // --------------------------------------------------------------------------
  // Display Mode Switcher (Phone Frame vs Wide Tablet View)
  // --------------------------------------------------------------------------
  initDisplayMode() {
    const saved = localStorage.getItem("pv_display_mode") || "phone";
    this.setDisplayMode(saved);
  },

  setDisplayMode(mode) {
    this.displayMode = mode;
    localStorage.setItem("pv_display_mode", mode);
    const viewport = document.getElementById("mobile-viewport");
    const label = document.getElementById("display-mode-label");
    const settingLabel = document.getElementById("setting-display-mode");

    if (viewport) {
      if (mode === "wide") {
        viewport.classList.add("wide-mode");
        if (label) label.textContent = "Expanded Wide";
        if (settingLabel) settingLabel.textContent = "Expanded Tablet Mode (Click to toggle)";
      } else {
        viewport.classList.remove("wide-mode");
        if (label) label.textContent = "Phone Frame";
        if (settingLabel) settingLabel.textContent = "Phone Frame (Click to toggle)";
      }
    }
  },

  toggleDisplayMode() {
    this.vibrate(20);
    const newMode = this.displayMode === "phone" ? "wide" : "phone";
    this.setDisplayMode(newMode);
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
      if (subEl) subEl.textContent = "Enter password to access device storage";
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
    if (errBox) errBox.textContent = "";

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
        this.loadDirectory(this.currentRootId, this.currentPath);
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

          html += `
            <div class="file-row" onclick="PocketVault.handleSearchItemClick(${f.root_id || 0}, '${f.rel_path.replace(/'/g, "\\'")}', '${f.category}', '${f.name.replace(/'/g, "\\'")}')">
              <div class="file-icon-box" style="background: rgba(56, 189, 248, 0.15);">${icon}</div>
              <div class="file-info-col">
                <div class="file-name">${f.name}</div>
                <div class="file-meta">${f.size_human} • ${f.root_name || "Storage"}</div>
              </div>
              <a href="/api/files/download?root_id=${f.root_id || 0}&path=${encodeURIComponent(f.rel_path)}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
            </div>
          `;
        });
        container.innerHTML = html;
      } catch (e) {
        container.innerHTML = '<div style="color:#f43f5e; padding:20px;">Search failed.</div>';
      }
    }, 280);
  },

  handleSearchItemClick(rootId, relPath, category, name) {
    if (category === "image") {
      this.openLightbox(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, name);
    } else if (category === "audio") {
      this.playMediaStream(rootId, relPath, "audio", name);
    } else if (category === "video") {
      this.playMediaStream(rootId, relPath, "video", name);
    } else {
      window.open(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, "_blank");
    }
  },

  // --------------------------------------------------------------------------
  // File Explorer & Storage Roots
  // --------------------------------------------------------------------------
  async refreshFiles() {
    await this.loadDirectory(this.currentRootId, this.currentPath);
  },

  async loadDirectory(rootId, path) {
    this.currentRootId = rootId;
    this.currentPath = path || "";

    const list = document.getElementById("files-list-container");
    const bc = document.getElementById("files-breadcrumbs");
    if (!list) return;

    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Reading storage...</div>';

    try {
      const res = await fetch(`/api/files/list?root_id=${rootId}&path=${encodeURIComponent(this.currentPath)}`);
      const data = await res.json();
      if (!data.success) {
        list.innerHTML = `<div style="color:#f43f5e; padding:20px;">${data.error || "Cannot access folder"}</div>`;
        return;
      }

      this.renderBreadcrumbs(bc, data.breadcrumbs, rootId);

      if ((!data.directories || data.directories.length === 0) && (!data.files || data.files.length === 0)) {
        list.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Folder is empty</div>';
        return;
      }

      let html = "";
      (data.directories || []).forEach(d => {
        html += `
          <div class="file-row" onclick="PocketVault.loadDirectory(${rootId}, '${d.rel_path.replace(/'/g, "\\'")}')">
            <div class="file-icon-box" style="background:#0284c7;">📁</div>
            <div class="file-info-col">
              <div class="file-name">${d.name}</div>
              <div class="file-meta">Folder • ${d.modified_human || ""}</div>
            </div>
          </div>
        `;
      });

      (data.files || []).forEach(f => {
        const isImg = f.category === "image";
        const isAud = f.category === "audio";
        const isVid = f.category === "video";
        let icon = "📄";
        if (isImg) icon = "🖼️";
        if (isAud) icon = "🎵";
        if (isVid) icon = "🎬";

        html += `
          <div class="file-row" onclick="PocketVault.handleFileClick(${rootId}, '${f.rel_path.replace(/'/g, "\\'")}', '${f.category}', '${f.name.replace(/'/g, "\\'")}')">
            <div class="file-icon-box" style="background: rgba(255,255,255,0.08);">${icon}</div>
            <div class="file-info-col">
              <div class="file-name">${f.name}</div>
              <div class="file-meta">${f.size_human} • ${f.modified_human || ""}</div>
            </div>
            <a href="/api/files/download?root_id=${rootId}&path=${encodeURIComponent(f.rel_path)}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });

      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load files.</div>';
    }
  },

  renderBreadcrumbs(el, crumbs, rootId) {
    if (!el || !crumbs) return;
    let html = `<span class="crumb-item" onclick="PocketVault.loadDirectory(${rootId}, '')">Roots</span>`;
    crumbs.forEach(c => {
      html += ` <span style="opacity:0.4;">›</span> <span class="crumb-item" onclick="PocketVault.loadDirectory(${rootId}, '${c.path.replace(/'/g, "\\'")}')">${c.name}</span>`;
    });
    el.innerHTML = html;
  },

  handleFileClick(rootId, relPath, category, name) {
    if (category === "image") {
      this.openLightbox(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, name);
    } else if (category === "audio") {
      this.playMediaStream(rootId, relPath, "audio", name);
    } else if (category === "video") {
      this.playMediaStream(rootId, relPath, "video", name);
    } else {
      window.open(`/api/files/download?root_id=${rootId}&path=${encodeURIComponent(relPath)}`, "_blank");
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
        html += `
          <div class="gallery-thumbnail-card" onclick="PocketVault.openLightbox('${fullUrl}', '${img.name.replace(/'/g, "\\'")}')">
            <img src="${thumbUrl}" loading="lazy" alt="${img.name}" />
          </div>
        `;
      });
      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load gallery.</div>';
    }
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
        html += `
          <div class="file-row" onclick="PocketVault.playMediaStream(${v.root_id || 0}, '${v.rel_path.replace(/'/g, "\\'")}', 'video', '${v.name.replace(/'/g, "\\'")}')">
            <div class="file-icon-box" style="background:#dc2626;">🎬</div>
            <div class="file-info-col">
              <div class="file-name">${v.name}</div>
              <div class="file-meta">${v.size_human} • Stream (HTTP 206)</div>
            </div>
            <a href="/api/files/download?root_id=${v.root_id || 0}&path=${encodeURIComponent(v.rel_path)}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {}
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
        html += `
          <div class="file-row" onclick="window.open('/api/files/download?root_id=${doc.root_id || 0}&path=${encodeURIComponent(doc.rel_path)}', '_blank')">
            <div class="file-icon-box" style="background:#2563eb;">📄</div>
            <div class="file-info-col">
              <div class="file-name">${doc.name}</div>
              <div class="file-meta">${doc.size_human} • Tap to view</div>
            </div>
            <a href="/api/files/download?root_id=${doc.root_id || 0}&path=${encodeURIComponent(doc.rel_path)}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {}
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
        html += `
          <div class="file-row" onclick="PocketVault.playMediaStream(${m.root_id || 0}, '${m.rel_path.replace(/'/g, "\\'")}', 'audio', '${m.name.replace(/'/g, "\\'")}')">
            <div class="file-icon-box" style="background:#059669;">🎵</div>
            <div class="file-info-col">
              <div class="file-name">${m.name}</div>
              <div class="file-meta">${m.size_human} • Audio Stream</div>
            </div>
            <a href="/api/files/download?root_id=${m.root_id || 0}&path=${encodeURIComponent(m.rel_path)}" class="file-dl-btn" download onclick="event.stopPropagation()">↓</a>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {}
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
        audio.play();
        if (mini) mini.style.display = "flex";
        if (miniTitle) miniTitle.textContent = title || "Audio Track";
        if (playBtn) playBtn.textContent = "⏸";

        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: title || "Audio Track",
            artist: "PocketVault Mobile Server",
            album: "Personal Cloud Stream",
          });
        }
      }
    } else {
      // Video
      const modal = document.getElementById("stream-player-modal");
      const video = document.getElementById("main-stream-video");
      const headerTitle = document.getElementById("stream-video-title");

      if (modal && video) {
        video.src = streamUrl;
        if (headerTitle) headerTitle.textContent = title || "Video Stream";
        modal.style.display = "flex";
        video.play();
      }
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

  setupMediaSession() {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => this.toggleAudioPlayback());
      navigator.mediaSession.setActionHandler("pause", () => this.toggleAudioPlayback());
      navigator.mediaSession.setActionHandler("stop", () => this.stopAudioPlayback());
    }
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

  // --------------------------------------------------------------------------
  // Installed Apps Inventory
  // --------------------------------------------------------------------------
  async loadInstalledApps() {
    const container = document.getElementById("apps-list-container");
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning installed applications...</div>';

    try {
      const res = await fetch("/api/apps/list");
      const data = await res.json();
      if (!data.success || !data.apps || data.apps.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No packages detected.</div>';
        return;
      }

      let html = "";
      data.apps.forEach(app => {
        html += `
          <div class="file-row">
            <div class="file-icon-box" style="background: linear-gradient(135deg, #6366f1, #4338ca);">📱</div>
            <div class="file-info-col">
              <div class="file-name">${app.display_name}</div>
              <div class="file-meta">${app.package_name} • ${app.size_human}</div>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load apps list.</div>';
    }
  },

  // --------------------------------------------------------------------------
  // Wallpaper & Shared Screen Sync Center
  // --------------------------------------------------------------------------
  async loadWallpaperPicker() {
    const grid = document.getElementById("wallpaper-grid-container");
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Discovering device screens & wallpapers...</div>';

    try {
      const res = await fetch("/api/wallpaper/list");
      const data = await res.json();
      if (!data.success) return;

      this.updateAutoFetchUI(data.auto_fetch);

      let html = "";

      // 1. Host Active Device Screen Wallpaper (Live Desktop / Phone Wallpaper)
      if (data.system_screen) {
        html += `
          <div class="wallpaper-section-header">
            <span class="wallpaper-section-title">🌟 Live Device Screen</span>
            <span class="wallpaper-count-badge">System Desktop / Phone</span>
          </div>
          <div class="wallpaper-grid">
            <div class="wallpaper-card" onclick="PocketVault.setSystemScreenWallpaper()">
              <img src="${data.system_screen.url}" loading="lazy" alt="Active Device Screen" />
              <div class="wallpaper-badge live-screen">LIVE SCREEN</div>
              <div class="wallpaper-card-title">${data.system_screen.title}</div>
            </div>
          </div>
        `;
      }

      // 2. Shared Screen Devices & Screenshots (auto-fetched from connected devices)
      if (data.screen_captures && data.screen_captures.length > 0) {
        html += `
          <div class="wallpaper-section-header">
            <span class="wallpaper-section-title">📱 Shared Screen Captures & Devices</span>
            <span class="wallpaper-count-badge">${data.screen_captures.length} captured</span>
          </div>
          <div class="wallpaper-grid">
        `;
        data.screen_captures.forEach(sc => {
          html += `
            <div class="wallpaper-card" onclick="PocketVault.setCustomWallpaper(${sc.root_id}, '${sc.rel_path.replace(/'/g, "\\'")}', '${sc.filename.replace(/'/g, "\\'")}')">
              <img src="${sc.thumbnail_url || sc.url}" loading="lazy" alt="${sc.filename}" />
              <div class="wallpaper-badge screenshot">SCREENSHOT</div>
              <div class="wallpaper-card-title">${sc.filename}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      // 3. Wallpapers & Windows Spotlight
      if (data.wallpapers && data.wallpapers.length > 0) {
        html += `
          <div class="wallpaper-section-header">
            <span class="wallpaper-section-title">🖼️ Screen Wallpapers & 4K Assets</span>
            <span class="wallpaper-count-badge">${data.wallpapers.length} items</span>
          </div>
          <div class="wallpaper-grid">
        `;
        data.wallpapers.forEach(wp => {
          const badgeClass = wp.is_spotlight ? "spotlight" : "screenshot";
          const badgeLabel = wp.is_spotlight ? "4K SPOTLIGHT" : "WALLPAPER";
          html += `
            <div class="wallpaper-card" onclick="PocketVault.setCustomWallpaper(${wp.root_id}, '${wp.rel_path.replace(/'/g, "\\'")}', '${wp.filename.replace(/'/g, "\\'")}')">
              <img src="${wp.thumbnail_url || wp.url}" loading="lazy" alt="${wp.filename}" />
              <div class="wallpaper-badge ${badgeClass}">${badgeLabel}</div>
              <div class="wallpaper-card-title">${wp.filename}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      // 4. Samsung One UI / AMOLED Presets
      if (data.presets && data.presets.length > 0) {
        html += `
          <div class="wallpaper-section-header">
            <span class="wallpaper-section-title">🎨 One UI & AMOLED Presets</span>
            <span class="wallpaper-count-badge">Samsung S24 FE</span>
          </div>
          <div class="wallpaper-grid">
        `;
        data.presets.forEach(p => {
          html += `
            <div class="wallpaper-preset-card" style="background:${p.gradient}" onclick="PocketVault.setPresetWallpaper('${p.id}', '${p.title.replace(/'/g, "\\'")}')">
              <span>${p.title}</span>
            </div>
          `;
        });
        html += `</div>`;
      }

      // 5. Camera Photos & Gallery
      if (data.camera_photos && data.camera_photos.length > 0) {
        html += `
          <div class="wallpaper-section-header">
            <span class="wallpaper-section-title">📷 Camera Roll & Photos</span>
            <span class="wallpaper-count-badge">${data.camera_photos.length} photos</span>
          </div>
          <div class="wallpaper-grid">
        `;
        data.camera_photos.forEach(ph => {
          html += `
            <div class="wallpaper-card" onclick="PocketVault.setCustomWallpaper(${ph.root_id}, '${ph.rel_path.replace(/'/g, "\\'")}', '${ph.filename.replace(/'/g, "\\'")}')">
              <img src="${ph.thumbnail_url || ph.url}" loading="lazy" alt="${ph.filename}" />
              <div class="wallpaper-card-title">${ph.filename}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load wallpapers.</div>';
    }
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

  async setCustomWallpaper(rootId, relPath, filename) {
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
