# 📱 PocketVault (v1.0 Read-Only)

> **Self-Hosted Personal Mobile File Server for Android (Termux / Kali Linux / Any Phone) & PCs**

PocketVault transforms your Android smartphone (tested on **Samsung Galaxy S24 FE**, Galaxy A22, and any Android 8.0+ device) into a private, self-hosted file server accessible from any web browser on your local Wi-Fi or hotspot.

---

## 🌟 Key Highlights

- 📱 **Mobile-Native OS Experience**: Replaces desktop-oriented web interfaces with an authentic **Samsung One UI / Android style mobile home screen** featuring squircle app icons, a live ambient clock widget, storage summary card, and a bottom gesture navigation bar.
- 🎨 **Dynamic Phone Wallpaper Integration**: PocketVault uses your phone's authentic wallpaper (or any selected camera photo from your gallery) as the ambient frosted-glass background for the login screen and home dashboard.
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
git clone https://github.com/YOUR_USERNAME/PocketVault.git
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

## 🐧 Quick Start on Linux / Kali NetHunter

```bash
git clone https://github.com/YOUR_USERNAME/PocketVault.git
cd PocketVault
bash install.sh
bash start.sh
```

---

## 💻 Quick Start on Windows / Mac (Development & Testing)

### Windows PowerShell:
```powershell
python -m pip install -r requirements.txt
python run.py --port 8288
```
Or double-click `start.bat` / `start.ps1`.

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
