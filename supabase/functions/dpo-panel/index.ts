// dpo-panel/index.ts — Serves DPO Operator Panel HTML (Story 3.4)
// GET only. Returns a self-contained HTML panel with inline JS (no external CDN dependencies).
// All fetch() calls use __SUPABASE_URL__ token, replaced at serve time (F5 — canonical URL pattern).

import { corsHeaders } from '../_shared/cors.ts'

// Panel HTML — all JS inline. __SUPABASE_URL__ is replaced at serve time.
// C3: erase body uses targetUserId (NOT userId). C4: export body uses targetUserId.
// C5: null email renders as "(email not available)".
// F12 (accepted): PII in export <pre> is wrapped in <details> for shoulder-surfing mitigation.
const PANEL_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DPO Operator Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 960px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 24px; color: #1a1a2e; }
    h2 { font-size: 1.1rem; margin-bottom: 12px; color: #16213e; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 20px; margin-bottom: 20px; }
    label { display: block; font-size: 0.85rem; color: #555; margin-bottom: 4px; }
    input[type="email"], input[type="password"], input[type="text"] {
      width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px;
      font-size: 0.95rem; margin-bottom: 12px;
    }
    button { padding: 8px 18px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
    .btn-primary { background: #0070f3; color: #fff; }
    .btn-primary:hover { background: #005bb5; }
    .btn-danger { background: #e53e3e; color: #fff; }
    .btn-danger:hover { background: #c53030; }
    .btn-secondary { background: #e2e8f0; color: #333; }
    .btn-secondary:hover { background: #cbd5e0; }
    .btn-sm { padding: 4px 10px; font-size: 0.8rem; }
    .error { color: #e53e3e; font-size: 0.85rem; margin-top: 8px; }
    .success { color: #38a169; font-size: 0.85rem; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 8px 12px; background: #f0f4f8; font-weight: 600; }
    td { padding: 8px 12px; border-top: 1px solid #eee; vertical-align: middle; }
    .pagination { display: flex; gap: 8px; align-items: center; margin-top: 12px; }
    .pagination span { font-size: 0.85rem; color: #666; }
    details summary { cursor: pointer; color: #0070f3; font-size: 0.85rem; margin-bottom: 8px; }
    pre { background: #f0f4f8; padding: 12px; border-radius: 4px; overflow: auto; font-size: 0.8rem; max-height: 400px; white-space: pre-wrap; word-break: break-all; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    #login-section { max-width: 400px; margin: 80px auto; }
    #dashboard-section { display: none; }
  </style>
</head>
<body>
<div class="container">
  <!-- Login -->
  <div id="login-section" class="card">
    <h1>DPO Operator Login</h1>
    <label for="email">Email</label>
    <input type="email" id="email" placeholder="dpo@example.com" />
    <label for="password">Password</label>
    <input type="password" id="password" placeholder="Password" />
    <button class="btn-primary" onclick="doLogin()">Login</button>
    <p id="login-error" class="error" style="display:none"></p>
  </div>

  <!-- Dashboard -->
  <div id="dashboard-section">
    <div class="header-bar">
      <h1>DPO Operator Panel</h1>
      <button class="btn-secondary" onclick="doLogout()">Logout</button>
    </div>

    <!-- Section 1: Pending Erasure Requests -->
    <div class="card">
      <h2>Pending Erasure Requests</h2>
      <div id="erasure-loading" style="font-size:0.85rem;color:#666;">Loading...</div>
      <div id="erasure-container" style="display:none">
        <table>
          <thead><tr><th>Email</th><th>Requested At</th><th>Action</th></tr></thead>
          <tbody id="erasure-tbody"></tbody>
        </table>
        <p id="erasure-empty" style="font-size:0.85rem;color:#666;display:none;margin-top:8px;">No pending requests.</p>
      </div>
      <p id="erasure-error" class="error" style="display:none"></p>
    </div>

    <!-- Section 2: Export User Data -->
    <div class="card">
      <h2>Export User Data</h2>
      <label for="export-id">User ID (UUID)</label>
      <input type="text" id="export-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
      <button class="btn-primary" onclick="doExport()">Trigger Export</button>
      <p id="export-error" class="error" style="display:none"></p>
      <p id="export-success" class="success" style="display:none"></p>
      <details id="export-details" style="display:none;margin-top:12px;">
        <summary>Exported data (click to reveal)</summary>
        <pre id="export-output"></pre>
      </details>
    </div>

    <!-- Section 3: Audit Log -->
    <div class="card">
      <h2>Audit Log</h2>
      <div id="audit-loading" style="font-size:0.85rem;color:#666;">Loading...</div>
      <div id="audit-container" style="display:none">
        <table>
          <thead><tr><th>Timestamp</th><th>Action</th><th>Operator ID</th><th>Target User</th><th>Outcome</th></tr></thead>
          <tbody id="audit-tbody"></tbody>
        </table>
        <div class="pagination">
          <button class="btn-secondary btn-sm" id="audit-prev" onclick="auditPage(-1)" disabled>Previous</button>
          <span id="audit-page-info">Page 1</span>
          <button class="btn-secondary btn-sm" id="audit-next" onclick="auditPage(1)">Next</button>
        </div>
      </div>
      <p id="audit-error" class="error" style="display:none"></p>
    </div>
  </div>
</div>

<script>
// IIFE — prevents operatorToken and all helpers from being accessible as window globals.
// Functions used in onclick attributes are explicitly exported via window assignments below.
(function() {
  // Token stored in closure — NOT localStorage, NOT cookie access (XSS mitigation)
  // NOT a window global — IIFE prevents window.operatorToken access.
  let operatorToken = null;
  let currentAuditPage = 1;
  const PAGE_SIZE = 20;
  const BASE_URL = '__SUPABASE_URL__/functions/v1';

  function apiHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + operatorToken
    };
  }

  function showEl(id) { document.getElementById(id).style.display = ''; }
  function hideEl(id) { document.getElementById(id).style.display = 'none'; }
  function setText(id, text) { document.getElementById(id).textContent = text; }

  // ── Session expiry handler — detects 401 and redirects to login ────────────
  // Returns true if the 401 was handled (caller should abort its flow).
  function handleSessionExpiry(res) {
    if (res.status === 401) {
      operatorToken = null;
      setText('login-error', 'Session expired. Please log in again.');
      showEl('login-error');
      hideEl('dashboard-section');
      showEl('login-section');
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
      return true;
    }
    return false;
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    hideEl('login-error');

    try {
      const res = await fetch(BASE_URL + '/dpo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setText('login-error', data.error || 'Invalid credentials');
        showEl('login-error');
        return;
      }
      const { token } = await res.json();
      operatorToken = token; // in-memory only
      showDashboard();
    } catch (err) {
      setText('login-error', 'Network error. Please try again.');
      showEl('login-error');
    }
  }

  function showDashboard() {
    hideEl('login-section');
    showEl('dashboard-section');
    loadPendingErasures();
    loadAuditLog(1);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function doLogout() {
    try {
      await fetch(BASE_URL + '/dpo-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (_) { /* best-effort */ }
    operatorToken = null;
    hideEl('dashboard-section');
    showEl('login-section');
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  }

  // ── Section 1: Pending Erasure Requests ───────────────────────────────────
  async function loadPendingErasures() {
    hideEl('erasure-error');
    showEl('erasure-loading');
    hideEl('erasure-container');

    try {
      const res = await fetch(BASE_URL + '/dpo-pending-requests', {
        headers: apiHeaders()
      });
      hideEl('erasure-loading');
      if (!res.ok) {
        if (handleSessionExpiry(res)) return;
        setText('erasure-error', 'Failed to load pending requests.');
        showEl('erasure-error');
        return;
      }
      const { requests } = await res.json();
      const tbody = document.getElementById('erasure-tbody');
      tbody.innerHTML = '';

      if (!requests || requests.length === 0) {
        showEl('erasure-empty');
      } else {
        hideEl('erasure-empty');
        for (const req of requests) {
          // C5: null email renders as "(email not available)"
          const emailDisplay = req.email !== null && req.email !== undefined ? req.email : '(email not available)';
          const d = new Date(req.deletion_requested_at);
          const date = isNaN(d.getTime()) ? '(unknown date)' : d.toLocaleString();
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escHtml(emailDisplay) + '</td>' +
            '<td>' + escHtml(date) + '</td>' +
            '<td><button class="btn-danger btn-sm" onclick="confirmErasure(' + JSON.stringify(req.id) + ', ' + JSON.stringify(emailDisplay) + ')">Confirm Erasure</button></td>';
          tbody.appendChild(tr);
        }
      }
      showEl('erasure-container');
    } catch (err) {
      hideEl('erasure-loading');
      setText('erasure-error', 'Network error loading requests.');
      showEl('erasure-error');
    }
  }

  // Erasure confirmation step before executing (AC6d)
  async function confirmErasure(userId, emailDisplay) {
    const confirmed = window.confirm(
      'Confirm erasure for: ' + emailDisplay + '\\n\\nThis action is irreversible. Proceed?'
    );
    if (!confirmed) return;

    try {
      // C3: body field must be targetUserId (NOT userId)
      const res = await fetch(BASE_URL + '/dpo-erase-user', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ targetUserId: userId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert('Erasure failed: ' + (data.error || res.status));
        return;
      }
      alert('Erasure completed successfully.');
      loadPendingErasures(); // refresh list
    } catch (err) {
      alert('Network error during erasure.');
    }
  }

  // ── Section 2: Export ──────────────────────────────────────────────────────
  async function doExport() {
    hideEl('export-error');
    hideEl('export-success');
    hideEl('export-details');

    const targetUserId = document.getElementById('export-id').value.trim();
    if (!targetUserId) {
      setText('export-error', 'Please enter a User ID.');
      showEl('export-error');
      return;
    }

    const confirmed = window.confirm('Export all data for user: ' + targetUserId + '?\\n\\nThis will display PII — ensure you are in a secure environment.');
    if (!confirmed) return;

    try {
      // C4: body field must be targetUserId (NOT userId)
      const res = await fetch(BASE_URL + '/dpo-export-user', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ targetUserId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setText('export-error', 'Export failed: ' + (data.error || res.status));
        showEl('export-error');
        return;
      }
      const data = await res.json();
      // F12 (accepted): wrap PII in <details> for shoulder-surfing mitigation
      document.getElementById('export-output').textContent = JSON.stringify(data.export, null, 2);
      showEl('export-details');
      setText('export-success', 'Export successful.');
      showEl('export-success');
    } catch (err) {
      setText('export-error', 'Network error during export.');
      showEl('export-error');
    }
  }

  // ── Section 3: Audit Log ───────────────────────────────────────────────────
  async function loadAuditLog(page) {
    hideEl('audit-error');
    showEl('audit-loading');
    hideEl('audit-container');
    currentAuditPage = page;

    try {
      // M2: must pass page and pageSize query params
      const res = await fetch(
        BASE_URL + '/dpo-audit-log?page=' + page + '&pageSize=' + PAGE_SIZE,
        { headers: apiHeaders() }
      );
      hideEl('audit-loading');
      if (!res.ok) {
        if (handleSessionExpiry(res)) return;
        setText('audit-error', 'Failed to load audit log.');
        showEl('audit-error');
        return;
      }
      const { entries, total } = await res.json();
      const tbody = document.getElementById('audit-tbody');
      tbody.innerHTML = '';

      for (const entry of (entries || [])) {
        const tr = document.createElement('tr');
        const ts = new Date(entry.timestamp_utc).toLocaleString();
        tr.innerHTML =
          '<td>' + escHtml(ts) + '</td>' +
          '<td>' + escHtml(entry.action_type || '') + '</td>' +
          '<td style="font-size:0.75rem">' + escHtml(entry.acting_operator_id || '') + '</td>' +
          '<td style="font-size:0.75rem">' + escHtml(entry.target_user_id || '') + '</td>' +
          '<td>' + escHtml(entry.outcome || '') + '</td>';
        tbody.appendChild(tr);
      }

      const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
      setText('audit-page-info', 'Page ' + page + ' of ' + totalPages);
      document.getElementById('audit-prev').disabled = page <= 1;
      document.getElementById('audit-next').disabled = page >= totalPages;
      showEl('audit-container');
    } catch (err) {
      hideEl('audit-loading');
      setText('audit-error', 'Network error loading audit log.');
      showEl('audit-error');
    }
  }

  function auditPage(delta) {
    loadAuditLog(currentAuditPage + delta);
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Expose functions referenced in onclick attributes.
  // Only the minimum surface is exported — operatorToken remains encapsulated.
  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.confirmErasure = confirmErasure;
  window.doExport = doExport;
  window.auditPage = auditPage;
})();
</script>
</body>
</html>`

Deno.serve(async (req: Request) => {
  // CORS OPTIONS — before method guard (E1)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET-only method guard
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', Allow: 'GET' },
    })
  }

  // Inject SUPABASE_URL into all __SUPABASE_URL__ tokens (F5 — global replace).
  // Escape for safe embedding into a JS single-quoted string context: backslashes and
  // single quotes in the URL (unlikely but possible) would otherwise break the template.
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const safeSupabaseUrl = supabaseUrl.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const html = PANEL_HTML_TEMPLATE.replace(/__SUPABASE_URL__/g, safeSupabaseUrl)

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
})
