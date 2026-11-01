/**
 * PocketVault - Mobile OS Client Controller
 * Powers the Samsung One UI / Android style mobile experience with dynamic phone wallpaper.
 */

const PocketVault = {
  csrfToken: "",
  currentUser: null,
  activeWallpaper: null,
  activeSheet: null,
  currentRootId: 0,
  currentPath: "",
  sheetHistory: [],

  async init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
    this.initBattery();
    await this.loadWallpaper();
    await this.checkAuthStatus();
    this.setupEventListeners();
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
  // Battery Status API (Chrome / Android)
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
          if (battery.charging) {
            batteryIcon.textContent = "⚡";
          } else {
            batteryIcon.textContent = "🔋";
          }
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
  // Dynamic Phone Wallpaper Engine
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
    if (!backdrop) return;

    if (wp.type === "custom" && wp.url) {
      backdrop.style.backgroundImage = `url('${wp.url}')`;
      backdrop.style.filter = `blur(${wp.blur_level || 0}px)`;
    } else if (wp.gradient) {
      backdrop.style.backgroundImage = wp.gradient;
      backdrop.style.filter = "none";
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
      if (titleEl) titleEl.textContent = "Setup Administrator";
      if (subEl) subEl.textContent = "Create master password for PocketVault";
    } else {
      if (titleEl) titleEl.textContent = "PocketVault";
      if (subEl) subEl.textContent = "Enter password to access your phone storage";
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
      if (errBox) errBox.textContent = "Connection error to PocketVault server.";
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
  // Mobile App Sheets (Files, Gallery, Videos, Docs, Music, Apps, Settings)
  // --------------------------------------------------------------------------
  openApp(appName) {
    // Haptic feedback if supported
    if ("vibrate" in navigator) navigator.vibrate(25);

    const sheet = document.getElementById(`sheet-${appName}`);
    if (!sheet) return;

    if (this.activeSheet) {
      this.activeSheet.classList.remove("active");
    }

    sheet.classList.add("active");
    this.sheetHistory.push(this.activeSheet);
    this.activeSheet = sheet;

    // Trigger app load logic
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
    if ("vibrate" in navigator) navigator.vibrate(15);
    if (this.activeSheet) {
      this.activeSheet.classList.remove("active");
      this.activeSheet = this.sheetHistory.pop() || null;
      if (this.activeSheet) {
        this.activeSheet.classList.add("active");
      }
    }
  },

  goHome() {
    if ("vibrate" in navigator) navigator.vibrate(20);
    document.querySelectorAll(".mobile-app-sheet").forEach(s => s.classList.remove("active"));
    this.activeSheet = null;
    this.sheetHistory = [];
  },

  // --------------------------------------------------------------------------
  // My Files Explorer
  // --------------------------------------------------------------------------
  async loadDirectory(rootId = 0, relPath = "") {
    this.currentRootId = rootId;
    this.currentPath = relPath;
    const listContainer = document.getElementById("files-list-container");
    const breadcrumbs = document.getElementById("files-breadcrumbs");
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning phone files...</div>';

    try {
      const res = await fetch(`/api/files?root=${rootId}&path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (!data.success) {
        listContainer.innerHTML = `<div style="color:#f43f5e; padding:20px;">${data.error}</div>`;
        return;
      }

      // Render Breadcrumbs
      if (breadcrumbs) {
        breadcrumbs.innerHTML = "";
        const rootBadge = document.createElement("span");
        rootBadge.className = "crumb-item";
        rootBadge.textContent = data.root_name || "Storage";
        rootBadge.onclick = () => this.loadDirectory(rootId, "");
        breadcrumbs.appendChild(rootBadge);

        if (data.breadcrumbs && data.breadcrumbs.length > 0) {
          data.breadcrumbs.forEach(cr => {
            const sep = document.createElement("span");
            sep.textContent = " / ";
            sep.style.color = "#64748b";
            breadcrumbs.appendChild(sep);

            const item = document.createElement("span");
            item.className = "crumb-item";
            item.textContent = cr.name;
            item.onclick = () => this.loadDirectory(rootId, cr.path);
            breadcrumbs.appendChild(item);
          });
        }
      }

      // Render Entries
      if (!data.entries || data.entries.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Folder is empty</div>';
        return;
      }

      let html = "";
      data.entries.forEach(entry => {
        const icon = entry.is_dir ? "📁" : this.getFileIcon(entry.category);
        const clickAction = entry.is_dir
          ? `PocketVault.loadDirectory(${rootId}, '${entry.rel_path.replace(/'/g, "\\'")}')`
          : `PocketVault.handleFileClick(${rootId}, '${entry.rel_path.replace(/'/g, "\\'")}', '${entry.category}', '${entry.name.replace(/'/g, "\\'")}')`;

        html += `
          <div class="file-row" onclick="${clickAction}">
            <div class="file-icon-box">${icon}</div>
            <div class="file-info-col">
              <div class="file-name">${entry.name}</div>
              <div class="file-meta">${entry.is_dir ? "Folder" : entry.size_human} • ${entry.modified_str}</div>
            </div>
            <div class="file-actions">
              ${!entry.is_dir ? `<a href="/api/download?root=${rootId}&path=${encodeURIComponent(entry.rel_path)}" download class="file-dl-btn" onclick="event.stopPropagation()">⬇️</a>` : ""}
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    } catch (e) {
      listContainer.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load files.</div>';
    }
  },

  getFileIcon(cat) {
    switch (cat) {
      case "image": return "🖼️";
      case "video": return "🎬";
      case "audio": return "🎵";
      case "pdf": return "📕";
      case "document": return "📄";
      case "spreadsheet": return "📊";
      case "presentation": return "📽️";
      case "archive": return "📦";
      default: return "📄";
    }
  },

  handleFileClick(rootId, relPath, category, name) {
    if (category === "image") {
      this.showLightbox(`/api/download?root=${rootId}&path=${encodeURIComponent(relPath)}`, name);
    } else if (category === "video" || category === "audio") {
      this.playMediaStream(rootId, relPath, category, name);
    } else {
      window.open(`/api/download?root=${rootId}&path=${encodeURIComponent(relPath)}`, "_blank");
    }
  },

  // --------------------------------------------------------------------------
  // Gallery & Media Lightbox
  // --------------------------------------------------------------------------
  async loadGallery() {
    const grid = document.getElementById("gallery-grid-container");
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Loading photos...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=image");
      const data = await res.json();
      if (!data.success || !data.results || data.results.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No photos found</div>';
        return;
      }

      let html = "";
      data.results.forEach(img => {
        const thumbUrl = `/api/thumbnail?root=${img.root_id || 0}&path=${encodeURIComponent(img.rel_path)}`;
        const fullUrl = `/api/download?root=${img.root_id || 0}&path=${encodeURIComponent(img.rel_path)}`;
        html += `
          <div class="gallery-thumb-item" onclick="PocketVault.showLightbox('${fullUrl}', '${img.name.replace(/'/g, "\\'")}')">
            <img src="${thumbUrl}" loading="lazy" alt="${img.name}" />
          </div>
        `;
      });
      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load gallery photos.</div>';
    }
  },

  showLightbox(src, title) {
    const box = document.getElementById("media-lightbox");
    const img = document.getElementById("lightbox-img");
    const caption = document.getElementById("lightbox-caption");
    if (!box || !img) return;

    img.src = src;
    if (caption) caption.textContent = title;
    box.style.display = "flex";
  },

  closeLightbox() {
    const box = document.getElementById("media-lightbox");
    if (box) box.style.display = "none";
  },

  // --------------------------------------------------------------------------
  // Video Player with HTTP 206 Streaming
  // --------------------------------------------------------------------------
  async loadVideos() {
    const list = document.getElementById("video-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Searching videos...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=video");
      const data = await res.json();
      if (!data.success || !data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No videos found</div>';
        return;
      }

      let html = "";
      data.results.forEach(v => {
        html += `
          <div class="file-row" onclick="PocketVault.playMediaStream(${v.root_id || 0}, '${v.rel_path.replace(/'/g, "\\'")}', 'video', '${v.name.replace(/'/g, "\\'")}')">
            <div class="file-icon-box" style="background:#be123c;">🎬</div>
            <div class="file-info-col">
              <div class="file-name">${v.name}</div>
              <div class="file-meta">${v.size_human} • Tap to Stream</div>
            </div>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {
      list.innerHTML = '<div style="color:#f43f5e; padding:20px;">Could not load videos.</div>';
    }
  },

  playMediaStream(rootId, relPath, category, title) {
    const playerModal = document.getElementById("stream-player-modal");
    const videoEl = document.getElementById("main-stream-video");
    const titleEl = document.getElementById("stream-video-title");
    if (!playerModal || !videoEl) return;

    const streamUrl = `/stream?root=${rootId}&path=${encodeURIComponent(relPath)}`;
    videoEl.src = streamUrl;
    if (titleEl) titleEl.textContent = title;
    playerModal.style.display = "flex";
    videoEl.play();
  },

  closePlayerModal() {
    const playerModal = document.getElementById("stream-player-modal");
    const videoEl = document.getElementById("main-stream-video");
    if (videoEl) {
      videoEl.pause();
      videoEl.src = "";
    }
    if (playerModal) playerModal.style.display = "none";
  },

  // --------------------------------------------------------------------------
  // Documents & Music Loaders
  // --------------------------------------------------------------------------
  async loadDocuments() {
    const list = document.getElementById("docs-list-container");
    if (!list) return;
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Searching documents...</div>';

    try {
      const res = await fetch("/api/files/search?query=.&category=document");
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No documents found</div>';
        return;
      }
      let html = "";
      data.results.forEach(d => {
        html += `
          <div class="file-row" onclick="window.open('/api/download?root=${d.root_id || 0}&path=${encodeURIComponent(d.rel_path)}', '_blank')">
            <div class="file-icon-box" style="background:#1d4ed8;">📄</div>
            <div class="file-info-col">
              <div class="file-name">${d.name}</div>
              <div class="file-meta">${d.size_human} • ${d.extension.toUpperCase()}</div>
            </div>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {}
  },

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
              <div class="file-meta">${m.size_human} • Stream</div>
            </div>
          </div>
        `;
      });
      list.innerHTML = html;
    } catch (e) {}
  },

  // --------------------------------------------------------------------------
  // Installed Apps Inventory
  // --------------------------------------------------------------------------
  async loadInstalledApps() {
    const container = document.getElementById("apps-list-container");
    if (!container) return;
    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Scanning installed phone apps...</div>';

    try {
      const res = await fetch("/api/apps/list");
      const data = await res.json();
      if (!data.success || !data.apps || data.apps.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:#64748b;">No applications detected.</div>';
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
  // Wallpaper Picker
  // --------------------------------------------------------------------------
  async loadWallpaperPicker() {
    const grid = document.getElementById("wallpaper-grid-container");
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8;">Loading wallpapers...</div>';

    try {
      const res = await fetch("/api/wallpaper/list");
      const data = await res.json();
      if (!data.success) return;

      let html = '<div style="font-size:13px; font-weight:700; color:#94a3b8; margin:10px 0;">S24 FE / AMOLED PRESETS</div><div class="wallpaper-preset-grid">';

      data.presets.forEach(p => {
        html += `
          <div class="wallpaper-card" style="background:${p.gradient}" onclick="PocketVault.setPresetWallpaper('${p.id}')">
            <span>${p.title}</span>
          </div>
        `;
      });
      html += "</div>";

      if (data.device_photos && data.device_photos.length > 0) {
        html += '<div style="font-size:13px; font-weight:700; color:#94a3b8; margin:20px 0 10px 0;">PHONE CAMERA & PICTURES</div><div class="wallpaper-photo-grid">';
        data.device_photos.forEach(ph => {
          html += `
            <div class="wallpaper-card-img" onclick="PocketVault.setCustomWallpaper(${ph.root_id}, '${ph.rel_path.replace(/'/g, "\\'")}')">
              <img src="${ph.thumbnail_url || ph.url}" loading="lazy" />
            </div>
          `;
        });
        html += "</div>";
      }

      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div style="color:#f43f5e; padding:20px;">Failed to load wallpapers.</div>';
    }
  },

  async setPresetWallpaper(presetId) {
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ preset_id: presetId }),
    });
    await this.loadWallpaper();
    alert("Wallpaper updated!");
  },

  async setCustomWallpaper(rootId, relPath) {
    await fetch("/api/wallpaper/set", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": this.csrfToken },
      body: JSON.stringify({ custom_rel_path: relPath, root_id: rootId }),
    });
    await this.loadWallpaper();
    alert("Phone photo set as active wallpaper!");
  },

  // --------------------------------------------------------------------------
  // Settings & QR Code
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
    alert(`Connect to: ${window.location.origin}\nEnsure both devices are on the same Wi-Fi.`);
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

