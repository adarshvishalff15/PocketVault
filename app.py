"""Main Flask application for the Windows 11 Remote File & Media Access Platform.

Provides secure REST APIs, session-based authentication, CSRF validation,
rate-limiting, streaming media, document previews, and Windows 11 desktop workspace.
"""

from datetime import timedelta
from flask import (
    Flask, jsonify, render_template, request, Response,
    send_file, session, redirect, url_for, abort, make_response
)
from pathlib import Path
import mimetypes
import os
import sys

from config import (
    APP_NAME, BASE_DIR, DATA_DIR, HOST, PORT, DEBUG,
    SECRET_KEY, SESSION_LIFETIME, ROOTS, get_root_by_id, get_roots
)
from security import (
    audit_log, check_rate_limit, get_client_ip, get_or_create_csrf_token,
    get_recent_audit_logs, record_login_failure, reset_login_attempts,
    safe_resolve_path, validate_csrf
)
from auth import (
    authenticate, can_access_root, create_user, delete_user,
    get_current_user, has_permission, init_auth, is_setup_needed,
    list_users, update_user
)
from file_manager import (
    copy_or_move_items, create_batch_zip, create_directory,
    delete_items, get_storage_info, list_directory, rename_item, save_upload,
    search_files_recursive
)
from preview_manager import (
    get_file_checksum, get_image_metadata, get_image_thumbnail_data,
    get_stream_response, inspect_zip_archive, parse_docx,
    parse_pptx, parse_spreadsheet, read_text_preview
)

# Initialize Flask app
app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = SECRET_KEY
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(seconds=SESSION_LIFETIME)
app.config["MAX_CONTENT_LENGTH"] = 4 * 1024 * 1024 * 1024  # 4 GB max upload
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True when served over HTTPS
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0  # Disable static asset caching for live desktop updates

# Initialize auth system on load
init_auth()


# --- Security Middleware ---

READONLY_BLOCKED_PATHS = {
    "/api/upload", "/api/delete", "/api/rename", "/api/folder",
    "/api/mkdir", "/api/move_copy"
}

@app.before_request
def check_security():
    # Enforce Read-Only v1.0 safety guarantee on all modification endpoints
    if request.path in READONLY_BLOCKED_PATHS:
        return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. Modification operations are disabled."}), 403

    # Enforce CSRF on state-changing API requests
    if request.path.startswith("/api/") and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        # Login and setup create initial session, so they don't require pre-existing CSRF
        if request.path not in ("/api/auth/login", "/api/auth/setup", "/api/wallpaper/set", "/api/wallpaper/auto_fetch"):
            if not validate_csrf():
                audit_log("CSRF_VIOLATION", session.get("username", "anonymous"), "DENIED", f"Path: {request.path}")
                return jsonify({"success": False, "error": "Invalid or missing CSRF token."}), 403


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# --- Helper decorators & functions ---

def require_auth():
    """Ensure user is logged in, else return JSON 401 error."""
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required.", "auth_required": True}), 401
    return None


def get_authorized_root(root_id_arg):
    try:
        root_id = int(root_id_arg)
    except (TypeError, ValueError):
        return None, (jsonify({"success": False, "error": "Invalid root ID."}), 400)

    if not can_access_root(root_id):
        audit_log("ROOT_ACCESS_DENIED", session.get("username", "anonymous"), "DENIED", f"Root ID: {root_id}")
        return None, (jsonify({"success": False, "error": "Permission denied for this shared folder."}), 403)

    root_info = get_root_by_id(root_id)
    if not root_info:
        return None, (jsonify({"success": False, "error": "Shared folder not found."}), 404)

    return root_info, None


# --- Web Page Routes ---

@app.route("/")
def index():
    return render_template(
        "index.html",
        app_name=APP_NAME,
        is_setup=is_setup_needed(),
        csrf_token=get_or_create_csrf_token()
    )


# --- Authentication API ---

@app.route("/api/auth/status")
def auth_status():
    user = get_current_user()
    setup = is_setup_needed()
    token = get_or_create_csrf_token()

    if not user:
        return jsonify({
            "authenticated": False,
            "setup_needed": setup,
            "csrf_token": token,
            "server_name": APP_NAME,
        })

    return jsonify({
        "authenticated": True,
        "setup_needed": False,
        "username": user["username"],
        "display_name": user.get("display_name", user["username"]),
        "role": user.get("role", "user"),
        "permissions": user.get("permissions", {}),
        "allowed_roots": user.get("allowed_roots", ["*"]),
        "csrf_token": token,
        "server_name": APP_NAME,
    })


@app.route("/api/auth/setup", methods=["POST"])
def auth_setup():
    if not is_setup_needed():
        return jsonify({"success": False, "error": "Setup has already been completed."}), 400

    data = request.get_json(silent=True) or request.form
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()
    display_name = (data.get("display_name") or "").strip()

    if len(username) < 3:
        return jsonify({"success": False, "error": "Username must be at least 3 characters."}), 400
    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters for security."}), 400

    success, msg = create_user(
        username=username,
        password=password,
        display_name=display_name or username.capitalize(),
        role="admin",
        allowed_roots=["*"],
    )

    if not success:
        return jsonify({"success": False, "error": msg}), 400

    session.permanent = False
    session["username"] = username.lower()
    token = get_or_create_csrf_token()

    audit_log("SETUP_ADMIN_CREATED", username, "SUCCESS", "First-time setup completed.")
    return jsonify({"success": True, "message": "Admin account initialized.", "csrf_token": token})


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    ip = get_client_ip()
    is_locked, remaining = check_rate_limit(ip)
    if is_locked:
        audit_log("LOGIN_LOCKED_OUT", ip, "DENIED", f"IP locked out. Remaining: {remaining}s")
        return jsonify({
            "success": False,
            "error": f"Too many failed attempts. Temporary lockout active. Try again in {int(remaining/60) + 1} minutes."
        }), 429

    data = request.get_json(silent=True) or request.form
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    # Also check rate limit on username if provided
    if username:
        u_locked, u_remaining = check_rate_limit(username.lower())
        if u_locked:
            audit_log("LOGIN_LOCKED_OUT", username, "DENIED", f"User account locked. Remaining: {u_remaining}s")
            return jsonify({
                "success": False,
                "error": f"Too many failed attempts for this account. Try again in {int(u_remaining/60) + 1} minutes."
            }), 429

    success, user, error_msg = authenticate(username, password)
    if not success:
        record_login_failure(ip)
        if username:
            record_login_failure(username.lower())
        audit_log("LOGIN_FAILED", username or "unknown", "DENIED", error_msg)
        return jsonify({"success": False, "error": error_msg}), 401

    # Successful login
    reset_login_attempts(ip)
    reset_login_attempts(username.lower())

    session.permanent = False
    session["username"] = user["username"]
    token = get_or_create_csrf_token()

    audit_log("LOGIN_SUCCESS", user["username"], "SUCCESS", "Logged in from web client.")

    return jsonify({
        "success": True,
        "username": user["username"],
        "display_name": user.get("display_name", user["username"]),
        "role": user.get("role", "user"),
        "permissions": user.get("permissions", {}),
        "csrf_token": token,
    })


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    username = session.get("username", "anonymous")
    audit_log("LOGOUT", username, "SUCCESS", "Logged out.")
    session.clear()
    return jsonify({"success": True})


# --- File System API ---

@app.route("/api/roots")
def api_roots():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    accessible = []
    roots = get_roots(force_refresh=True)
    for r in roots:
        if can_access_root(r["id"]):
            accessible.append({
                "id": r["id"],
                "name": r["name"],
                "type": r["type"],
                "drive_type": r.get("drive_type", r["type"]),
                "remote_name": r.get("remote_name", ""),
                "storage": get_storage_info(r["path"]),
            })

    return jsonify({"success": True, "roots": accessible})


@app.route("/api/storage/info")
@app.route("/api/storage")
def api_storage_info_endpoint():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    roots = get_roots()
    if not roots:
        return jsonify({"success": True, "storage": {"percent_used": 0, "free_human": "N/A", "total_human": "N/A"}})

    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
    try:
        root_id = int(root_arg)
    except (TypeError, ValueError):
        root_id = 0

    root_info = get_root_by_id(root_id) or roots[0]
    storage = get_storage_info(root_info["path"])
    return jsonify({
        "success": True,
        "storage": storage,
        "root_id": root_info["id"],
        "root_name": root_info["name"],
        "roots_count": len(roots),
    })


@app.route("/api/browse")
@app.route("/api/files/list")
def api_browse():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    if not has_permission("read"):
        return jsonify({"success": False, "error": "Permission denied: read access disabled."}), 403

    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
    root_info, err = get_authorized_root(root_arg)
    if err:
        return err

    rel_path = request.args.get("path", "")
    sort_by = request.args.get("sort_by", "name")
    sort_order = request.args.get("sort_order", "asc")
    search_q = request.args.get("search", "")

    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 250))
    except (ValueError, TypeError):
        page, per_page = 1, 250

    try:
        data = list_directory(
            root_id=root_info["id"],
            rel_path=rel_path,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page,
            search_query=search_q,
        )
        directories = [i for i in data.get("items", []) if i.get("is_dir")]
        files = [i for i in data.get("items", []) if not i.get("is_dir")]
        return jsonify({
            "success": True,
            **data,
            "directories": directories,
            "files": files,
        })
    except FileNotFoundError:
        return jsonify({"success": False, "error": "Directory not found."}), 404
    except PermissionError as pe:
        return jsonify({"success": False, "error": str(pe)}), 403
    except OSError as oe:
        return jsonify({"success": False, "error": str(oe)}), 500
    except Exception as e:
        return jsonify({"success": False, "error": f"Could not access folder: {e}"}), 500


@app.route("/api/search")
@app.route("/api/files/search")
def api_search():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    if not has_permission("read"):
        return jsonify({"success": False, "error": "Permission denied."}), 403

    query = (request.args.get("query") or request.args.get("q") or "").strip()
    category = request.args.get("category", "")
    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id")

    if root_arg is not None and str(root_arg).strip() != "":
        root_info, err = get_authorized_root(root_arg)
        if err:
            return err
        results = search_files_recursive(root_info["id"], query, category_filter=category)
        return jsonify({"success": True, "root_id": root_info["id"], "results": results})

    # If no root specified, search across all accessible roots
    all_results = []
    roots = get_roots()
    for r in roots:
        if can_access_root(r["id"]):
            try:
                res = search_files_recursive(r["id"], query, category_filter=category, max_results=50)
                all_results.extend(res)
                if len(all_results) >= 200:
                    break
            except Exception:
                continue

    return jsonify({"success": True, "results": all_results})


@app.route("/api/folder", methods=["POST"])
@app.route("/api/mkdir", methods=["POST"])
def api_create_folder():
    return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. Folder creation is disabled."}), 403


@app.route("/api/rename", methods=["POST"])
def api_rename():
    return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. Renaming is disabled."}), 403


@app.route("/api/delete", methods=["POST"])
def api_delete():
    return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. Deletion is disabled."}), 403


@app.route("/api/move_copy", methods=["POST"])
def api_move_copy():
    return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. File operations are disabled."}), 403


@app.route("/api/upload", methods=["POST"])
def api_upload():
    return jsonify({"success": False, "error": "PocketVault v1.0 is running in READ-ONLY mode. File uploads are disabled."}), 403


# --- Mobile Phone Apps & Dynamic Wallpaper API ---

@app.route("/api/apps/list")
def api_apps_list():
    auth_err = require_auth()
    if auth_err:
        return auth_err
    from services.app_scanner import scan_host_packages
    apps = scan_host_packages()
    return jsonify({"success": True, "apps": apps, "total": len(apps)})


@app.route("/api/wallpaper/current")
def api_wallpaper_current():
    from services.wallpaper_service import get_current_wallpaper_state
    return jsonify({"success": True, "wallpaper": get_current_wallpaper_state()})


@app.route("/api/wallpaper/system_screen")
def api_wallpaper_system_screen():
    """Serve host active screen wallpaper (Windows TranscodedWallpaper / Linux background)."""
    from services.wallpaper_service import get_system_screen_wallpaper_path
    wp_path = get_system_screen_wallpaper_path()
    if not wp_path or not wp_path.exists():
        return abort(404)
    return send_file(wp_path, mimetype="image/jpeg", max_age=3600)


@app.route("/api/wallpaper/spotlight")
def api_wallpaper_spotlight():
    """Serve Windows Spotlight high-res screen assets."""
    file_name = request.args.get("file", "")
    if not file_name or "/" in file_name or "\\" in file_name:
        return abort(400)
    localappdata = os.environ.get("LOCALAPPDATA")
    if not localappdata:
        return abort(404)
    spot_file = Path(localappdata) / "Packages" / "Microsoft.Windows.ContentDeliveryManager_cw5n1h2txyewy" / "LocalState" / "Assets" / file_name
    if not spot_file.exists():
        return abort(404)
    return send_file(spot_file, mimetype="image/jpeg", max_age=86400)


@app.route("/api/wallpaper/list")
def api_wallpaper_list():
    auth_err = require_auth()
    if auth_err:
        return auth_err
    from services.wallpaper_service import (
        PRESETS, discover_screen_device_wallpapers, load_wallpaper_config
    )
    discovered = discover_screen_device_wallpapers()
    cfg = load_wallpaper_config()
    return jsonify({
        "success": True,
        "presets": PRESETS,
        "system_screen": discovered.get("system_screen"),
        "screen_captures": discovered.get("screen_captures", []),
        "wallpapers": discovered.get("wallpapers", []),
        "camera_photos": discovered.get("camera_photos", []),
        "auto_fetch": cfg.get("auto_fetch", True),
        "auto_cycle": cfg.get("auto_cycle", False),
    })


@app.route("/api/wallpaper/auto_fetch", methods=["GET", "POST"])
def api_wallpaper_auto_fetch():
    """Rescan and automatically fetch latest wallpapers from shared screen devices."""
    auth_err = require_auth()
    if auth_err:
        return auth_err
    from services.wallpaper_service import (
        auto_fetch_latest_screen_wallpaper, discover_screen_device_wallpapers
    )
    if request.method == "POST":
        new_state = auto_fetch_latest_screen_wallpaper()
        return jsonify({
            "success": True,
            "message": "Auto-fetched latest screen wallpaper from shared devices.",
            "wallpaper": new_state,
        })
    discovered = discover_screen_device_wallpapers()
    return jsonify({
        "success": True,
        "discovered": discovered,
    })


@app.route("/api/wallpaper/set", methods=["POST"])
def api_wallpaper_set():
    auth_err = require_auth()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or request.form
    from services.wallpaper_service import load_wallpaper_config, save_wallpaper_config
    cfg = load_wallpaper_config()
    if "preset_id" in data:
        cfg["active_type"] = "preset"
        cfg["active_id"] = data["preset_id"]
    elif data.get("active_type") == "system_screen":
        cfg["active_type"] = "system_screen"
    elif data.get("active_type") == "auto_screen":
        cfg["active_type"] = "auto_screen"
    elif "custom_rel_path" in data:
        cfg["active_type"] = "custom"
        cfg["custom_root_id"] = int(data.get("root_id", 0))
        cfg["custom_rel_path"] = data["custom_rel_path"]
    if "auto_fetch" in data:
        cfg["auto_fetch"] = bool(data["auto_fetch"])
    if "blur_level" in data:
        cfg["blur_level"] = int(data["blur_level"])
    if "dim_level" in data:
        cfg["dim_level"] = int(data["dim_level"])
    save_wallpaper_config(cfg)
    return jsonify({"success": True, "message": "Wallpaper updated successfully."})


@app.route("/api/system/status")
def api_system_status():
    auth_err = require_auth()
    if auth_err:
        return auth_err
    from config import is_android_environment, PORT, ROOTS
    import platform
    return jsonify({
        "success": True,
        "server_name": APP_NAME,
        "port": PORT,
        "is_android": is_android_environment(),
        "platform": platform.platform(),
        "roots_count": len(ROOTS),
        "mode": "READ-ONLY v1.0",
    })


def execute_download(root_id_arg, paths):
    """Unified download handler fulfilling all Master Prompt requirements.
    
    A. 1 file selected: downloads original file directly (preserves name, extension, mime, no zip).
    B. Multiple files selected: downloads as 'Selected_Files.zip' with automatic temp cleanup.
    C. Folder selected: downloads as '<FolderName>.zip' preserving folder hierarchy.
    """
    auth_err = require_auth()
    if auth_err:
        return auth_err

    if not has_permission("download"):
        return jsonify({"success": False, "error": "Permission denied: download disabled."}), 403

    root_info, err = get_authorized_root(root_id_arg)
    if err:
        return err

    if isinstance(paths, str):
        paths = [paths]
    paths = [p for p in paths if p is not None and str(p).strip() != ""]

    if not paths:
        return jsonify({"success": False, "error": "No items specified for download."}), 400

    try:
        # CASE A & C: Exactly ONE item selected
        if len(paths) == 1:
            target = safe_resolve_path(root_info["path"], paths[0])
            if not target.exists():
                return jsonify({"success": False, "error": "Item not found."}), 404

            if target.is_file():
                # Single ordinary file: DOWNLOAD DIRECTLY. Never wrap in ZIP.
                audit_log("FILE_DOWNLOAD", session["username"], "SUCCESS", f"Downloaded: {target.name}")
                mime_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
                return send_file(
                    target,
                    as_attachment=True,
                    download_name=target.name,
                    mimetype=mime_type,
                    conditional=True,
                    etag=True
                )
            elif target.is_dir():
                # Single folder: Download as folder-named ZIP preserving directory structure
                zip_path = create_batch_zip(root_info["id"], [paths[0]])
                audit_log("FOLDER_DOWNLOAD", session["username"], "SUCCESS", f"Downloaded folder: {target.name}.zip")
                resp = send_file(
                    zip_path,
                    as_attachment=True,
                    download_name=f"{target.name}.zip",
                    mimetype="application/zip"
                )
                resp.call_on_close(lambda: zip_path.unlink(missing_ok=True))
                return resp

        # CASE B: MULTIPLE items selected -> Download as Selected_Files.zip
        zip_path = create_batch_zip(root_info["id"], paths)
        audit_log("BATCH_DOWNLOAD", session["username"], "SUCCESS", f"{len(paths)} items zipped as Selected_Files.zip")
        resp = send_file(
            zip_path,
            as_attachment=True,
            download_name="Selected_Files.zip",
            mimetype="application/zip"
        )
        resp.call_on_close(lambda: zip_path.unlink(missing_ok=True))
        return resp
    except PermissionError:
        abort(403)
    except Exception as e:
        return jsonify({"success": False, "error": f"Download failed: {str(e)}"}), 500


@app.route("/api/download", methods=["GET", "POST"])
@app.route("/api/files/download", methods=["GET", "POST"])
@app.route("/api/batch_download", methods=["GET", "POST"])
def api_download_endpoint():
    if request.method == "GET":
        root_id = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
        paths = [request.args.get("path")] if request.args.get("path") else None
    else:
        data = request.get_json(silent=True) or request.form
        root_id = data.get("root") if data.get("root") is not None else data.get("root_id", 0)
        paths = data.get("paths")
        if not paths and data.get("path"):
            paths = [data.get("path")]

    return execute_download(root_id, paths or [])


@app.route("/download", methods=["GET", "POST"])
def download():
    """Preserves original download route with full support for single-file, folder, and batch downloads."""
    if request.method == "GET":
        root_id = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
        paths = [request.args.get("path")] if request.args.get("path") else None
    else:
        data = request.get_json(silent=True) or request.form
        root_id = data.get("root") if data.get("root") is not None else data.get("root_id", 0)
        paths = data.get("paths")
        if not paths and data.get("path"):
            paths = [data.get("path")]

    return execute_download(root_id, paths or [])


@app.route("/api/properties")
def api_properties():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    rel_path = request.args.get("path", "")
    try:
        target = safe_resolve_path(root_info["path"], rel_path)
        if not target.exists():
            return jsonify({"success": False, "error": "Item not found."}), 404

        if target.is_file():
            checksum_data = get_file_checksum(target)
            return jsonify({
                "success": True,
                "is_dir": False,
                "root_name": root_info["name"],
                **checksum_data
            })
        else:
            stat = target.stat()
            return jsonify({
                "success": True,
                "is_dir": True,
                "filename": target.name,
                "root_name": root_info["name"],
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route("/stream")
@app.route("/api/stream")
@app.route("/api/files/stream")
def stream_file():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    if not has_permission("stream"):
        return jsonify({"success": False, "error": "Permission denied: media streaming disabled."}), 403

    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
    root_info, err = get_authorized_root(root_arg)
    if err:
        return err

    rel_path = request.args.get("path", "")
    try:
        target = safe_resolve_path(root_info["path"], rel_path)
        if not target.is_file():
            abort(404)
        return get_stream_response(target)
    except PermissionError:
        abort(403)
    except Exception:
        abort(404)


@app.route("/thumbnail")
@app.route("/api/thumbnail")
@app.route("/api/files/thumbnail")
def image_thumbnail():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
    root_info, err = get_authorized_root(root_arg)
    if err:
        return err

    rel_path = request.args.get("path", "")
    try:
        target = safe_resolve_path(root_info["path"], rel_path)
        if not target.is_file():
            abort(404)
        data = get_image_thumbnail_data(target)
        resp = make_response(data)
        resp.headers["Content-Type"] = "image/webp"
        resp.headers["Cache-Control"] = "public, max-age=86400"
        return resp
    except Exception:
        abort(404)


@app.route("/preview")
@app.route("/api/preview")
def preview():
    """Preserves original preview route with safe content type and range support."""
    auth_err = require_auth()
    if auth_err:
        return auth_err

    if not has_permission("preview"):
        return jsonify({"success": False, "error": "Permission denied: preview disabled."}), 403

    root_arg = request.args.get("root") if request.args.get("root") is not None else request.args.get("root_id", 0)
    root_info, err = get_authorized_root(root_arg)
    if err:
        return err

    rel_path = request.args.get("path", "")
    try:
        target = safe_resolve_path(root_info["path"], rel_path)
        if not target.is_file():
            abort(404)

        mime_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        # Always serve text files as text/plain so scripts and html cannot execute in browser
        if target.suffix.lower() in (".html", ".htm", ".js", ".ts", ".sh", ".bat", ".ps1", ".txt", ".md", ".json", ".py"):
            return send_file(target, mimetype="text/plain; charset=utf-8", as_attachment=False, conditional=True, etag=True)

        return send_file(target, mimetype=mime_type, as_attachment=False, conditional=True, etag=True)
    except PermissionError:
        abort(403)
    except Exception:
        abort(404)


# --- Structured Document Preview API ---

@app.route("/api/preview/docx")
def api_preview_docx():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    target = safe_resolve_path(root_info["path"], request.args.get("path", ""))
    if not target.is_file():
        return jsonify({"success": False, "error": "File not found."}), 404

    data = parse_docx(target)
    return jsonify(data)


@app.route("/api/preview/pptx")
def api_preview_pptx():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    target = safe_resolve_path(root_info["path"], request.args.get("path", ""))
    if not target.is_file():
        return jsonify({"success": False, "error": "File not found."}), 404

    data = parse_pptx(target)
    return jsonify(data)


@app.route("/api/preview/spreadsheet")
def api_preview_spreadsheet():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    target = safe_resolve_path(root_info["path"], request.args.get("path", ""))
    if not target.is_file():
        return jsonify({"success": False, "error": "File not found."}), 404

    sheet = request.args.get("sheet")
    try:
        page = int(request.args.get("page", 1))
    except (ValueError, TypeError):
        page = 1

    data = parse_spreadsheet(target, sheet_name=sheet, page=page)
    return jsonify(data)


@app.route("/api/preview/zip")
def api_preview_zip():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    target = safe_resolve_path(root_info["path"], request.args.get("path", ""))
    if not target.is_file():
        return jsonify({"success": False, "error": "File not found."}), 404

    data = inspect_zip_archive(target)
    return jsonify(data)


@app.route("/api/preview/text")
def api_preview_text():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    root_info, err = get_authorized_root(request.args.get("root", 0))
    if err:
        return err

    target = safe_resolve_path(root_info["path"], request.args.get("path", ""))
    if not target.is_file():
        return jsonify({"success": False, "error": "File not found."}), 404

    data = read_text_preview(target)
    return jsonify(data)


# --- Administrator API ---

@app.route("/api/admin/users", methods=["GET"])
def api_admin_list_users():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    if user.get("role") != "admin":
        return jsonify({"success": False, "error": "Administrator privilege required."}), 403

    return jsonify({"success": True, "users": list_users()})


@app.route("/api/admin/users", methods=["POST"])
def api_admin_create_user():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    if user.get("role") != "admin":
        return jsonify({"success": False, "error": "Administrator privilege required."}), 403

    data = request.get_json(silent=True) or request.form
    success, msg = create_user(
        username=data.get("username", ""),
        password=data.get("password", ""),
        display_name=data.get("display_name", ""),
        role=data.get("role", "user"),
        permissions=data.get("permissions"),
        allowed_roots=data.get("allowed_roots", ["*"]),
    )

    if success:
        audit_log("USER_CREATED", user["username"], "SUCCESS", f"Created user {data.get('username')}")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400


@app.route("/api/admin/users/<target_username>", methods=["PUT"])
def api_admin_update_user(target_username):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    if user.get("role") != "admin":
        return jsonify({"success": False, "error": "Administrator privilege required."}), 403

    data = request.get_json(silent=True) or request.form
    success, msg = update_user(
        username=target_username,
        display_name=data.get("display_name"),
        password=data.get("password"),
        role=data.get("role"),
        permissions=data.get("permissions"),
        allowed_roots=data.get("allowed_roots"),
        disabled=data.get("disabled"),
    )

    if success:
        audit_log("USER_UPDATED", user["username"], "SUCCESS", f"Updated user {target_username}")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400


@app.route("/api/admin/users/<target_username>", methods=["DELETE"])
def api_admin_delete_user(target_username):
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    if user.get("role") != "admin":
        return jsonify({"success": False, "error": "Administrator privilege required."}), 403

    success, msg = delete_user(target_username)
    if success:
        audit_log("USER_DELETED", user["username"], "SUCCESS", f"Deleted user {target_username}")
        return jsonify({"success": True, "message": msg})
    return jsonify({"success": False, "error": msg}), 400


@app.route("/api/admin/audit")
def api_admin_audit():
    auth_err = require_auth()
    if auth_err:
        return auth_err

    user = get_current_user()
    if user.get("role") != "admin":
        return jsonify({"success": False, "error": "Administrator privilege required."}), 403

    logs = get_recent_audit_logs(limit=100)
    return jsonify({"success": True, "logs": logs})


# --- Global Error Handlers ---

@app.errorhandler(400)
def handle_400(e):
    return jsonify({"success": False, "error": "Bad request."}), 400


@app.errorhandler(403)
def handle_403(e):
    return jsonify({"success": False, "error": "Access denied."}), 403


@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith("/api/"):
        return jsonify({"success": False, "error": "API resource not found."}), 404
    return render_template("index.html", app_name=APP_NAME, is_setup=is_setup_needed(), csrf_token=get_or_create_csrf_token()), 404


@app.errorhandler(429)
def handle_429(e):
    return jsonify({"success": False, "error": "Too many requests. Rate limit active."}), 429


@app.errorhandler(500)
def handle_500(e):
    return jsonify({"success": False, "error": "Internal server error."}), 500


@app.errorhandler(Exception)
def handle_unhandled_exception(e):
    return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    from run import run_server
    run_server()

