"""Utility script to reset or change user password."""

import sys
from auth import update_user, get_user, list_users

def main():
    print("\n==============================================")
    print("   WINDOWS 11 FILE SERVER - PASSWORD RESET")
    print("==============================================\n")
    
    users = list_users()
    if not users:
        print("[!] No users found in database.")
        sys.exit(1)
        
    print("Available users:")
    for u in users:
        print(f" - {u['username']} ({u.get('display_name', '')})")
    print()
    
    username = input("Enter username to change password [default: vishal]: ").strip() or "vishal"
    user = get_user(username)
    if not user:
        print(f"[!] User '{username}' does not exist.")
        sys.exit(1)
        
    new_pass = input(f"Enter new password for '{username}' (at least 4 characters): ").strip()
    if len(new_pass) < 4:
        print("[!] Password must be at least 4 characters.")
        sys.exit(1)
        
    success, msg = update_user(username, password=new_pass)
    if success:
        print(f"\n[OK] Success! Password for '{username}' has been updated to: {new_pass}\n")
    else:
        print(f"\n[!] Error: {msg}\n")

if __name__ == "__main__":
    main()
