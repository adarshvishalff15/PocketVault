/**
 * Windows 11 Virtual Desktop Built-in Applications.
 * Implements functional Calculator, Clock, Calendar, Notepad, Storage Overview,
 * Transfer Manager, Recycle Bin, Personalization, and About System dialogs.
 */

// Global Transfer History Tracker
const TransferHistory = {
  transfers: [],
  add(name, type, size, status = "Completed") {
    this.transfers.unshift({
      name,
      type, // 'upload' | 'download'
      size,
      time: new Date().toLocaleTimeString(),
      status,
    });
    if (this.transfers.length > 50) this.transfers.pop();
  },
};

// 1. WINDOWS 11 CALCULATOR
function openCalculator() {
  const content = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--window-bg);padding:14px;user-select:none;">
      <div id="calc-history" style="height:24px;font-size:12px;color:var(--text-muted);text-align:right;overflow:hidden;"></div>
      <div id="calc-display" style="font-size:36px;font-weight:600;text-align:right;margin-bottom:12px;overflow-x:auto;scrollbar-width:none;color:var(--text-main);">0</div>
      <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;flex:1;">
        <button class="calc-btn" onclick="calcOp('%')">%</button>
        <button class="calc-btn" onclick="calcClearEntry()">CE</button>
        <button class="calc-btn" onclick="calcClear()">C</button>
        <button class="calc-btn" onclick="calcBackspace()">⌫</button>
        
        <button class="calc-btn" onclick="calcSqrt()">√x</button>
        <button class="calc-btn" onclick="calcOp('/')">÷</button>
        <button class="calc-btn" onclick="calcOp('*')">×</button>
        <button class="calc-btn" onclick="calcOp('-')">−</button>
        
        <button class="calc-btn num" onclick="calcNum('7')">7</button>
        <button class="calc-btn num" onclick="calcNum('8')">8</button>
        <button class="calc-btn num" onclick="calcNum('9')">9</button>
        <button class="calc-btn" onclick="calcOp('+')">+</button>
        
        <button class="calc-btn num" onclick="calcNum('4')">4</button>
        <button class="calc-btn num" onclick="calcNum('5')">5</button>
        <button class="calc-btn num" onclick="calcNum('6')">6</button>
        <button class="calc-btn" onclick="calcEquals()" style="grid-row:span 2;background:var(--accent);color:#fff;">=</button>
        
        <button class="calc-btn num" onclick="calcNum('1')">1</button>
        <button class="calc-btn num" onclick="calcNum('2')">2</button>
        <button class="calc-btn num" onclick="calcNum('3')">3</button>
        
        <button class="calc-btn" onclick="calcToggleSign()">±</button>
        <button class="calc-btn num" onclick="calcNum('0')">0</button>
        <button class="calc-btn" onclick="calcDot()">.</button>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "calculator",
    "Calculator",
    `<div style="width:20px;height:20px;">${ICONS.calculator}</div>`,
    content,
    { width: 340, height: 480 }
  );
}

// Calculator Logic
let calcCurrent = "0";
let calcPrev = "";
let calcCurrentOp = null;

function updateCalcDisplay() {
  const d = document.getElementById("calc-display");
  if (d) d.textContent = calcCurrent;
}

function calcNum(n) {
  if (calcCurrent === "0" || calcCurrent === "Error") calcCurrent = n;
  else calcCurrent += n;
  updateCalcDisplay();
}

function calcDot() {
  if (!calcCurrent.includes(".")) calcCurrent += ".";
  updateCalcDisplay();
}

function calcClear() {
  calcCurrent = "0";
  calcPrev = "";
  calcCurrentOp = null;
  const h = document.getElementById("calc-history");
  if (h) h.textContent = "";
  updateCalcDisplay();
}

function calcClearEntry() {
  calcCurrent = "0";
  updateCalcDisplay();
}

function calcBackspace() {
  if (calcCurrent.length > 1) calcCurrent = calcCurrent.slice(0, -1);
  else calcCurrent = "0";
  updateCalcDisplay();
}

function calcToggleSign() {
  if (calcCurrent !== "0") {
    calcCurrent = calcCurrent.startsWith("-") ? calcCurrent.slice(1) : "-" + calcCurrent;
    updateCalcDisplay();
  }
}

function calcSqrt() {
  try {
    const val = parseFloat(calcCurrent);
    if (val < 0) calcCurrent = "Error";
    else calcCurrent = String(Math.sqrt(val));
    updateCalcDisplay();
  } catch {
    calcCurrent = "Error";
    updateCalcDisplay();
  }
}

function calcOp(op) {
  calcPrev = calcCurrent;
  calcCurrentOp = op;
  calcCurrent = "0";
  const h = document.getElementById("calc-history");
  if (h) h.textContent = `${calcPrev} ${op}`;
}

function calcEquals() {
  if (!calcCurrentOp || !calcPrev) return;
  const p = parseFloat(calcPrev);
  const c = parseFloat(calcCurrent);
  let res = 0;
  if (calcCurrentOp === "+") res = p + c;
  else if (calcCurrentOp === "-") res = p - c;
  else if (calcCurrentOp === "*") res = p * c;
  else if (calcCurrentOp === "/") res = c !== 0 ? p / c : "Error";
  else if (calcCurrentOp === "%") res = (p * c) / 100;

  const h = document.getElementById("calc-history");
  if (h) h.textContent = `${p} ${calcCurrentOp} ${c} =`;
  calcCurrent = String(res);
  calcCurrentOp = null;
  calcPrev = "";
  updateCalcDisplay();
}

// 2. WINDOWS 11 NOTEPAD / TEXT EDITOR
function openNotepad(initialText = "", title = "Untitled.txt") {
  const content = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--window-bg);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:var(--acrylic-subtle);border-bottom:1px solid var(--acrylic-border);">
        <div style="display:flex;gap:8px;">
          <button class="toolbar-btn" onclick="saveNotepadText()">Download as .txt</button>
          <button class="toolbar-btn" onclick="copyNotepadText()">Copy All</button>
          <button class="toolbar-btn" onclick="clearNotepadText()">Clear</button>
        </div>
        <span style="font-size:11px;color:var(--text-muted);" id="notepad-filename">${title}</span>
      </div>
      <textarea id="notepad-textarea" style="flex:1;background:transparent;border:none;outline:none;padding:16px;color:var(--text-main);font-family:Consolas, 'Courier New', monospace;font-size:14px;resize:none;line-height:1.5;">${initialText}</textarea>
      <div style="display:flex;justify-content:space-between;padding:4px 12px;background:var(--acrylic-subtle);border-top:1px solid var(--acrylic-border);font-size:11px;color:var(--text-muted);">
        <span id="notepad-stats">Lines: 1 · Characters: 0</span>
        <span>UTF-8 · Windows (CRLF)</span>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "notepad",
    `Notepad - ${title}`,
    `<div style="width:20px;height:20px;">${ICONS.notepad}</div>`,
    content,
    {
      width: 720,
      height: 480,
      onInit: (win) => {
        const ta = win.querySelector("#notepad-textarea");
        const stats = win.querySelector("#notepad-stats");
        const updateStats = () => {
          const val = ta.value;
          const lines = val.split("\n").length;
          const chars = val.length;
          stats.textContent = `Lines: ${lines} · Characters: ${chars}`;
        };
        ta.addEventListener("input", updateStats);
        updateStats();
      },
    }
  );
}

function saveNotepadText() {
  const ta = document.getElementById("notepad-textarea");
  if (!ta) return;
  const blob = new Blob([ta.value], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "Note_" + new Date().toISOString().slice(0, 10) + ".txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("Notepad", "Note downloaded to your device.", "success");
}

function copyNotepadText() {
  const ta = document.getElementById("notepad-textarea");
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    showToast("Notepad", "Text copied to clipboard.", "success");
  });
}

function clearNotepadText() {
  const ta = document.getElementById("notepad-textarea");
  if (ta) ta.value = "";
}

// 3. WINDOWS 11 CLOCK & STOPWATCH
function openClockApp() {
  const content = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--window-bg);padding:24px;text-align:center;">
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">LOCAL SYSTEM TIME</div>
      <div id="clock-big-time" style="font-size:52px;font-weight:200;color:var(--text-main);letter-spacing:-1px;margin-bottom:6px;">--:--:--</div>
      <div id="clock-big-date" style="font-size:16px;color:var(--accent);margin-bottom:32px;">--</div>

      <div style="padding:16px;background:var(--acrylic-subtle);border-radius:var(--radius-md);border:1px solid var(--acrylic-border);margin-bottom:20px;">
        <div style="font-size:12px;font-weight:600;margin-bottom:12px;color:var(--text-secondary);">STOPWATCH</div>
        <div id="stopwatch-display" style="font-size:32px;font-weight:300;margin-bottom:14px;font-family:monospace;">00:00.0</div>
        <div style="display:flex;justify-content:center;gap:10px;">
          <button class="btn-primary" id="stopwatch-start" style="width:auto;padding:6px 16px;">Start</button>
          <button class="toolbar-btn" id="stopwatch-reset" style="padding:6px 16px;">Reset</button>
        </div>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "clock",
    "Clock",
    `<div style="width:20px;height:20px;">${ICONS.clock}</div>`,
    content,
    {
      width: 420,
      height: 440,
      onInit: (win) => {
        const updateBigClock = () => {
          const now = new Date();
          const bt = win.querySelector("#clock-big-time");
          const bd = win.querySelector("#clock-big-date");
          if (bt) bt.textContent = now.toLocaleTimeString();
          if (bd) bd.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        };
        const clockTimer = setInterval(updateBigClock, 1000);
        updateBigClock();

        // Stopwatch logic
        let swStart = 0;
        let swElapsed = 0;
        let swInterval = null;
        const swDisplay = win.querySelector("#stopwatch-display");
        const swStartBtn = win.querySelector("#stopwatch-start");
        const swResetBtn = win.querySelector("#stopwatch-reset");

        swStartBtn.addEventListener("click", () => {
          if (swInterval) {
            clearInterval(swInterval);
            swInterval = null;
            swStartBtn.textContent = "Resume";
          } else {
            swStart = Date.now() - swElapsed;
            swInterval = setInterval(() => {
              swElapsed = Date.now() - swStart;
              const mins = Math.floor(swElapsed / 60000);
              const secs = Math.floor((swElapsed % 60000) / 1000);
              const tenths = Math.floor((swElapsed % 1000) / 100);
              swDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
            }, 100);
            swStartBtn.textContent = "Pause";
          }
        });

        swResetBtn.addEventListener("click", () => {
          clearInterval(swInterval);
          swInterval = null;
          swElapsed = 0;
          swDisplay.textContent = "00:00.0";
          swStartBtn.textContent = "Start";
        });
      },
    }
  );
}

// 4. WINDOWS 11 CALENDAR
function openCalendarApp() {
  const now = new Date();
  let currentMonth = now.getMonth();
  let currentYear = now.getFullYear();

  const content = `
    <div style="display:flex;flex-direction:column;height:100%;background:var(--window-bg);padding:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <span id="cal-month-year" style="font-size:18px;font-weight:600;color:var(--text-main);"></span>
        <div style="display:flex;gap:6px;">
          <button class="win-btn" id="cal-prev" title="Previous Month">◀</button>
          <button class="win-btn" id="cal-next" title="Next Month">▶</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:4px;text-align:center;font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px;">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div id="cal-days-grid" style="display:grid;grid-template-columns:repeat(7, 1fr);gap:4px;flex:1;text-align:center;"></div>
    </div>
  `;

  WindowManager.createWindow(
    "calendar",
    "Calendar",
    `<div style="width:20px;height:20px;">${ICONS.calendar}</div>`,
    content,
    {
      width: 380,
      height: 380,
      onInit: (win) => {
        const renderCal = () => {
          const mLabel = win.querySelector("#cal-month-year");
          const grid = win.querySelector("#cal-days-grid");
          const d = new Date(currentYear, currentMonth, 1);
          mLabel.textContent = d.toLocaleDateString([], { month: "long", year: "numeric" });

          const firstDay = d.getDay();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          let html = "";

          for (let i = 0; i < firstDay; i++) {
            html += `<div></div>`;
          }

          const today = new Date();
          for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
            html += `
              <div style="display:flex;align-items:center;justify-content:center;height:36px;border-radius:50%;font-size:13px;cursor:pointer;${isToday ? "background:var(--accent);color:#fff;font-weight:600;" : "color:var(--text-main);"}" class="cal-day-cell">
                ${day}
              </div>
            `;
          }
          grid.innerHTML = html;
        };

        win.querySelector("#cal-prev")?.addEventListener("click", () => {
          currentMonth--;
          if (currentMonth < 0) { currentMonth = 11; currentYear--; }
          renderCal();
        });

        win.querySelector("#cal-next")?.addEventListener("click", () => {
          currentMonth++;
          if (currentMonth > 11) { currentMonth = 0; currentYear++; }
          renderCal();
        });

        renderCal();
      },
    }
  );
}

// 5. STORAGE OVERVIEW
function openStorageOverview() {
  const content = `
    <div style="padding:24px;overflow-y:auto;height:100%;background:var(--window-bg);">
      <div style="margin-bottom:20px;">
        <h2 style="font-size:20px;margin-bottom:4px;">Storage Overview</h2>
        <p style="font-size:12px;color:var(--text-muted);">Storage capacity and space available on your host laptop.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${AppState.activeRoots
          .map((r) => {
            const s = r.storage || {};
            const percent = s.percent_used || 0;
            return `
            <div style="padding:16px;background:var(--acrylic-subtle);border:1px solid var(--acrylic-border);border-radius:var(--radius-md);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:28px;height:28px;">${r.type === "drive" ? ICONS.drive : ICONS.folder}</div>
                  <div>
                    <div style="font-weight:600;font-size:14px;">${r.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${r.type === "drive" ? "Storage Drive Partition" : "Library Folder"}</div>
                  </div>
                </div>
                <div style="font-size:13px;font-weight:500;color:var(--accent);">${s.free_human || "0 B"} free</div>
              </div>
              <div class="storage-bar-bg" style="height:8px;margin-bottom:8px;">
                <div class="storage-bar-fill" style="width:${percent}%;background:${percent > 85 ? "var(--danger)" : "var(--accent)"};"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);">
                <span>Used: ${s.used_human || "0 B"} (${percent}%)</span>
                <span>Total Capacity: ${s.total_human || "0 B"}</span>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "storage-overview",
    "Storage Overview",
    `<div style="width:20px;height:20px;">${ICONS.storage}</div>`,
    content,
    { width: 680, height: 480 }
  );
}

// 6. TRANSFER MANAGER
function openTransferManager() {
  const content = `
    <div style="padding:20px;display:flex;flex-direction:column;height:100%;background:var(--window-bg);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="font-size:18px;margin-bottom:4px;">Transfer Manager</h2>
          <p style="font-size:12px;color:var(--text-muted);">Active and recent file downloads and uploads.</p>
        </div>
        <button class="toolbar-btn" onclick="TransferHistory.transfers=[];openTransferManager();">Clear History</button>
      </div>
      <div style="flex:1;overflow-y:auto;" id="transfer-list-container">
        ${
          TransferHistory.transfers.length === 0
            ? `
          <div style="padding:60px 20px;text-align:center;color:var(--text-muted);">
            <div style="width:40px;height:40px;margin:0 auto 10px;opacity:0.4;">${ICONS.transfer}</div>
            <div>No recent file transfers recorded.</div>
          </div>
        `
            : `
          <table class="file-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Type</th>
                <th>Filename</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${TransferHistory.transfers
                .map(
                  (t) => `
                <tr>
                  <td><span style="padding:2px 8px;border-radius:10px;background:${t.type === "upload" ? "var(--accent-light)" : "rgba(34,197,94,0.15)"};color:${t.type === "upload" ? "var(--accent)" : "var(--success)"};">${t.type.toUpperCase()}</span></td>
                  <td style="font-weight:500;">${t.name}</td>
                  <td style="color:var(--text-muted);">${t.time}</td>
                  <td><span style="color:var(--success);">${t.status}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        `
        }
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "transfer-mgr",
    "Transfer Manager",
    `<div style="width:20px;height:20px;">${ICONS.transfer}</div>`,
    content,
    { width: 620, height: 420 }
  );
}

// 7. RECYCLE BIN
function openRecycleBin() {
  const content = `
    <div style="padding:24px;display:flex;flex-direction:column;height:100%;background:var(--window-bg);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:36px;height:36px;">${ICONS.recycleBin}</div>
        <div>
          <h2 style="font-size:18px;margin-bottom:4px;">Recycle Bin</h2>
          <p style="font-size:12px;color:var(--text-muted);">Safely managed trash logs and deletion records.</p>
        </div>
      </div>
      <div style="padding:20px;background:var(--acrylic-subtle);border-radius:var(--radius-md);border:1px solid var(--acrylic-border);margin-bottom:16px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;color:var(--text-main);">Safe Storage Deletion Protection</div>
        <p style="font-size:12px;color:var(--text-muted);line-height:1.5;">
          When deleting files from File Explorer, all operations are logged in the security audit trail.
          Permanently deleted items cannot be restored through the web interface.
        </p>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
        <div>Recycle Bin is currently empty.</div>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "recycle-bin",
    "Recycle Bin",
    `<div style="width:20px;height:20px;">${ICONS.recycleBin}</div>`,
    content,
    { width: 560, height: 400 }
  );
}

// 8. HELP & ABOUT SYSTEM DIALOG
function openAboutDialog() {
  const content = `
    <div style="padding:28px;text-align:center;background:var(--window-bg);height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div style="width:64px;height:64px;margin-bottom:16px;">${ICONS.win11}</div>
      <h1 style="font-size:22px;font-weight:600;margin-bottom:6px;">Windows 11 Virtual Desktop</h1>
      <div style="font-size:13px;color:var(--accent);margin-bottom:18px;">Remote File & Media Access Platform</div>
      <p style="font-size:13px;color:var(--text-secondary);max-width:440px;line-height:1.5;margin-bottom:24px;">
        A high-performance remote file workspace inspired by Windows 11 Fluent UI, running on Python Flask.
        Provides secure phone access, HTTP 206 byte-range media streaming, and document preview without capturing your laptop's screen.
      </p>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:6px 12px;font-size:12px;text-align:left;background:var(--acrylic-subtle);padding:14px;border-radius:var(--radius-md);border:1px solid var(--acrylic-border);width:100%;max-width:380px;">
        <span style="color:var(--text-muted);">Host OS:</span><span>Windows 11</span>
        <span style="color:var(--text-muted);">Python:</span><span>Python 3.14 (Flask)</span>
        <span style="color:var(--text-muted);">Port:</span><span>6789</span>
        <span style="color:var(--text-muted);">Security:</span><span>scrypt, CSRF, Safe Roots</span>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "about",
    "About Windows 11 Virtual Desktop",
    `<div style="width:20px;height:20px;">${ICONS.info}</div>`,
    content,
    { width: 480, height: 440 }
  );
}

// 9. WALLPAPER & PERSONALIZATION — Real wallpaper support
// NOTE: setWallpaper(name) is defined in app.js and switches background images.
// This personalization app shows available wallpapers to the user.

const AVAILABLE_WALLPAPERS = [
  {
    name: "Current Wallpaper",
    file: "wallpaper",
    desc: "Your actual Windows 11 desktop wallpaper"
  },
  {
    name: "Windows 11 Bloom",
    file: "bloom",
    desc: "The classic Windows 11 Bloom wallpaper"
  },
];

const UserPrefs = {
  DEFAULTS: {
    iconSize: "medium",      // 'small' | 'medium' | 'large'
    iconSpacing: "normal",    // 'normal' | 'compact'
    taskbarAlign: "center",   // 'center' | 'left'
    explorerView: "grid",     // 'grid' | 'list'
    selectionMode: "hover",   // 'hover' | 'always'
    fileAction: "preview",    // 'preview' | 'download'
  },
  get() {
    try {
      const saved = localStorage.getItem("win11_user_prefs");
      return saved ? Object.assign({}, this.DEFAULTS, JSON.parse(saved)) : Object.assign({}, this.DEFAULTS);
    } catch(e) {
      return Object.assign({}, this.DEFAULTS);
    }
  },
  save(prefs) {
    try {
      localStorage.setItem("win11_user_prefs", JSON.stringify(prefs));
    } catch(e) {}
    this.apply(prefs);
  },
  apply(prefs = this.get()) {
    // 1. Icon Size & Spacing
    const iconArea = document.getElementById("desktop-icons-area");
    if (iconArea) {
      iconArea.classList.remove("icon-size-small", "icon-size-large", "icon-compact");
      if (prefs.iconSize === "small") iconArea.classList.add("icon-size-small");
      else if (prefs.iconSize === "large") iconArea.classList.add("icon-size-large");
      if (prefs.iconSpacing === "compact") iconArea.classList.add("icon-compact");
    }
    // 2. Taskbar Alignment
    const tbCenter = document.querySelector(".taskbar-center");
    if (tbCenter) {
      if (prefs.taskbarAlign === "left") tbCenter.classList.add("align-left");
      else tbCenter.classList.remove("align-left");
    }
    // 3. Selection mode
    if (prefs.selectionMode === "always") {
      document.documentElement.classList.add("always-show-checkboxes");
    } else {
      document.documentElement.classList.remove("always-show-checkboxes");
    }
    // 4. Explorer default view
    if (typeof ExplorerState !== "undefined" && prefs.explorerView) {
      ExplorerState.viewMode = prefs.explorerView;
      const lbl = document.getElementById("view-mode-label");
      if (lbl) lbl.textContent = prefs.explorerView === "grid" ? "Grid" : "List";
    }
  },
  reset() {
    localStorage.removeItem("win11_user_prefs");
    this.apply(this.DEFAULTS);
  }
};

// Apply on initial load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => UserPrefs.apply());
} else {
  UserPrefs.apply();
}

function openPersonalization() {
  const currentWp = (typeof AppState !== 'undefined' ? AppState.wallpaper : null) || localStorage.getItem("win11_wallpaper") || "wallpaper";
  const p = UserPrefs.get();

  const wpCards = AVAILABLE_WALLPAPERS.map(w => `
    <div onclick="if(typeof setWallpaper==='function'){setWallpaper('${w.file}');}"
      style="cursor:pointer;border-radius:var(--radius-lg);border:2px solid ${currentWp===w.file?'var(--accent)':'var(--acrylic-border)'};overflow:hidden;transition:all 0.15s ease;"
      class="wallpaper-thumb" title="${w.desc}">
      <div style="height:100px;background-image:url('/static/assets/windows-theme/wallpaper/${w.file}.jpg');background-size:cover;background-position:center;"></div>
      <div style="padding:8px 10px;font-size:12px;font-weight:500;display:flex;align-items:center;gap:6px;">
        ${currentWp===w.file?'<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" style="width:14px;height:14px;"><polyline points="20 6 9 17 4 12"/></svg>':''}
        ${w.name}
      </div>
    </div>
  `).join('');

  const content = `
    <div style="padding:24px;overflow-y:auto;height:100%;background:var(--window-bg);">
      <div style="margin-bottom:20px;">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px;">Personalization</h2>
        <p style="font-size:12px;color:var(--text-muted);">Customize your Windows 11 virtual desktop experience.</p>
      </div>

      <!-- Wallpaper Selection -->
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Background</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:12px;margin-bottom:24px;">
        ${wpCards}
      </div>

      <!-- Theme Mode -->
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Theme Mode</div>
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div onclick="if(typeof setTheme==='function')setTheme('dark');"
          style="flex:1;padding:12px;border-radius:var(--radius-lg);border:2px solid var(--acrylic-border);cursor:pointer;background:#0f172a;color:white;text-align:center;font-size:13px;font-weight:500;">
          🌙 Dark Mode
        </div>
        <div onclick="if(typeof setTheme==='function')setTheme('light');"
          style="flex:1;padding:12px;border-radius:var(--radius-lg);border:2px solid var(--acrylic-border);cursor:pointer;background:#f0f2f8;color:#0f172a;text-align:center;font-size:13px;font-weight:500;">
          ☀️ Light Mode
        </div>
      </div>

      <!-- Desktop Layout & Icons -->
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Desktop & Taskbar Layout</div>
      <div class="settings-card" style="margin-bottom:24px;">
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--acrylic-border);">
          <div>
            <div style="font-size:13px;font-weight:500;">Desktop Icon Size</div>
            <div style="font-size:12px;color:var(--text-muted);">Adjust the display scale of desktop app icons.</div>
          </div>
          <select id="pref-icon-size" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="small" ${p.iconSize==='small'?'selected':''}>Small</option>
            <option value="medium" ${p.iconSize==='medium'?'selected':''}>Medium (Win11)</option>
            <option value="large" ${p.iconSize==='large'?'selected':''}>Large</option>
          </select>
        </div>
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--acrylic-border);">
          <div>
            <div style="font-size:13px;font-weight:500;">Desktop Icon Spacing</div>
            <div style="font-size:12px;color:var(--text-muted);">Set density of icons on the desktop.</div>
          </div>
          <select id="pref-icon-spacing" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="normal" ${p.iconSpacing==='normal'?'selected':''}>Normal</option>
            <option value="compact" ${p.iconSpacing==='compact'?'selected':''}>Compact</option>
          </select>
        </div>
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
          <div>
            <div style="font-size:13px;font-weight:500;">Taskbar Alignment</div>
            <div style="font-size:12px;color:var(--text-muted);">Center (Windows 11) or Left (Classic).</div>
          </div>
          <select id="pref-tb-align" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="center" ${p.taskbarAlign==='center'?'selected':''}>Center</option>
            <option value="left" ${p.taskbarAlign==='left'?'selected':''}>Left</option>
          </select>
        </div>
      </div>

      <!-- File Explorer & Selection Options -->
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.06em;">Explorer & Interaction Preferences</div>
      <div class="settings-card" style="margin-bottom:24px;">
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--acrylic-border);">
          <div>
            <div style="font-size:13px;font-weight:500;">Default File View</div>
            <div style="font-size:12px;color:var(--text-muted);">Choose default folder view mode.</div>
          </div>
          <select id="pref-exp-view" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="grid" ${p.explorerView==='grid'?'selected':''}>Grid View</option>
            <option value="list" ${p.explorerView==='list'?'selected':''}>Details List</option>
          </select>
        </div>
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--acrylic-border);">
          <div>
            <div style="font-size:13px;font-weight:500;">Selection Checkboxes</div>
            <div style="font-size:12px;color:var(--text-muted);">Show item checkboxes for multi-file operations.</div>
          </div>
          <select id="pref-sel-mode" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="hover" ${p.selectionMode==='hover'?'selected':''}>Show on Hover/Select</option>
            <option value="always" ${p.selectionMode==='always'?'selected':''}>Always Visible</option>
          </select>
        </div>
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;">
          <div>
            <div style="font-size:13px;font-weight:500;">Double-Click / Tap Action</div>
            <div style="font-size:12px;color:var(--text-muted);">Action taken when activating a file.</div>
          </div>
          <select id="pref-file-action" class="form-input" style="width:130px;padding:6px 8px;">
            <option value="preview" ${p.fileAction==='preview'?'selected':''}>Preview in Viewer / Player</option>
            <option value="download" ${p.fileAction==='download'?'selected':''}>Direct Download</option>
          </select>
        </div>
      </div>

      <!-- Touch Pointer / Cursor settings shortcut -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:var(--acrylic-bg);border:1px solid var(--acrylic-border);border-radius:var(--radius-lg);margin-bottom:24px;">
        <div>
          <div style="font-size:13px;font-weight:600;">Touch Pointer & Virtual Cursor</div>
          <div style="font-size:12px;color:var(--text-muted);">Configure pointer size, speed, click assist, and touch controls.</div>
        </div>
        <button onclick="openCursorSettings()" class="btn-primary" style="width:auto;padding:8px 16px;font-size:12px;">Open Cursor Settings</button>
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <button id="pref-save-btn" class="btn-primary" style="width:auto;padding:9px 22px;">Apply Preferences</button>
        <button id="pref-reset-btn" style="padding:9px 22px;background:transparent;border:1px solid var(--acrylic-border);border-radius:var(--radius-md);color:var(--text-secondary);cursor:pointer;">Reset to Defaults</button>
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "personalization",
    "Personalization",
    `<div style="width:20px;height:20px;">${ICONS.pictures}</div>`,
    content,
    {
      width: 680, height: 560,
      onInit: (win) => {
        win.querySelector("#pref-save-btn")?.addEventListener("click", () => {
          const newPrefs = {
            iconSize: win.querySelector("#pref-icon-size")?.value || "medium",
            iconSpacing: win.querySelector("#pref-icon-spacing")?.value || "normal",
            taskbarAlign: win.querySelector("#pref-tb-align")?.value || "center",
            explorerView: win.querySelector("#pref-exp-view")?.value || "grid",
            selectionMode: win.querySelector("#pref-sel-mode")?.value || "hover",
            fileAction: win.querySelector("#pref-file-action")?.value || "preview",
          };
          UserPrefs.save(newPrefs);
          if (typeof showToast === "function") showToast("Personalization", "Desktop preferences saved.", "success");
        });

        win.querySelector("#pref-reset-btn")?.addEventListener("click", () => {
          UserPrefs.reset();
          WindowManager.closeWindow("personalization");
          if (typeof showToast === "function") showToast("Personalization", "Preferences restored to defaults.", "info");
        });
      }
    }
  );
}

