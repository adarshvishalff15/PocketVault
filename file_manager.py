"""File manager module for safe local filesystem operations.

Handles directory listing, recursive search, upload streaming, rename,
copy/move, delete, and storage quota/disk usage inspection.
"""

from datetime import datetime
from pathlib import Path
import math
import mimetypes
import os
import shutil
import tempfile
import zipfile
from config import ROOTS, get_root_by_id, get_file_category, MEDIA_EXTENSIONS
from security import is_within_root, safe_resolve_path, sanitize_filename


def human_size(size_bytes: int) -> str:
    """Format bytes into human readable format (B, KB, MB, GB, TB)."""
    if size_bytes == 0:
        return "0 B"
    units = ("B", "KB", "MB", "GB", "TB", "PB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {units[i]}"


def get_storage_info(root_path: Path) -> dict:
    """Retrieve drive/disk usage for a path."""
    try:
        usage = shutil.disk_usage(root_path)
        percent_used = round((usage.used / usage.total) * 100, 1) if usage.total > 0 else 0
        return {
            "total": usage.total,
            "total_human": human_size(usage.total),
            "free": usage.free,
            "free_human": human_size(usage.free),
            "used": usage.used,
            "used_human": human_size(usage.used),
            "percent_used": percent_used,
        }
    except Exception:
        return {
            "total": 0, "total_human": "Unknown",
            "free": 0, "free_human": "Unknown",
            "used": 0, "used_human": "Unknown",
            "percent_used": 0,
        }


def list_directory(
    root_id: int,
    rel_path: str = "",
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    per_page: int = 100,
    search_query: str = "",
) -> dict:
    """Safely inspects and lists directory contents with sorting and pagination."""
    root_info = get_root_by_id(root_id)
    if not root_info:
        raise ValueError("Invalid root ID.")

    root_path = root_info["path"]
    target_path = safe_resolve_path(root_path, rel_path)

    if not target_path.exists():
        raise FileNotFoundError("Directory not found.")
    if not target_path.is_dir():
        raise NotADirectoryError("The requested path is not a directory.")

    # Canonical relative path for breadcrumbs
    try:
        norm_rel = target_path.relative_to(root_path).as_posix()
        if norm_rel == ".":
            norm_rel = ""
    except Exception:
        norm_rel = rel_path.replace("\\", "/").strip("/")

    crumbs = [{"name": root_info["name"], "path": ""}]
    if norm_rel:
        acc = []
        for part in norm_rel.split("/"):
            if part:
                acc.append(part)
                crumbs.append({"name": part, "path": "/".join(acc)})

    entries = []
    query_lower = search_query.strip().lower()

    try:
        with os.scandir(target_path) as it:
            for entry in it:
                try:
                    name = entry.name
                    # Filter if quick search is provided
                    if query_lower and query_lower not in name.lower():
                        continue

                    # Direct inspection using entry caching for ultra-fast network drive operations
                    is_symlink = entry.is_symlink()
                    is_dir = entry.is_dir(follow_symlinks=not is_symlink)
                    is_file = entry.is_file(follow_symlinks=not is_symlink)

                    if not (is_dir or is_file):
                        continue

                    candidate = target_path / name

                    # For symlinks, verify they don't escape root
                    if is_symlink and not is_within_root(root_path, candidate):
                        continue

                    try:
                        stat = entry.stat(follow_symlinks=False)
                        size = stat.st_size if is_file else 0
                        mtime = stat.st_mtime
                        mtime_dt = datetime.fromtimestamp(mtime)
                    except (OSError, RuntimeError):
                        size = 0
                        mtime = 0
                        mtime_dt = datetime.now()

                    ext = candidate.suffix.lower() if is_file else ""
                    cat = "folder" if is_dir else get_file_category(ext)

                    rel_item_path = f"{norm_rel}/{name}" if norm_rel else name
                    mime_type = mimetypes.guess_type(name)[0] or "application/octet-stream"

                    entries.append({
                        "name": name,
                        "rel_path": rel_item_path,
                        "is_dir": is_dir,
                        "size": size,
                        "size_human": human_size(size) if is_file else "—",
                        "modified_ts": mtime,
                        "modified_str": mtime_dt.strftime("%Y-%m-%d %H:%M"),
                        "modified_human": mtime_dt.strftime("%Y-%m-%d %H:%M"),
                        "extension": ext,
                        "category": cat,
                        "mime_type": mime_type,
                        "can_preview": cat in ("image", "pdf", "document", "presentation", "spreadsheet", "text", "archive"),
                        "can_stream": cat in ("audio", "video"),
                        "is_executable": cat == "executable",
                    })
                except (OSError, RuntimeError, PermissionError, ValueError):
                    continue
    except PermissionError:
        raise PermissionError("Access denied by the operating system.")
    except (FileNotFoundError, NotADirectoryError):
        raise
    except OSError as e:
        raise OSError(f"Network drive or storage error: {e.strerror or str(e)}")

    # Sorting
    reverse = sort_order.lower() == "desc"
    if sort_by == "size":
        entries.sort(key=lambda x: (not x["is_dir"], x["size"]), reverse=reverse)
    elif sort_by == "date":
        entries.sort(key=lambda x: (not x["is_dir"], x["modified_ts"]), reverse=reverse)
    elif sort_by == "type":
        entries.sort(key=lambda x: (not x["is_dir"], x["category"], x["name"].lower()), reverse=reverse)
    else:  # name
        entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()), reverse=reverse)

    total_count = len(entries)
    total_pages = max(1, math.ceil(total_count / per_page))
    page = max(1, min(page, total_pages))
    start_idx = (page - 1) * per_page
    paginated_entries = entries[start_idx : start_idx + per_page]

    return {
        "root_id": root_id,
        "root_name": root_info["name"],
        "current_path": norm_rel,
        "breadcrumbs": crumbs,
        "storage": get_storage_info(root_path),
        "total": total_count,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "items": paginated_entries,
    }


def search_files_recursive(
    root_id: int,
    query: str,
    category_filter: str = "",
    max_results: int = 150,
) -> list[dict]:
    """Safe, fast recursive search with depth limit, ignore sets, and execution budget."""
    root_info = get_root_by_id(root_id)
    if not root_info:
        return []

    root_path = root_info["path"]
    query_lower = query.strip().lower()
    match_all = not query_lower or query_lower in (".", "*")
    results = []

    # If searching whole-drive root, limit depth to 2; for library folders limit to 4
    is_drive_root = (root_info.get("type") == "drive" or len(root_path.parts) <= 1)
    max_depth = 2 if is_drive_root else 4

    IGNORED_DIRS = {
        "System Volume Information", "node_modules", "Windows", "Program Files",
        "Program Files (x86)", "ProgramData", "AppData", "Recovery", "boot",
        "__pycache__", ".git", "venv", ".venv", "env", "site-packages", "usr",
        "etc", "var", "lib", "proc", "sys", "dev", "Temp", "Cache", "cache"
    }

    import time
    start_time = time.time()

    for root_dir, dirs, files in os.walk(root_path, followlinks=False):
        # Time budget per root (max 0.4 seconds)
        if (time.time() - start_time) > 0.4:
            break

        try:
            rel_depth = len(Path(root_dir).relative_to(root_path).parts)
            if rel_depth > max_depth:
                dirs.clear()
                continue
        except Exception:
            dirs.clear()
            continue

        dirs[:] = [d for d in dirs if not d.startswith((".", "$")) and d not in IGNORED_DIRS]

        for name in files:
            if match_all or query_lower in name.lower():
                try:
                    candidate = safe_resolve_path(Path(root_dir), name)
                    if not candidate.is_file():
                        continue

                    ext = candidate.suffix.lower()
                    cat = get_file_category(ext)
                    if category_filter and category_filter != "all" and cat != category_filter:
                        continue

                    stat = candidate.stat()
                    rel_item_path = candidate.relative_to(root_path).as_posix()

                    results.append({
                        "root_id": root_id,
                        "root_name": root_info["name"],
                        "name": name,
                        "rel_path": rel_item_path,
                        "is_dir": False,
                        "size": stat.st_size,
                        "size_human": human_size(stat.st_size),
                        "modified_ts": stat.st_mtime,
                        "modified_str": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                        "modified_human": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                        "category": cat,
                        "extension": ext,
                        "can_preview": cat in ("image", "pdf", "document", "presentation", "spreadsheet", "text", "archive"),
                        "can_stream": cat in ("audio", "video"),
                        "is_executable": cat == "executable",
                    })

                    if len(results) >= max_results:
                        return results
                except Exception:
                    continue

    return results


def create_directory(root_id: int, parent_rel_path: str, folder_name: str) -> str:
    """Create a new folder safely (Disabled in Read-Only v1.0)."""
    raise PermissionError("PocketVault v1.0 is running in READ-ONLY mode. Folder creation is disabled.")


def delete_items(root_id: int, rel_paths: list[str]) -> tuple[int, list[str]]:
    """Delete files or folders safely (Disabled in Read-Only v1.0)."""
    raise PermissionError("PocketVault v1.0 is running in READ-ONLY mode. File deletion is disabled.")


def rename_item(root_id: int, rel_path: str, new_name: str) -> str:
    """Rename a file or folder safely (Disabled in Read-Only v1.0)."""
    raise PermissionError("PocketVault v1.0 is running in READ-ONLY mode. Renaming files or folders is disabled.")


def copy_or_move_items(
    src_root_id: int,
    dest_root_id: int,
    rel_paths: list[str],
    dest_rel_path: str,
    is_copy: bool = False,
) -> tuple[int, list[str]]:
    """Copy or move items safely (Disabled in Read-Only v1.0)."""
    raise PermissionError("PocketVault v1.0 is running in READ-ONLY mode. Copy/move operations are disabled.")


def save_upload(root_id: int, dest_rel_path: str, file_storage, overwrite: bool = False) -> str:
    """Save an uploaded file safely (Disabled in Read-Only v1.0)."""
    raise PermissionError("PocketVault v1.0 is running in READ-ONLY mode. File uploads are disabled.")


def create_batch_zip(root_id: int, rel_paths: list[str]) -> Path:
    """Create a temporary zip file containing the selected items for bulk download.
    
    Handles individual files, folders (preserving structure), and avoids duplicate name collisions.
    """
    root_info = get_root_by_id(root_id)
    if not root_info:
        raise ValueError("Invalid root.")

    temp_zip = Path(tempfile.gettempdir()) / f"download_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.getpid()}_{id(rel_paths)}.zip"
    used_arcnames = set()

    with zipfile.ZipFile(temp_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel in rel_paths:
            try:
                target = safe_resolve_path(root_info["path"], rel)
                if not target.exists():
                    continue

                if target.is_file():
                    base_name = target.name
                    arcname = base_name
                    counter = 1
                    stem = target.stem
                    suffix = target.suffix
                    while arcname in used_arcnames:
                        arcname = f"{stem} ({counter}){suffix}"
                        counter += 1
                    used_arcnames.add(arcname)
                    zf.write(target, arcname=arcname)

                elif target.is_dir():
                    # Preserve folder structure starting from the folder's name
                    folder_root_name = target.name
                    for root_folder, _, files in os.walk(target):
                        for f in files:
                            full_f = Path(root_folder) / f
                            rel_to_target = full_f.relative_to(target).as_posix()
                            arcname = f"{folder_root_name}/{rel_to_target}"
                            zf.write(full_f, arcname=arcname)
            except Exception:
                continue

    return temp_zip
