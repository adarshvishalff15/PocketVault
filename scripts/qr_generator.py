"""ASCII QR Code Generator for PocketVault.

Generates a terminal-friendly QR code using `qrcode` if installed,
or a compact ASCII boundary box with direct IP instructions if not installed.
"""

import sys


def print_terminal_qr(url: str):
    """Attempt to render QR code directly in the terminal."""
    try:
        import qrcode
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=1,
            border=1,
        )
        qr.add_data(url)
        qr.make(fit=True)
        # Invert black/white for standard dark terminals
        print("\n  SCAN WITH PHONE CAMERA TO CONNECT:\n")
        qr.print_ascii(invert=True)
        return True
    except ImportError:
        # Fallback when qrcode module is not installed
        print("\n  [TIP] To scan QR code in terminal: pip install qrcode")
        print(f"  Direct Link: {url}\n")
        return False
    except Exception:
        return False


if __name__ == "__main__":
    test_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8288"
    print_terminal_qr(test_url)

