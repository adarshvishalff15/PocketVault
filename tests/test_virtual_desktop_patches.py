import pytest
import os
import re

def test_static_patch_files_exist():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    touch_js = os.path.join(base_dir, "static", "js", "touch.js")
    cursor_js = os.path.join(base_dir, "static", "js", "cursor.js")
    win11_css = os.path.join(base_dir, "static", "css", "win11.css")
    viewers_css = os.path.join(base_dir, "static", "css", "viewers.css")
    explorer_js = os.path.join(base_dir, "static", "js", "explorer.js")
    
    assert os.path.exists(touch_js), "touch.js must exist"
    assert os.path.exists(cursor_js), "cursor.js must exist"
    assert os.path.exists(win11_css), "win11.css must exist"
    assert os.path.exists(viewers_css), "viewers.css must exist"
    assert os.path.exists(explorer_js), "explorer.js must exist"

def test_templates_index_viewport_and_entries():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    index_html = os.path.join(base_dir, "templates", "index.html")
    with open(index_html, "r", encoding="utf-8") as f:
        content = f.read()

    # Scripts must be included
    assert "cursor.js" in content
    assert "touch.js" in content

    # Viewport meta for mobile touch responsiveness without restrictive user-scalable=no
    assert "viewport" in content
    assert "user-scalable=no" not in content
    assert "width=device-width" in content

    # This PC opens This PC view
    assert "openExplorer('this_pc'" in content

    # Start menu cursor entry and Quick settings tile
    assert "openCursorSettings()" in content
    assert "toggleVirtualCursor()" in content

def test_no_automatic_app_or_file_openings():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_js = os.path.join(base_dir, "static", "js", "app.js")
    with open(app_js, "r", encoding="utf-8") as f:
        content = f.read()

    # Must NOT automatically open explorer or any window via timer
    assert "setTimeout(() => openExplorer()" not in content
    assert "setTimeout(()=>openExplorer()" not in content

def test_pointer_drag_and_touch_action():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    win11_css = os.path.join(base_dir, "static", "css", "win11.css")
    app_js = os.path.join(base_dir, "static", "js", "app.js")

    with open(win11_css, "r", encoding="utf-8") as f:
        css = f.read()
    with open(app_js, "r", encoding="utf-8") as f:
        js = f.read()

    # Touch-action manipulation prevents double-tap zoom
    assert "touch-action: manipulation;" in css
    # Titlebar touch-action none allows dragging
    assert "touch-action: none;" in css
    # Pointer events used for dragging
    assert "pointerdown" in js
    assert "setPointerCapture" in js

def test_this_pc_view_structure_in_explorer():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    explorer_js = os.path.join(base_dir, "static", "js", "explorer.js")
    with open(explorer_js, "r", encoding="utf-8") as f:
        content = f.read()

    # This PC view sections
    assert "renderThisPcView" in content
    assert "Folders" in content
    assert "Devices and drives" in content

    # Command bar actions
    assert "btn-new-folder" in content
    assert "btn-cut" in content
    assert "btn-copy" in content
    assert "btn-paste" in content
    assert "btn-rename" in content
    assert "btn-share" in content
    assert "btn-batch-delete" in content

    # Nav buttons & Breadcrumbs
    assert "btn-nav-back" in content
    assert "btn-nav-forward" in content
    assert "btn-nav-up" in content
    assert "explorer-breadcrumbs" in content

def test_js_syntax_integrity():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    js_files = ["app.js", "touch.js", "cursor.js", "explorer.js", "desktop_apps.js", "icons.js", "viewers.js"]
    for jf in js_files:
        path = os.path.join(base_dir, "static", "js", jf)
        assert os.path.exists(path), f"{jf} must exist"
        with open(path, "r", encoding="utf-8") as f:
            code = f.read()
            assert code.count("{") == code.count("}"), f"Unbalanced braces in {jf}"

def test_selection_css_not_full_solid_blue():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    win11_css = os.path.join(base_dir, "static", "css", "win11.css")
    with open(win11_css, "r", encoding="utf-8") as f:
        content = f.read()

    assert ".desktop-icon.selected" in content
    assert "rgba(" in content

def test_windows_11_explorer_tabs_and_home_view():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    explorer_js = os.path.join(base_dir, "static", "js", "explorer.js")
    with open(explorer_js, "r", encoding="utf-8") as f:
        content = f.read()

    assert "renderHomeView" in content
    assert "ExplorerTabs" in content
    assert "renderExplorerTabsHtml" in content
    assert "home-quickaccess-grid" in content
    assert "home-recent-table" in content
    assert "thispc-drives-grid" in content

def test_window_resize_handles_and_mobile_support():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_js = os.path.join(base_dir, "static", "js", "app.js")
    win11_css = os.path.join(base_dir, "static", "css", "win11.css")

    with open(app_js, "r", encoding="utf-8") as f:
        js = f.read()
    with open(win11_css, "r", encoding="utf-8") as f:
        css = f.read()

    # WindowManager setupResize exists
    assert "setupResize(winObj)" in js or "setupResize(" in js
    assert "handle-se" in js
    assert "win-resize-grip-icon" in js
    assert "pointerdown" in js
    assert "setPointerCapture" in js

    # Un-maximizing logic when dragging resize handle
    assert "winObj.maximized = false" in js
    assert "winObj.el.classList.remove(\"maximized\")" in js

    # CSS styles for resize handles and mobile touch targets
    assert ".win-resize-handle" in css
    assert ".win-resize-handle.handle-se" in css
    assert "win-resize-grip-icon" in css
    assert "body.window-is-resizing" in css
    assert ".win11-window.resizing" in css

def test_windows_11_lock_screen_and_session_security():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_py = os.path.join(base_dir, "app.py")
    index_html = os.path.join(base_dir, "templates", "index.html")
    app_js = os.path.join(base_dir, "static", "js", "app.js")
    win11_css = os.path.join(base_dir, "static", "css", "win11.css")

    with open(app_py, "r", encoding="utf-8") as f:
        py = f.read()
    with open(index_html, "r", encoding="utf-8") as f:
        html = f.read()
    with open(app_js, "r", encoding="utf-8") as f:
        js = f.read()
    with open(win11_css, "r", encoding="utf-8") as f:
        css = f.read()

    # Flask session must be session-only (not permanent) so closing tab/browser clears cookie
    assert "session.permanent = False" in py
    assert "session.permanent = True" not in py

    # Lock screen 2-phase stages in HTML
    assert "lock-stage-clock" in html
    assert "lock-stage-signin" in html
    assert "lock-swipe-hint" in html
    assert "lock-status-tray" in html
    assert "lock-back-btn" in html
    assert "win11-pwd-wrapper" in html
    assert "win11-ring-spinner" in html
    assert "lock-btn" in html

    # JS Lock screen handlers & session tracking
    assert "showSignInStage" in js
    assert "hideSignInStage" in js
    assert "lockSystem" in js
    assert "win11_session_unlocked" in js

    # CSS Lock screen styling
    assert ".lock-acrylic-backdrop" in css
    assert ".lock-stage-clock" in css
    assert ".lock-stage-signin" in css
    assert "#lock-screen.show-login" in css
    assert ".win11-pwd-wrapper" in css
    assert ".win11-ring-spinner" in css

def test_windows_media_and_music_players():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    viewers_js = os.path.join(base_dir, "static", "js", "viewers.js")
    viewers_css = os.path.join(base_dir, "static", "css", "viewers.css")
    index_html = os.path.join(base_dir, "templates", "index.html")
    explorer_js = os.path.join(base_dir, "static", "js", "explorer.js")

    with open(viewers_js, "r", encoding="utf-8") as f:
        v_js = f.read()
    with open(viewers_css, "r", encoding="utf-8") as f:
        v_css = f.read()
    with open(index_html, "r", encoding="utf-8") as f:
        html = f.read()
    with open(explorer_js, "r", encoding="utf-8") as f:
        e_js = f.read()

    # 1. Specialized Windows Players exist
    assert "function openMusicPlayer" in v_js
    assert "function openVideoPlayer" in v_js
    assert "function openMediaPlayer" in v_js

    # 2. Prominent topbar with filename at the top
    assert "win-player-topbar" in v_js
    assert "win-player-top-filename" in v_js
    assert ".win-player-topbar" in v_css
    assert ".win-player-top-filename" in v_css

    # 3. Dynamic track switching without freezing when player is already open
    assert "AppState.windows[\"music-player\"]" in v_js
    assert "AppState.windows[\"video-player\"]" in v_js

    # 4. Routing audio and video in explorer & openMediaPlayer
    assert "openMediaPlayer(ExplorerState.currentRootId" in e_js
    assert "return openMusicPlayer(" in v_js
    assert "return openVideoPlayer(" in v_js

    # 5. Desktop and Start Menu entries
    assert "openMusicPlayer" in html
    assert "openVideoPlayer" in html
    assert "data-icon=\"music\"" in html
    assert "data-icon=\"video\"" in html

