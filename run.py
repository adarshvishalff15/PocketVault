"""Server runner script for PocketVault Mobile File Server.

Detects active LAN IPv4 addresses, displays startup banner, prints
terminal connection details & QR code, and starts the server on port 8288.
"""

from pathlib import Path
import argparse
import os
import socket
import sys

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import APP_NAME, HOST, PORT, ROOTS, DEBUG, is_android_environment
from scripts.qr_generator import print_terminal_qr


def get_local_ip_addresses() -> list[str]:
    """Discover all non-loopback IPv4 addresses assigned to network interfaces."""
    ip_list = []
    try:
        # Quick probe via UDP socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127."):
            ip_list.append(primary_ip)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if not ip.startswith("127.") and not ip.startswith("169.254.") and ip not in ip_list:
                ip_list.append(ip)
    except Exception:
        pass

    return ip_list or ["127.0.0.1"]


def run_server():
    parser = argparse.ArgumentParser(description="PocketVault Mobile File Server")
    parser.add_argument("--host", default=HOST, help="Host to bind (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port to bind (default: {PORT})")
    parser.add_argument("--debug", action="store_true", default=DEBUG, help="Run in debug mode")
    args = parser.parse_args()

    from app import app, is_setup_needed

    ips = get_local_ip_addresses()
    primary_lan_ip = ips[0] if ips else "127.0.0.1"
    connect_url = f"http://{primary_lan_ip}:{args.port}"
    env_label = "Android / Termux" if is_android_environment() else "Linux / Windows Host"

    banner = rf"""
======================================================================
  ____            _        _   __     __            _ _   
 |  _ \ ___   ___| | _____| |_ \ \   / /_ _ _   _| | |_ 
 | |_) / _ \ / __| |/ / _ \ __| \ \ / / _` | | | | | __|
 |  __/ (_) | (__|   <  __/ |_   \ V / (_| | |_| | | |_ 
 |_|   \___/ \___|_|\_\___|\__|   \_/ \__,_|\__,_|_|\__|
                                            v1.0 (Read-Only)
======================================================================
  Server Name : {APP_NAME}
  Platform    : {env_label}
  Port        : {args.port}
  Localhost   : http://localhost:{args.port}
  LAN IP(s)   : {', '.join([f'http://{ip}:{args.port}' for ip in ips])}
  Access URL  : {connect_url}
  Status      : {'First-Run Setup Wizard' if is_setup_needed() else 'Ready for Secure Login'}
----------------------------------------------------------------------
  STORAGE ROOTS (Read-Only):
"""
    print(banner)
    for r in ROOTS:
        print(f"    [{r['id']}] {r['name']:<22} -> {r['path']}")

    print("\n----------------------------------------------------------------------")
    print_terminal_qr(connect_url)
    print("----------------------------------------------------------------------")
    print(f"  Connect from any browser on phone, PC or tablet: {connect_url}")
    print("======================================================================\n")

    app.run(host=args.host, port=args.port, threaded=True, debug=args.debug)


if __name__ == "__main__":
    run_server()
