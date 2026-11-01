/**
 * Windows 11 Settings & Administrator Management Application.
 * Handles user creation, role permissions, shared roots inspection, and security audit log viewer.
 */

async function openAdminSettings() {
  if (!AppState.user || AppState.user.role !== "admin") {
    showToast("Access Denied", "Administrator privilege required to access System Settings.", "error");
    return;
  }

  const content = `
    <div style="display:flex;height:100%;background:var(--window-bg);">
      <div style="width:200px;border-right:1px solid var(--acrylic-border);padding:12px;background:var(--acrylic-subtle);display:flex;flex-direction:column;gap:4px;">
        <div class="sidebar-heading">Settings</div>
        <div class="sidebar-item active" id="tab-btn-users" onclick="switchAdminTab('users')">
          <span style="width:16px;height:16px;">${ICONS.settings}</span>
          <span>Accounts & Users</span>
        </div>
        <div class="sidebar-item" id="tab-btn-roots" onclick="switchAdminTab('roots')">
          <span style="width:16px;height:16px;">${ICONS.folder}</span>
          <span>Shared Folders</span>
        </div>
        <div class="sidebar-item" id="tab-btn-audit" onclick="switchAdminTab('audit')">
          <span style="width:16px;height:16px;">${ICONS.info}</span>
          <span>Security Audit</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px;" id="admin-tab-content">
        Loading...
      </div>
    </div>
  `;

  WindowManager.createWindow(
    "settings",
    "Settings & Administration",
    `<div style="width:20px;height:20px;">${ICONS.settings}</div>`,
    content,
    {
      width: 860,
      height: 560,
      onInit: () => switchAdminTab("users"),
    }
  );
}

async function switchAdminTab(tab) {
  const content = document.getElementById("admin-tab-content");
  if (!content) return;

  document.querySelectorAll("[id^='tab-btn-']").forEach((b) => b.classList.remove("active"));
  document.getElementById(`tab-btn-${tab}`)?.classList.add("active");

  if (tab === "users") {
    renderUsersTab(content);
  } else if (tab === "roots") {
    renderRootsTab(content);
  } else if (tab === "audit") {
    renderAuditTab(content);
  }
}

async function renderUsersTab(container) {
  container.innerHTML = "Loading user accounts...";
  try {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    const users = data.users || [];

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
          <h2 style="font-size:18px;margin-bottom:4px;">User Accounts</h2>
          <p style="font-size:12px;color:var(--text-muted);">Manage accounts and role-based permissions.</p>
        </div>
        <button class="btn-primary" onclick="promptCreateUser()" style="width:auto;padding:8px 16px;">+ Add User</button>
      </div>

      <table class="file-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Display Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
            <tr>
              <td style="font-weight:600;">${u.username}</td>
              <td>${u.display_name}</td>
              <td><span style="padding:2px 8px;border-radius:10px;background:var(--accent-light);color:var(--accent);font-size:11px;">${u.role}</span></td>
              <td>${u.disabled ? '<span style="color:var(--danger);">Disabled</span>' : '<span style="color:var(--success);">Active</span>'}</td>
              <td>
                ${
                  u.username !== AppState.user.username
                    ? `
                  <button class="toolbar-btn" onclick="deleteUserAccount('${u.username}')" style="color:var(--danger);">Delete</button>
                `
                    : '<span style="font-size:11px;color:var(--text-muted);">Current User</span>'
                }
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);">Failed to load users.</div>`;
  }
}

function promptCreateUser() {
  const username = prompt("Enter username (at least 3 characters):");
  if (!username) return;
  const password = prompt("Enter password (at least 6 characters):");
  if (!password) return;
  const displayName = prompt("Enter display name (optional):", username);

  fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": AppState.csrfToken,
    },
    body: JSON.stringify({
      username: username.trim(),
      password: password,
      display_name: displayName || username,
      role: "user",
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        showToast("User Created", `User '${username}' created.`, "success");
        switchAdminTab("users");
      } else {
        showToast("Error", data.error || "Failed to create user.", "error");
      }
    });
}

async function deleteUserAccount(username) {
  if (!confirm(`Delete user '${username}'?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${username}`, {
      method: "DELETE",
      headers: { "X-CSRF-Token": AppState.csrfToken },
    });
    const data = await res.json();
    if (data.success) {
      showToast("User Deleted", `User '${username}' removed.`, "success");
      switchAdminTab("users");
    } else {
      showToast("Error", data.error || "Failed to delete user.", "error");
    }
  } catch (err) {
    showToast("Error", "Network error.", "error");
  }
}

function renderRootsTab(container) {
  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h2 style="font-size:18px;margin-bottom:4px;">Authorized Shared Locations</h2>
      <p style="font-size:12px;color:var(--text-muted);">Configured directories accessible from remote clients.</p>
    </div>

    <div style="display:flex;flex-direction:column;gap:12px;">
      ${AppState.activeRoots
        .map(
          (r) => `
        <div style="padding:16px;background:var(--acrylic-subtle);border:1px solid var(--acrylic-border);border-radius:var(--radius-md);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:24px;height:24px;">${r.type === "drive" ? ICONS.drive : ICONS.folder}</div>
            <div style="font-weight:600;font-size:14px;">${r.name}</div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;">
            <span>Free Storage: ${r.storage ? r.storage.free_human : "—"}</span>
            <span>Total: ${r.storage ? r.storage.total_human : "—"}</span>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

async function renderAuditTab(container) {
  container.innerHTML = "Loading security audit records...";
  try {
    const res = await fetch("/api/admin/audit");
    const data = await res.json();
    const logs = data.logs || [];

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-size:18px;margin-bottom:4px;">Security Audit Log</h2>
        <p style="font-size:12px;color:var(--text-muted);">Real-time log of authentication events, uploads, deletions, and access checks.</p>
      </div>

      <table class="file-table" style="font-size:12px;">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>User</th>
            <th>IP</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${logs
            .map(
              (l) => `
            <tr>
              <td style="white-space:nowrap;color:var(--text-muted);">${new Date(l.timestamp).toLocaleTimeString()}</td>
              <td style="font-weight:600;">${l.action}</td>
              <td>${l.username}</td>
              <td>${l.ip}</td>
              <td><span style="color:${l.status === "SUCCESS" ? "var(--success)" : "var(--danger)"};">${l.status}</span></td>
              <td style="font-size:11px;color:var(--text-muted);word-break:break-all;">${l.details || "—"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);">Failed to load audit logs.</div>`;
  }
}
