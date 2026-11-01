"""Phone & Shared Screen Wallpaper Service for PocketVault.

Discovers authentic wallpapers and screenshots on connected screen devices,
system desktop/mobile active screen backgrounds (Windows TranscodedWallpaper,
Android wallpaper, Linux backgrounds), manages One UI / AMOLED presets,
and provides auto-fetch and auto-cycle capabilities across shared storage roots.
"""

from pathlib import Path
import json
import os
import time
import shutil
from config import DATA_DIR, get_roots

WALLPAPER_CONFIG_FILE = DATA_DIR / "wallpaper_config.json"
WALLPAPER_PRESETS_DIR = DATA_DIR / "wallpapers"
WALLPAPER_PRESETS_DIR.mkdir(exist_ok=True, parents=True)

# Default presets (Samsung One UI / Galaxy S24 FE / AMOLED)
PRESETS = [
    {
        "id": "s24_ambient_dark",
        "title": "Galaxy S24 FE Ambient Dark",
        "type": "preset",
        "gradient": "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #090d16 100%)",
        "accent": "#38bdf8",
    },
    {
        "id": "s24_titanium_neon",
        "title": "One UI Titanium Glow",
        "type": "preset",
        "gradient": "linear-gradient(135deg, #180d28 0%, #0d1b2a 60%, #1b263b 100%)",
        "accent": "#a855f7",
    },
    {
        "id": "amoled_pure",
        "title": "AMOLED Minimal Black",
        "type": "preset",
        "gradient": "linear-gradient(180deg, #050505 0%, #0f0f11 100%)",
        "accent": "#10b981",
    },
    {
        "id": "s24_sunset",
        "title": "S24 FE Sunset Horizon",
        "type": "preset",
        "gradient": "linear-gradient(135deg, #1a0f2e 0%, #3a1c52 50%, #4a2840 100%)",
        "accent": "#f43f5e",
    },
    {
        "id": "cyber_emerald",
        "title": "Cyber Emerald Matrix",
        "type": "preset",
        "gradient": "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)",
        "accent": "#34d399",
    },
]


def get_system_screen_wallpaper_path() -> Path | None:
    """Detect current active desktop or device screen wallpaper."""
    if os.name == "nt":
        appdata = os.environ.get("APPDATA")
        if appdata:
            transcoded = Path(appdata) / "Microsoft" / "Windows" / "Themes" / "TranscodedWallpaper"
            if transcoded.exists() and transcoded.stat().st_size > 1000:
                return transcoded
            cache = Path(appdata) / "Microsoft" / "Windows" / "Themes" / "TranscodedWallpaperCache"
            if cache.exists() and cache.stat().st_size > 1000:
                return cache

    # Linux / Kali backgrounds
    linux_paths = [
        Path.home() / ".config" / "xfce4" / "xfconf" / "xfce-perchannel-xml" / "backdrop.png",
        Path("/usr/share/backgrounds/kali-16x9/default"),
        Path("/usr/share/backgrounds/kali/kali-light.png"),
        Path("/usr/share/backgrounds/kali/kali-dark.png"),
    ]
    for lp in linux_paths:
        if lp.exists() and lp.is_file() and lp.stat().st_size > 1000:
            return lp

    # Android Termux / system wallpaper
    android_paths = [
        Path("/sdcard/Pictures/Wallpapers"),
        Path("/sdcard/Pictures/wallpaper.jpg"),
        Path("/sdcard/Pictures/wallpaper.png"),
    ]
    for ap in android_paths:
        if ap.is_file() and ap.stat().st_size > 1000:
            return ap

    return None


def load_wallpaper_config() -> dict:
    """Load persisted wallpaper configuration."""
    if WALLPAPER_CONFIG_FILE.exists():
        try:
            return json.loads(WALLPAPER_CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "active_type": "auto_screen",  # Defaults to auto-fetching screen device wallpaper
        "active_id": "s24_ambient_dark",
        "custom_root_id": None,
        "custom_rel_path": None,
        "auto_fetch": True,
        "auto_cycle": False,
        "cycle_interval_mins": 10,
        "last_cycled": 0,
        "blur_level": 16,
        "dim_level": 35,
    }


def save_wallpaper_config(cfg: dict) -> bool:
    """Save wallpaper configuration to JSON file."""
    try:
        WALLPAPER_CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        return True
    except Exception:
        return False


def discover_screen_device_wallpapers() -> dict:
    """Deep scan for wallpapers, shared screen captures, and device screenshots across all mounted roots."""
    screen_captures = []
    wallpapers = []
    camera_photos = []
    system_screen = None

    # Check host active screen wallpaper
    sys_path = get_system_screen_wallpaper_path()
    if sys_path and sys_path.exists():
        system_screen = {
            "title": "Current Device Screen Wallpaper",
            "type": "system_screen",
            "url": "/api/wallpaper/system_screen",
            "size_bytes": sys_path.stat().st_size,
            "modified": sys_path.stat().st_mtime,
        }

    roots = get_roots()
    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}

    # Windows Spotlight high-res assets
    if os.name == "nt":
        localappdata = os.environ.get("LOCALAPPDATA")
        if localappdata:
            spotlight_dir = Path(localappdata) / "Packages" / "Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy" / "LocalState" / "Assets"
            if spotlight_dir.is_dir():
                try:
                    for entry in os.scandir(spotlight_dir):
                        if entry.is_file(follow_symlinks=False) and entry.stat().st_size > 300_000:
                            # 300KB+ in assets are 1080p / 4K wallpapers
                            wallpapers.append({
                                "root_id": -1,
                                "root_name": "Windows Spotlight",
                                "rel_path": entry.name,
                                "filename": f"Spotlight_{entry.name[:8]}.jpg",
                                "url": f"/api/wallpaper/spotlight?file={entry.name}",
                                "thumbnail_url": f"/api/wallpaper/spotlight?file={entry.name}",
                                "modified": entry.stat().st_mtime,
                                "is_spotlight": True,
                            })
                            if len(wallpapers) >= 6:
                                break
                except Exception:
                    pass

    # Search in all configured storage roots
    for root in roots:
        root_path = root["path"]
        if not root_path.exists():
            continue

        target_dirs = []
        name_lower = root["name"].lower()

        # If the root itself is Pictures / Downloads / Photos
        if any(keyword in name_lower for keyword in ("picture", "photo", "camera", "dcim", "wallpaper", "screenshot")):
            target_dirs.append(root_path)

        # Standard subdirectories on Android, Linux, and Windows
        sub_candidates = [
            "Screenshots", "ScreenShots", "Screen Captures", "Captures",
            "Pictures/Screenshots", "Pictures/ScreenShots", "Pictures/Wallpapers",
            "DCIM/Screenshots", "DCIM/Camera", "DCIM",
            "Wallpapers", "Wallpaper", "Backgrounds",
            "Downloads", "Pictures"
        ]
        for sub in sub_candidates:
            sub_dir = root_path / sub
            if sub_dir.is_dir() and sub_dir not in target_dirs:
                target_dirs.append(sub_dir)

        for target_dir in target_dirs:
            try:
                for entry in os.scandir(target_dir):
                    if entry.is_file(follow_symlinks=False):
                        p = Path(entry.path)
                        if p.suffix.lower() in image_extensions:
                            try:
                                rel = p.relative_to(root_path).as_posix()
                                item_info = {
                                    "root_id": root["id"],
                                    "root_name": root["name"],
                                    "rel_path": rel,
                                    "filename": p.name,
                                    "url": f"/api/files/download?root_id={root['id']}&path={rel}",
                                    "thumbnail_url": f"/api/files/thumbnail?root_id={root['id']}&path={rel}&size=400",
                                    "modified": entry.stat().st_mtime,
                                }
                                lower_name = p.name.lower()
                                target_str = str(target_dir).lower()

                                if "screen" in lower_name or "screen" in target_str or "capture" in target_str:
                                    screen_captures.append(item_info)
                                elif "wall" in lower_name or "wall" in target_str or "bg" in lower_name:
                                    wallpapers.append(item_info)
                                else:
                                    camera_photos.append(item_info)
                            except Exception:
                                continue
                    if len(screen_captures) >= 40 and len(wallpapers) >= 40:
                        break
            except Exception:
                continue

    # Sort each category by newest first
    screen_captures.sort(key=lambda x: x["modified"], reverse=True)
    wallpapers.sort(key=lambda x: x["modified"], reverse=True)
    camera_photos.sort(key=lambda x: x["modified"], reverse=True)

    return {
        "system_screen": system_screen,
        "screen_captures": screen_captures[:30],
        "wallpapers": wallpapers[:30],
        "camera_photos": camera_photos[:30],
    }


def discover_phone_wallpapers() -> list[dict]:
    """Backward-compatible helper returning a flat list of candidates."""
    all_wp = discover_screen_device_wallpapers()
    combined = []
    if all_wp["system_screen"]:
        combined.append(all_wp["system_screen"])
    combined.extend(all_wp["screen_captures"][:15])
    combined.extend(all_wp["wallpapers"][:15])
    combined.extend(all_wp["camera_photos"][:10])
    return combined


def auto_fetch_latest_screen_wallpaper() -> dict:
    """Automatically find and activate the most recent screen device wallpaper or screenshot."""
    discovered = discover_screen_device_wallpapers()
    cfg = load_wallpaper_config()

    # 1. Prefer system screen wallpaper if available
    if discovered.get("system_screen"):
        cfg["active_type"] = "system_screen"
        save_wallpaper_config(cfg)
        return {
            "type": "system_screen",
            "url": "/api/wallpaper/system_screen",
            "blur_level": cfg.get("blur_level", 16),
            "dim_level": cfg.get("dim_level", 35),
            "accent": "#38bdf8",
            "title": "Device Screen Wallpaper",
        }

    # 2. Prefer newest shared screen capture / device screenshot
    if discovered["screen_captures"]:
        latest = discovered["screen_captures"][0]
        cfg["active_type"] = "custom"
        cfg["custom_root_id"] = latest["root_id"]
        cfg["custom_rel_path"] = latest["rel_path"]
        save_wallpaper_config(cfg)
        return {
            "type": "custom",
            "url": latest["url"],
            "blur_level": cfg.get("blur_level", 16),
            "dim_level": cfg.get("dim_level", 35),
            "accent": "#38bdf8",
            "title": f"Shared Screen ({latest['filename']})",
        }

    # 3. Fallback to One UI dark preset
    return get_current_wallpaper_state()


def get_current_wallpaper_state() -> dict:
    """Get active wallpaper styling and metadata with auto-fetch support."""
    cfg = load_wallpaper_config()
    presets_by_id = {p["id"]: p for p in PRESETS}

    active_type = cfg.get("active_type", "auto_screen")

    # If auto_screen is requested, fetch active device screen wallpaper
    if active_type == "auto_screen":
        sys_path = get_system_screen_wallpaper_path()
        if sys_path and sys_path.exists():
            return {
                "type": "system_screen",
                "url": "/api/wallpaper/system_screen",
                "blur_level": cfg.get("blur_level", 16),
                "dim_level": cfg.get("dim_level", 35),
                "accent": "#38bdf8",
                "title": "Live Device Screen Wallpaper",
                "auto_fetch": cfg.get("auto_fetch", True),
            }

    if active_type == "system_screen":
        return {
            "type": "system_screen",
            "url": "/api/wallpaper/system_screen",
            "blur_level": cfg.get("blur_level", 16),
            "dim_level": cfg.get("dim_level", 35),
            "accent": "#38bdf8",
            "title": "Live Device Screen Wallpaper",
            "auto_fetch": cfg.get("auto_fetch", True),
        }

    if active_type == "custom" and cfg.get("custom_rel_path"):
        return {
            "type": "custom",
            "url": f"/api/files/download?root_id={cfg.get('custom_root_id')}&path={cfg.get('custom_rel_path')}",
            "blur_level": cfg.get("blur_level", 16),
            "dim_level": cfg.get("dim_level", 35),
            "accent": "#38bdf8",
            "title": "Custom Device Wallpaper",
            "auto_fetch": cfg.get("auto_fetch", True),
        }

    # Preset fallback
    preset = presets_by_id.get(cfg.get("active_id"), PRESETS[0])
    return {
        "type": "preset",
        "preset_id": preset["id"],
        "title": preset["title"],
        "gradient": preset["gradient"],
        "accent": preset["accent"],
        "blur_level": cfg.get("blur_level", 16),
        "dim_level": cfg.get("dim_level", 35),
        "auto_fetch": cfg.get("auto_fetch", True),
    }
