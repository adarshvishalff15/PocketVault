# 📱 PocketVault (v1.0 Read-Only)

> **Self-Hosted Personal Mobile File Server for Android (Termux / Kali Linux / Any Phone) & PCs**

PocketVault transforms your Android smartphone (tested on **Samsung Galaxy S24 FE**, Galaxy A22, and any Android 8.0+ device) into a private, self-hosted file server accessible from any web browser on your local Wi-Fi or hotspot.

---

## 🌟 Key Highlights

- 📱 **Mobile-Native OS Experience**: Replaces desktop-oriented web interfaces with an authentic **Samsung One UI / Android style mobile home screen** featuring squircle app icons, a live ambient clock widget, storage summary card, and a bottom gesture navigation bar.
- 🎨 **Auto-Fetch Wallpapers from Shared Screen Devices**: Automatically scans connected screen devices, active desktop/mobile wallpapers (Windows 4K TranscodedWallpaper, Spotlight, Android wallpapers), and shared device screenshots to set real-time ambient backgrounds with live blur & dim controls.
- 🎛️ **Quick Settings Control Center**: Tap the top mobile status bar to slide down a Samsung One UI control shade with quick toggles for Auto-Fetch, Rescan Screens, and Phone/Tablet display modes.
- 🎵 **Persistent Floating Mini Music Player**: Listen to background audio with lockscreen controls while browsing photos, files, and wallpapers.
- 🛡️ **Read-Only v1.0 Safety Guarantee**: Absolute protection for your phone's internal storage. There are **zero** file modification, write, delete, rename, or upload endpoints in v1.0. Your original files are 100% safe.
- 🔌 **Default Port `8288`**: Runs by default on port `8288` (`http://<phone-ip>:8288`).
- 📷 **Terminal QR Code**: Prints an instant ASCII QR code right in the Termux / Linux console so you can pair other phones with a simple camera scan.
- 🎬 **HTTP 206 Byte-Range Streaming**: Smooth instant seeking in large 4K / 1080p videos and background audio streaming with lockscreen media controls.
- 📄 **In-Browser Document Previews**: Native parsing and rendering for PDFs, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), CSV, and code/text files without downloading.
- 📦 **Installed Apps Inventory**: Non-root Android package scanner (`pm list packages -3`) listing installed applications on your device.

---

## 📲 Quick Start on Android (Termux)

### Step 1: Install Termux & Storage Access
Open **Termux** on your Android phone and run:
```bash
pkg update && pkg upgrade -y
pkg install python git termux-tools -y
termux-setup-storage
```
*(When prompted by Android, tap **Allow** to grant storage permissions).*

### Step 2: Clone or Copy PocketVault
```bash
git clone https://github.com/adarshvishalff15/PocketVault.git
cd PocketVault
```

### Step 3: Install & Start
```bash
bash install.sh
bash start.sh
```

### Step 4: Connect
The terminal will display your active LAN URL and a QR Code:
```
======================================================================
  Server Name : PocketVault
  Platform    : Android / Termux
  Port        : 8288
  Access URL  : http://192.168.1.15:8288
----------------------------------------------------------------------
  SCAN WITH PHONE CAMERA TO CONNECT:
  [ ASCII QR CODE ]
======================================================================
```
Open the link on any phone, laptop, or tablet on the same Wi-Fi network!

---

## 🐧 Installation & Setup on Kali Linux / Debian / Ubuntu / NetHunter

### Prerequisites:
Make sure Git and Python 3 are installed on your Kali system:
```bash
sudo apt update -y
sudo apt install python3 python3-pip python3-venv git -y
```

### Option A: One-Step Automated Setup (Recommended)
```bash
# 1. Clone the repository
git clone https://github.com/adarshvishalff15/PocketVault.git
cd PocketVault

# 2. Run automated installer (creates virtual environment & installs dependencies)
bash install.sh

# 3. Start PocketVault
bash start.sh
```

### Option B: Manual Setup
```bash
# 1. Clone the repository
git clone https://github.com/adarshvishalff15/PocketVault.git
cd PocketVault

# 2. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Launch PocketVault server
python3 run.py --port 8288
```
> **Kali Firewall Tip**: If you are using `ufw` or `iptables`, allow port 8288 for LAN access:
> ```bash
> sudo ufw allow 8288/tcp
> ```

---

## 💻 Installation & Setup on Windows (10 / 11)

### Prerequisites:
1. Install **Python 3.10+** from [python.org](https://www.python.org/downloads/) (Make sure to check **"Add python.exe to PATH"** during installation).
2. Install **Git for Windows** from [git-scm.com](https://git-scm.com/).

### Option A: 1-Click Batch Setup (Easiest)
1. Open PowerShell or Command Prompt and clone the repository:
   ```cmd
   git clone https://github.com/adarshvishalff15/PocketVault.git
   cd PocketVault
   ```
2. Double-click **`install.bat`** (or run `install.bat` in terminal) to automatically install all dependencies.
3. Double-click **`start.bat`** (or right-click `start.ps1` -> *Run with PowerShell*) to launch the server!

### Option B: Windows PowerShell Setup
```powershell
# 1. Clone the repository
git clone https://github.com/adarshvishalff15/PocketVault.git
cd PocketVault

# 2. Install dependencies
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# 3. Start the server
python run.py --port 8288
```

> **Windows Firewall Prompt**: When running for the first time, Windows Defender Firewall may prompt you to allow Python access. Check **Private networks** and click **Allow access** so other devices on your Wi-Fi can open PocketVault.

---

## 🗂️ Universal Storage Discovery

PocketVault automatically mounts and categorizes your device's storage without requiring manual path entry:

| Storage Root | Android / Termux Path | Linux / Windows Path |
| :--- | :--- | :--- |
| **Internal Storage** | `/sdcard` or `~/storage/shared` | User Profile / Home |
| **Camera & Photos** | `/sdcard/DCIM` | `Pictures` |
| **Wallpapers** | `/sdcard/Pictures/Wallpapers` | `Pictures/Wallpapers` |
| **Movies & Videos** | `/sdcard/Movies` | `Videos` |
| **Downloads** | `/sdcard/Download` | `Downloads` |
| **Documents** | `/sdcard/Documents` | `Documents` |
| **Music & Audio** | `/sdcard/Music` | `Music` |

---

## 🔒 Security Architecture

1. **Authentication**: Passwords are encrypted using **PBKDF2-HMAC-SHA256** with high iteration rounds.
2. **Brute-Force Rate Limiting**: 5 consecutive failed login attempts locks out the client IP/username for 10 minutes.
3. **Strict Path Canonicalization**: Traversal attacks (`../`, `..\`) and symlink escapes are strictly blocked via `os.path.commonpath`.
4. **Read-Only Enforcement**: All state-modifying requests (`POST /api/upload`, `POST /api/delete`, `POST /api/rename`, etc.) are intercepted at the middleware layer and rejected with `403 Forbidden`.
5. **No Shell Execution**: Zero remote command or shell endpoints.

---

## ⚙️ Environment Variables (Optional)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `POCKETVAULT_PORT` | `8288` | Port to bind |
| `POCKETVAULT_HOST` | `0.0.0.0` | Host interface |
| `POCKETVAULT_NAME` | `PocketVault` | Server display name |
| `POCKETVAULT_MAX_ATTEMPTS` | `5` | Failed login attempt limit |
| `POCKETVAULT_LOCKOUT_MINS` | `10` | Lockout duration in minutes |

---

## 📜 License

MIT License. Designed with ❤️ for personal privacy and mobile sovereignty.
