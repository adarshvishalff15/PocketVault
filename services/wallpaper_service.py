"""Phone Wallpaper Service for PocketVault.

Discovers authentic wallpapers on Android device storage (e.g. Pictures/Wallpapers,
DCIM/Camera), manages presets, and persists active wallpaper preferences.
"""

from pathlib import Path
import json
import os
import shutil
from config import DATA_DIR, get_roots

WALLPAPER_CONFIG_FILE = DATA_DIR / "wallpaper_config.json"
WALLPAPER_PRESETS_DIR = DATA_DIR / "wallpapers"
WALLPAPER_PRESETS_DIR.mkdir(exist_ok=True, parents=True)

# Default presets
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
        "title": "One UI Neon Glow",
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
]


def load_wallpaper_config() -> dict:
    """Load persisted wallpaper configuration."""
    if WALLPAPER_CONFIG_FILE.exists():
        try:
            return json.loads(WALLPAPER_CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "active_type": "preset",
        "active_id": "s24_ambient_dark",
        "custom_root_id": None,
        "custom_rel_path": None,
        "blur_level": 20,
        "dim_level": 40,
    }


def save_wallpaper_config(cfg: dict) -> bool:
    """Save wallpaper configuration to JSON file."""
    try:
        WALLPAPER_CONFIG_FILE.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        return True
    except Exception:
        return False


def discover_phone_wallpapers() -> list[dict]:
    """Scan authorized storage roots for wallpaper candidate images."""
    candidates = []
    roots = get_roots()

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}

    for root in roots:
        root_path = root["path"]
        if not root_path.exists():
            continue

        # Look specifically in folders likely to contain wallpapers or photos
        target_dirs = []
        name_lower = root["name"].lower()
        if any(keyword in name_lower for keyword in ("picture", "photo", "camera", "dcim", "wallpaper")):
            target_dirs.append(root_path)
        else:
            for sub in ("Pictures", "Wallpapers", "DCIM/Camera", "DCIM"):
                sub_dir = root_path / sub
                if sub_dir.is_dir():
                    target_dirs.append(sub_dir)

        for target_dir in target_dirs:
            try:
                for entry in os.scandir(target_dir):
                    if entry.is_file(follow_symlinks=False):
                        p = Path(entry.path)
                        if p.suffix.lower() in image_extensions:
                            try:
                                rel = p.relative_to(root_path).as_posix()
                                candidates.append({
                                    "root_id": root["id"],
                                    "root_name": root["name"],
                                    "rel_path": rel,
                                    "filename": p.name,
                                    "url": f"/api/files/download?root_id={root['id']}&path={rel}",
                                    "thumbnail_url": f"/api/files/thumbnail?root_id={root['id']}&path={rel}&size=400",
                                })
                            except Exception:
                                continue
                    if len(candidates) >= 30:
                        break
            except Exception:
                continue

        if len(candidates) >= 30:
            break

    return candidates


def get_current_wallpaper_state() -> dict:
    """Get active wallpaper styling and metadata."""
    cfg = load_wallpaper_config()
    presets_by_id = {p["id"]: p for p in PRESETS}

    active_type = cfg.get("active_type", "preset")
    if active_type == "custom" and cfg.get("custom_rel_path"):
        return {
            "type": "custom",
            "url": f"/api/files/download?root_id={cfg.get('custom_root_id')}&path={cfg.get('custom_rel_path')}",
            "blur_level": cfg.get("blur_level", 20),
            "dim_level": cfg.get("dim_level", 40),
            "accent": "#38bdf8",
            "title": "Custom Phone Wallpaper",
        }

    # Preset fallback
    preset = presets_by_id.get(cfg.get("active_id"), PRESETS[0])
    return {
        "type": "preset",
        "preset_id": preset["id"],
        "title": preset["title"],
        "gradient": preset["gradient"],
        "accent": preset["accent"],
        "blur_level": cfg.get("blur_level", 20),
        "dim_level": cfg.get("dim_level", 40),
    }

