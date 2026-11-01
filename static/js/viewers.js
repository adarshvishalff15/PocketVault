/**
 * Windows 11 Specialized Viewers & Media Players.
 * Includes HTML5 Audio/Video with byte-range streaming, MediaSession API,
 * structured DOCX, PPTX slide decks, XLSX/CSV grids, PDF, Code/Text, and ZIP inspection.
 */

// ─── Windows 11 Specialized Media Players ────────────────────────────
function formatMediaTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const mm = m < 10 ? "0" + m : "" + m;
  const ss = s < 10 ? "0" + s : "" + s;
  return `${mm}:${ss}`;
}

const MEDIA_ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  skipBack: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>`,
  skipFwd: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
  volHigh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>`,
  volMute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>`,
  pip: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor"/></svg>`,
  musicNote: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  videoCamera: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="15 8 20 5 20 19 15 16 15 8"/><rect x="4" y="6" width="11" height="12" rx="2"/></svg>`
};

// ─── 1. WINDOWS MUSIC PLAYER (AUDIO) ─────────────────────────
function openMusicPlayer(rootId = 0, relPath = "", filename = "Windows Media Player") {
  const streamUrl = relPath ? `/stream?root=${rootId}&path=${encodeURIComponent(relPath)}` : "";
  const downloadUrl = relPath ? `/download?root=${rootId}&path=${encodeURIComponent(relPath)}` : "#";
  const displayName = filename || "Windows Media Player";

  // If music player is already open, smoothly load new track and bring to front
  if (AppState.windows && AppState.windows["music-player"]) {
    const winObj = AppState.windows["music-player"];
    WindowManager.bringToFront("music-player");
    if (winObj.minimized) WindowManager.restoreWindow("music-player");

    winObj.title = displayName;
    const titleText = winObj.el.querySelector(".win-title-text");
    if (titleText) titleText.textContent = displayName;

    const topFilename = winObj.el.querySelector(".win-player-top-filename");
    if (topFilename) {
      topFilename.textContent = displayName;
      topFilename.title = displayName;
    }

    const trackTitle = winObj.el.querySelector(".win-music-track-title");
    if (trackTitle) trackTitle.textContent = displayName;

    const dlBtn = winObj.el.querySelector(".win-player-dl-btn");
    if (dlBtn) dlBtn.href = downloadUrl;

    const audio = winObj.el.querySelector("#music-media-el");
    if (audio && streamUrl) {
      audio.src = streamUrl;
      audio.load();
      audio.play().catch(() => {});
    }
    return winObj;
  }

  const content = `
    <div class="win-player-container">
      <!-- Prominent Top Bar: File Name is shown AT THE TOP -->
      <div class="win-player-topbar">
        <div class="win-player-top-left">
          <div class="win-player-badge-icon music">${MEDIA_ICONS.musicNote}</div>
          <div class="win-player-top-info">
            <div class="win-player-top-filename" title="${displayName}">${displayName}</div>
            <div class="win-player-top-appname">Windows Media Player • Audio Stream</div>
          </div>
        </div>
        <div class="win-player-top-actions">
          <select class="win-player-speed-select" id="music-speed-select" title="Playback speed">
            <option value="0.75">0.75x</option>
            <option value="1.0" selected>1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
          <a class="win-player-dl-btn" href="${downloadUrl}" download title="Download song">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download</span>
          </a>
        </div>
      </div>

      <!-- Music Visualizer & Vinyl Disk Canvas -->
      <div class="win-music-canvas">
        <div class="win-vinyl-disk" id="music-vinyl-disk">
          <div class="win-vinyl-center">
            ${MEDIA_ICONS.musicNote}
          </div>
        </div>
        <div class="win-music-meta">
          <div class="win-music-track-title">${displayName}</div>
          <div class="win-music-track-artist">Windows Media Player</div>
        </div>
        <audio id="music-media-el" src="${streamUrl}" preload="metadata" playsinline></audio>
      </div>

      <!-- Windows 11 Player Media Controls Bar -->
      <div class="win-player-controls-bar">
        <div class="win-player-scrub-row">
          <span class="win-player-time" id="music-cur-time">00:00</span>
          <input type="range" class="win-player-slider" id="music-scrub-bar" min="0" max="100" value="0" step="0.1" />
          <span class="win-player-time" id="music-total-time">--:--</span>
        </div>

        <div class="win-player-buttons-row">
          <div class="win-player-btns-left">
            <button class="win-player-icon-btn" id="music-repeat-btn" title="Repeat (Off)">
              ${MEDIA_ICONS.repeat}
            </button>
          </div>

          <div class="win-player-btns-center">
            <button class="win-player-icon-btn" id="music-skip-back-btn" title="Skip -10s">
              ${MEDIA_ICONS.skipBack}
            </button>
            <button class="win-player-play-btn" id="music-play-btn" title="Play">
              ${MEDIA_ICONS.play}
            </button>
            <button class="win-player-icon-btn" id="music-skip-fwd-btn" title="Skip +10s">
              ${MEDIA_ICONS.skipFwd}
            </button>
          </div>

          <div class="win-player-btns-right">
            <div class="win-player-vol-wrap">
              <button class="win-player-icon-btn" id="music-mute-btn" title="Mute">
                ${MEDIA_ICONS.volHigh}
              </button>
              <input type="range" class="win-player-vol-slider" id="music-vol-slider" min="0" max="1" step="0.05" value="1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return WindowManager.createWindow(
    "music-player",
    displayName,
    `<div style="width:20px;height:20px;color:#ec4899;">${MEDIA_ICONS.musicNote}</div>`,
    content,
    {
      width: 520,
      height: 480,
      onInit: (win) => {
        const audio       = win.querySelector("#music-media-el");
        const vinyl       = win.querySelector("#music-vinyl-disk");
        const playBtn     = win.querySelector("#music-play-btn");
        const scrub       = win.querySelector("#music-scrub-bar");
        const curTime     = win.querySelector("#music-cur-time");
        const totalTime   = win.querySelector("#music-total-time");
        const skipBack    = win.querySelector("#music-skip-back-btn");
        const skipFwd     = win.querySelector("#music-skip-fwd-btn");
        const repeatBtn   = win.querySelector("#music-repeat-btn");
        const muteBtn     = win.querySelector("#music-mute-btn");
        const volSlider   = win.querySelector("#music-vol-slider");
        const speedSelect = win.querySelector("#music-speed-select");

        let isSeeking = false;

        const updatePlayState = (isPlaying) => {
          if (isPlaying) {
            vinyl?.classList.add("playing");
            playBtn && (playBtn.innerHTML = MEDIA_ICONS.pause);
            playBtn && (playBtn.title = "Pause");
          } else {
            vinyl?.classList.remove("playing");
            playBtn && (playBtn.innerHTML = MEDIA_ICONS.play);
            playBtn && (playBtn.title = "Play");
          }
        };

        playBtn?.addEventListener("click", () => {
          if (!audio) return;
          if (audio.paused) {
            audio.play().catch(() => {});
          } else {
            audio.pause();
          }
        });

        audio?.addEventListener("play", () => updatePlayState(true));
        audio?.addEventListener("pause", () => updatePlayState(false));

        audio?.addEventListener("loadedmetadata", () => {
          if (totalTime && audio.duration) {
            totalTime.textContent = formatMediaTime(audio.duration);
          }
        });

        audio?.addEventListener("timeupdate", () => {
          if (!audio.duration || isSeeking) return;
          const pct = (audio.currentTime / audio.duration) * 100;
          if (scrub) scrub.value = pct;
          if (curTime) curTime.textContent = formatMediaTime(audio.currentTime);
          if (totalTime && totalTime.textContent === "--:--") {
            totalTime.textContent = formatMediaTime(audio.duration);
          }
        });

        scrub?.addEventListener("input", () => {
          isSeeking = true;
          if (audio && audio.duration) {
            const time = (parseFloat(scrub.value) / 100) * audio.duration;
            if (curTime) curTime.textContent = formatMediaTime(time);
          }
        });

        scrub?.addEventListener("change", () => {
          if (audio && audio.duration) {
            audio.currentTime = (parseFloat(scrub.value) / 100) * audio.duration;
          }
          isSeeking = false;
        });

        skipBack?.addEventListener("click", () => {
          if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
        });

        skipFwd?.addEventListener("click", () => {
          if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
        });

        repeatBtn?.addEventListener("click", () => {
          if (!audio) return;
          audio.loop = !audio.loop;
          repeatBtn.classList.toggle("active", audio.loop);
          repeatBtn.title = audio.loop ? "Repeat (On)" : "Repeat (Off)";
        });

        volSlider?.addEventListener("input", (e) => {
          if (!audio) return;
          audio.volume = parseFloat(e.target.value);
          audio.muted = audio.volume === 0;
          muteBtn && (muteBtn.innerHTML = audio.muted ? MEDIA_ICONS.volMute : MEDIA_ICONS.volHigh);
        });

        muteBtn?.addEventListener("click", () => {
          if (!audio) return;
          audio.muted = !audio.muted;
          muteBtn.innerHTML = audio.muted ? MEDIA_ICONS.volMute : MEDIA_ICONS.volHigh;
        });

        speedSelect?.addEventListener("change", (e) => {
          if (audio) audio.playbackRate = parseFloat(e.target.value);
        });

        // MediaSession background playback
        if ("mediaSession" in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: displayName,
            artist: "Windows Media Player",
            album: "Laptop Audio Stream",
          });
        }

        // Start playing automatically
        if (streamUrl && audio) {
          audio.play().catch(() => {});
        }
      },
    }
  );
}

// ─── 2. WINDOWS VIDEO PLAYER (FILMS & TV / DEFAULT VIDEO) ────
function openVideoPlayer(rootId = 0, relPath = "", filename = "Video Player") {
  const streamUrl = relPath ? `/stream?root=${rootId}&path=${encodeURIComponent(relPath)}` : "";
  const downloadUrl = relPath ? `/download?root=${rootId}&path=${encodeURIComponent(relPath)}` : "#";
  const displayName = filename || "Video Player";

  // If video player is already open, smoothly load new video and bring to front
  if (AppState.windows && AppState.windows["video-player"]) {
    const winObj = AppState.windows["video-player"];
    WindowManager.bringToFront("video-player");
    if (winObj.minimized) WindowManager.restoreWindow("video-player");

    winObj.title = displayName;
    const titleText = winObj.el.querySelector(".win-title-text");
    if (titleText) titleText.textContent = displayName;

    const topFilename = winObj.el.querySelector(".win-player-top-filename");
    if (topFilename) {
      topFilename.textContent = displayName;
      topFilename.title = displayName;
    }

    const dlBtn = winObj.el.querySelector(".win-player-dl-btn");
    if (dlBtn) dlBtn.href = downloadUrl;

    const video = winObj.el.querySelector("#video-media-el");
    if (video && streamUrl) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
    }
    return winObj;
  }

  const content = `
    <div class="win-player-container">
      <!-- Prominent Top Bar: File Name is shown AT THE TOP -->
      <div class="win-player-topbar">
        <div class="win-player-top-left">
          <div class="win-player-badge-icon video">${MEDIA_ICONS.videoCamera}</div>
          <div class="win-player-top-info">
            <div class="win-player-top-filename" title="${displayName}">${displayName}</div>
            <div class="win-player-top-appname">Films & TV • Video Player</div>
          </div>
        </div>
        <div class="win-player-top-actions">
          <select class="win-player-speed-select" id="video-speed-select" title="Playback speed">
            <option value="0.75">0.75x</option>
            <option value="1.0" selected>1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2.0">2.0x</option>
          </select>
          <a class="win-player-dl-btn" href="${downloadUrl}" download title="Download video">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download</span>
          </a>
        </div>
      </div>

      <!-- Cinema Video Canvas -->
      <div class="win-video-canvas" id="video-canvas-el" title="Click to play/pause, double-click for fullscreen">
        <video class="win-video-el" id="video-media-el" src="${streamUrl}" preload="metadata" playsinline></video>
        <div class="win-video-center-indicator" id="video-flash-indicator">
          ${MEDIA_ICONS.play}
        </div>
      </div>

      <!-- Windows 11 Video Controls Bar -->
      <div class="win-player-controls-bar">
        <div class="win-player-scrub-row">
          <span class="win-player-time" id="video-cur-time">00:00</span>
          <input type="range" class="win-player-slider" id="video-scrub-bar" min="0" max="100" value="0" step="0.1" />
          <span class="win-player-time" id="video-total-time">--:--</span>
        </div>

        <div class="win-player-buttons-row">
          <div class="win-player-btns-left">
            <button class="win-player-icon-btn" id="video-skip-back-btn" title="Skip -10s">
              ${MEDIA_ICONS.skipBack}
            </button>
            <button class="win-player-play-btn" id="video-play-btn" title="Play">
              ${MEDIA_ICONS.play}
            </button>
            <button class="win-player-icon-btn" id="video-skip-fwd-btn" title="Skip +10s">
              ${MEDIA_ICONS.skipFwd}
            </button>
          </div>

          <div class="win-player-btns-right">
            <div class="win-player-vol-wrap">
              <button class="win-player-icon-btn" id="video-mute-btn" title="Mute">
                ${MEDIA_ICONS.volHigh}
              </button>
              <input type="range" class="win-player-vol-slider" id="video-vol-slider" min="0" max="1" step="0.05" value="1" />
            </div>

            <button class="win-player-icon-btn" id="video-pip-btn" title="Picture in Picture">
              ${MEDIA_ICONS.pip}
            </button>
            <button class="win-player-icon-btn" id="video-fullscreen-btn" title="Fullscreen">
              ${MEDIA_ICONS.fullscreen}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return WindowManager.createWindow(
    "video-player",
    displayName,
    `<div style="width:20px;height:20px;color:#8b5cf6;">${MEDIA_ICONS.videoCamera}</div>`,
    content,
    {
      width: 780,
      height: 530,
      onInit: (win) => {
        const video       = win.querySelector("#video-media-el");
        const canvas      = win.querySelector("#video-canvas-el");
        const flash       = win.querySelector("#video-flash-indicator");
        const playBtn     = win.querySelector("#video-play-btn");
        const scrub       = win.querySelector("#video-scrub-bar");
        const curTime     = win.querySelector("#video-cur-time");
        const totalTime   = win.querySelector("#video-total-time");
        const skipBack    = win.querySelector("#video-skip-back-btn");
        const skipFwd     = win.querySelector("#video-skip-fwd-btn");
        const muteBtn     = win.querySelector("#video-mute-btn");
        const volSlider   = win.querySelector("#video-vol-slider");
        const speedSelect = win.querySelector("#video-speed-select");
        const pipBtn      = win.querySelector("#video-pip-btn");
        const fsBtn       = win.querySelector("#video-fullscreen-btn");

        let isSeeking = false;

        const flashCenter = (iconSvg) => {
          if (!flash) return;
          flash.innerHTML = iconSvg;
          flash.classList.add("flash");
          setTimeout(() => flash.classList.remove("flash"), 400);
        };

        const updatePlayState = (isPlaying) => {
          if (isPlaying) {
            playBtn && (playBtn.innerHTML = MEDIA_ICONS.pause);
            playBtn && (playBtn.title = "Pause");
          } else {
            playBtn && (playBtn.innerHTML = MEDIA_ICONS.play);
            playBtn && (playBtn.title = "Play");
          }
        };

        const togglePlay = () => {
          if (!video) return;
          if (video.paused) {
            video.play().catch(() => {});
            flashCenter(MEDIA_ICONS.play);
          } else {
            video.pause();
            flashCenter(MEDIA_ICONS.pause);
          }
        };

        canvas?.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest("input")) return;
          togglePlay();
        });

        canvas?.addEventListener("dblclick", () => {
          if (!document.fullscreenElement) {
            canvas.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        });

        playBtn?.addEventListener("click", togglePlay);

        video?.addEventListener("play", () => updatePlayState(true));
        video?.addEventListener("pause", () => updatePlayState(false));

        video?.addEventListener("loadedmetadata", () => {
          if (totalTime && video.duration) {
            totalTime.textContent = formatMediaTime(video.duration);
          }
        });

        video?.addEventListener("timeupdate", () => {
          if (!video.duration || isSeeking) return;
          const pct = (video.currentTime / video.duration) * 100;
          if (scrub) scrub.value = pct;
          if (curTime) curTime.textContent = formatMediaTime(video.currentTime);
          if (totalTime && totalTime.textContent === "--:--") {
            totalTime.textContent = formatMediaTime(video.duration);
          }
        });

        scrub?.addEventListener("input", () => {
          isSeeking = true;
          if (video && video.duration) {
            const time = (parseFloat(scrub.value) / 100) * video.duration;
            if (curTime) curTime.textContent = formatMediaTime(time);
          }
        });

        scrub?.addEventListener("change", () => {
          if (video && video.duration) {
            video.currentTime = (parseFloat(scrub.value) / 100) * video.duration;
          }
          isSeeking = false;
        });

        skipBack?.addEventListener("click", () => {
          if (video) video.currentTime = Math.max(0, video.currentTime - 10);
        });

        skipFwd?.addEventListener("click", () => {
          if (video) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        });

        volSlider?.addEventListener("input", (e) => {
          if (!video) return;
          video.volume = parseFloat(e.target.value);
          video.muted = video.volume === 0;
          muteBtn && (muteBtn.innerHTML = video.muted ? MEDIA_ICONS.volMute : MEDIA_ICONS.volHigh);
        });

        muteBtn?.addEventListener("click", () => {
          if (!video) return;
          video.muted = !video.muted;
          muteBtn.innerHTML = video.muted ? MEDIA_ICONS.volMute : MEDIA_ICONS.volHigh;
        });

        speedSelect?.addEventListener("change", (e) => {
          if (video) video.playbackRate = parseFloat(e.target.value);
        });

        pipBtn?.addEventListener("click", async () => {
          if (!video) return;
          try {
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
              await video.requestPictureInPicture();
            }
          } catch (err) {}
        });

        fsBtn?.addEventListener("click", () => {
          if (!document.fullscreenElement) {
            (canvas || win).requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        });

        video?.addEventListener("error", () => {
          showToast(
            "Codec Advisory",
            "This video format may need an external player or different codec in this browser. Use Download to play in VLC.",
            "error",
            6000
          );
        });

        // Start playing automatically
        if (streamUrl && video) {
          video.play().catch(() => {});
        }
      },
    }
  );
}

// ─── 3. ROUTER / UNIFIED OPENER ──────────────────────────────
function openMediaPlayer(rootId = 0, relPath = "", filename = "Media Player", category = "video") {
  const isAudio = category === "audio" || (filename && /\.(mp3|wav|flac|m4a|aac|ogg|wma)$/i.test(filename));
  if (isAudio) {
    return openMusicPlayer(rootId, relPath, filename || "Windows Media Player");
  } else {
    return openVideoPlayer(rootId, relPath, filename || "Video Player");
  }
}

// --- DOCUMENT & FILE PREVIEWERS ---
async function openDocumentViewer(rootId, relPath, filename, category) {
  const windowId = `doc-${Date.now()}`;

  // 1. IMAGE LIGHTBOX
  if (category === "image") {
    const imgUrl = `/preview?root=${rootId}&path=${encodeURIComponent(relPath)}`;
    const content = `
      <div style="display:flex;flex-direction:column;height:100%;background:#090d16;">
        <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;padding:16px;">
          <img src="${imgUrl}" id="lightbox-img" style="max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.2s ease;" />
        </div>
        <div style="padding:10px 16px;background:var(--acrylic-subtle);display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--acrylic-border);">
          <span style="font-size:12px;color:var(--text-muted);">${filename}</span>
          <div style="display:flex;gap:8px;">
            <button class="toolbar-btn" onclick="document.getElementById('lightbox-img').style.transform += ' rotate(90deg)'">Rotate</button>
            <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download</a>
          </div>
        </div>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.image}</div>`, content, { width: 720, height: 540 });
    return;
  }

  // 2. PDF VIEWER
  if (category === "pdf") {
    const pdfUrl = `/preview?root=${rootId}&path=${encodeURIComponent(relPath)}`;
    const content = `
      <div style="display:flex;flex-direction:column;height:100%;background:#525659;">
        <div style="padding:8px 16px;background:var(--window-header-bg);border-bottom:1px solid var(--acrylic-border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;">${filename}</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download PDF</a>
        </div>
        <iframe src="${pdfUrl}" style="flex:1;border:none;width:100%;height:100%;"></iframe>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.pdf}</div>`, content, { width: 850, height: 620 });
    return;
  }

  // 3. WORD DOCUMENT (.DOCX)
  if (category === "document") {
    const res = await fetch(`/api/preview/docx?root=${rootId}&path=${encodeURIComponent(relPath)}`);
    const data = await res.json();

    let docHtml = "";
    if (data.elements) {
      data.elements.forEach((el) => {
        if (el.type === "h1") docHtml += `<h1>${el.text}</h1>`;
        else if (el.type === "h2") docHtml += `<h2>${el.text}</h2>`;
        else if (el.type === "h3") docHtml += `<h3>${el.text}</h3>`;
        else if (el.type === "bullet") docHtml += `<ul><li>${el.text}</li></ul>`;
        else docHtml += `<p>${el.text}</p>`;
      });
    }

    if (data.tables) {
      data.tables.forEach((t) => {
        docHtml += `<table>`;
        t.forEach((row, rIdx) => {
          docHtml += `<tr>`;
          row.forEach((cell) => {
            docHtml += rIdx === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`;
          });
          docHtml += `</tr>`;
        });
        docHtml += `</table>`;
      });
    }

    const content = `
      <div class="doc-viewer-container">
        <div class="doc-toolbar">
          <span style="font-size:13px;font-weight:500;">Microsoft Word Document Preview</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download Original</a>
        </div>
        <div class="doc-paper">
          <div class="doc-paper-content">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:18px;border-bottom:1px solid var(--acrylic-border);padding-bottom:8px;">${data.note || ""}</div>
            ${docHtml || "<p>No readable content extracted.</p>"}
          </div>
        </div>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.document}</div>`, content, { width: 800, height: 600 });
    return;
  }

  // 4. POWERPOINT PRESENTATION (.PPTX)
  if (category === "presentation") {
    const res = await fetch(`/api/preview/pptx?root=${rootId}&path=${encodeURIComponent(relPath)}`);
    const data = await res.json();
    const slides = data.slides || [];

    const content = `
      <div class="doc-viewer-container">
        <div class="doc-toolbar">
          <span style="font-size:13px;font-weight:500;">PowerPoint Presentation (${slides.length} slides)</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download PPTX</a>
        </div>
        <div class="pptx-container">
          <div class="pptx-slides-nav" id="pptx-nav">
            ${slides
              .map(
                (s, i) => `
              <div class="pptx-thumb-card ${i === 0 ? "active" : ""}" onclick="switchSlide(${i})">
                <div style="font-weight:600;color:var(--accent);">Slide ${s.slide_number}</div>
                <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title}</div>
              </div>
            `
              )
              .join("")}
          </div>
          <div class="pptx-stage">
            <div class="pptx-slide-canvas" id="pptx-active-canvas"></div>
            <div style="margin-top:16px;display:flex;gap:12px;">
              <button class="toolbar-btn" id="pptx-prev-btn">◀ Previous</button>
              <button class="toolbar-btn" id="pptx-next-btn">Next ▶</button>
            </div>
          </div>
        </div>
      </div>
    `;

    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.presentation}</div>`, content, {
      width: 860,
      height: 600,
      onInit: (win) => {
        let currentSlideIdx = 0;
        const renderSlide = (idx) => {
          currentSlideIdx = Math.max(0, Math.min(idx, slides.length - 1));
          const s = slides[currentSlideIdx];
          const canvas = win.querySelector("#pptx-active-canvas");
          if (!s || !canvas) return;

          canvas.innerHTML = `
            <h1 style="font-size:24px;margin-bottom:20px;color:var(--accent);">${s.title}</h1>
            <div style="flex:1;font-size:15px;line-height:1.6;">
              ${s.text_content.map((t) => `<p style="margin-bottom:12px;">${t}</p>`).join("")}
            </div>
            ${s.notes ? `<div style="margin-top:auto;padding-top:12px;border-top:1px solid var(--acrylic-border);font-size:11px;color:var(--text-muted);">Speaker Notes: ${s.notes}</div>` : ""}
          `;

          win.querySelectorAll(".pptx-thumb-card").forEach((c, i) => c.classList.toggle("active", i === currentSlideIdx));
        };

        win.querySelector("#pptx-prev-btn")?.addEventListener("click", () => renderSlide(currentSlideIdx - 1));
        win.querySelector("#pptx-next-btn")?.addEventListener("click", () => renderSlide(currentSlideIdx + 1));
        window.switchSlide = renderSlide;
        renderSlide(0);
      },
    });
    return;
  }

  // 5. SPREADSHEET (.XLSX / .CSV)
  if (category === "spreadsheet") {
    const res = await fetch(`/api/preview/spreadsheet?root=${rootId}&path=${encodeURIComponent(relPath)}`);
    const data = await res.json();

    const headers = data.headers || [];
    const rows = data.rows || [];

    const content = `
      <div class="sheet-container">
        <div class="doc-toolbar">
          <span style="font-size:13px;font-weight:500;">Spreadsheet Grid Preview (${data.total_rows || 0} rows)</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download File</a>
        </div>
        <div class="sheet-table-wrap">
          <table class="sheet-grid-table">
            <thead>
              <tr>
                <th style="width:40px;">#</th>
                ${headers.map((h) => `<th>${h}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row, rIdx) => `
                <tr>
                  <td style="color:var(--text-muted);">${rIdx + 1}</td>
                  ${row.map((cell) => `<td>${cell}</td>`).join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.spreadsheet}</div>`, content, { width: 880, height: 560 });
    return;
  }

  // 6. CODE & TEXT VIEWER
  if (category === "text") {
    const res = await fetch(`/api/preview/text?root=${rootId}&path=${encodeURIComponent(relPath)}`);
    const data = await res.json();

    // Escape HTML to prevent execution/XSS
    const safeContent = (data.content || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const content = `
      <div class="doc-viewer-container">
        <div class="doc-toolbar">
          <span style="font-size:12px;color:var(--text-muted);">${filename} (${data.total_lines} lines · ${data.encoding})</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download</a>
        </div>
        <pre class="code-viewer-container"><code>${safeContent}</code></pre>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.text}</div>`, content, { width: 780, height: 520 });
    return;
  }

  // 7. ZIP ARCHIVE INSPECTOR
  if (category === "archive") {
    const res = await fetch(`/api/preview/zip?root=${rootId}&path=${encodeURIComponent(relPath)}`);
    const data = await res.json();
    const entries = data.entries || [];

    const content = `
      <div class="doc-viewer-container">
        <div class="doc-toolbar">
          <span style="font-size:13px;font-weight:500;">ZIP Archive Inspector (${entries.length} items)</span>
          <a class="toolbar-btn btn-accent" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;">Download ZIP</a>
        </div>
        <div class="sheet-table-wrap">
          <table class="file-table">
            <thead>
              <tr>
                <th>Path Inside Archive</th>
                <th>Original Size</th>
                <th>Compressed</th>
                <th>Ratio</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              ${entries
                .map(
                  (e) => `
                <tr>
                  <td style="display:flex;align-items:center;gap:6px;">
                    <span style="width:16px;height:16px;">${getFileIcon(e.category, e.is_dir)}</span>
                    <span>${e.name}</span>
                  </td>
                  <td>${e.is_dir ? "—" : e.size.toLocaleString() + " B"}</td>
                  <td>${e.is_dir ? "—" : e.compressed_size.toLocaleString() + " B"}</td>
                  <td>${e.is_dir ? "—" : e.ratio + "%"}</td>
                  <td>${e.modified || "—"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
    WindowManager.createWindow(windowId, filename, `<div style="width:20px;height:20px;">${ICONS.archive}</div>`, content, { width: 800, height: 500 });
    return;
  }

  // Fallback: trigger safe download
  triggerDownload(rootId, relPath);
}

// 8. EXECUTABLE & APPLICATION INFO CARD
function openExecutableDialog(rootId, relPath, filename) {
  const content = `
    <div class="exe-info-card">
      <div style="width:64px;height:64px;margin:0 auto 16px;">${ICONS.executable}</div>
      <div class="exe-badge">Windows Desktop Application</div>
      <h2 style="font-size:18px;margin-bottom:8px;">${filename}</h2>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-bottom:24px;">
        This file is a Windows executable (.exe / .msi) hosted on your laptop.
        <br/><br/>
        <strong>Security & Compatibility Note:</strong>
        Windows binaries cannot be executed inside a mobile browser or on Android. The server will not run desktop applications on the host laptop via web requests.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;">
        <a class="btn-primary" href="/download?root=${rootId}&path=${encodeURIComponent(relPath)}" download style="text-decoration:none;display:inline-block;padding:10px 24px;width:auto;">
          Download Installer
        </a>
      </div>
    </div>
  `;

  WindowManager.createWindow(`exe-${Date.now()}`, `Application Info - ${filename}`, `<div style="width:20px;height:20px;">${ICONS.executable}</div>`, content, {
    width: 500,
    height: 380,
  });
}

// Global window exposure
if (typeof window !== "undefined") {
  window.openMusicPlayer = openMusicPlayer;
  window.openVideoPlayer = openVideoPlayer;
  window.openMediaPlayer = openMediaPlayer;
  window.openDocumentViewer = openDocumentViewer;
  window.openExecutableDialog = openExecutableDialog;
}
