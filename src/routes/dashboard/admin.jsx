import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity, AlertCircle, Bell, Building2, CheckCircle2, ChevronRight, ClipboardList,
  Copy, Database, DoorOpen, FileText, Filter, KeyRound, LayoutDashboard,
  MessageSquare, RefreshCw, Search, Send, ShieldCheck, Stethoscope, Trash2, PenLine,
  UserPlus, Users, X, Eye, Plane, ListChecks, UserRound, CircleOff,
} from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/RoleDashboardShell";
import {
  apiAdminCreateNotification,
  apiAdminDelete,
  apiAdminUpdateDecisionHistory,
  apiGetAdminOverview,
  apiUpdateAdminAccountStatus,
  apiProvisionUser,
  apiGetHealth,
  apiFileUrl,
  apiGetPasses,
  apiRevokePass,
  apiReissuePass,
  apiSuspendPass,
} from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import "./operations.css";

const ROLE_OPTIONS = [
  { label: "Doctor", value: "doctor", icon: Stethoscope },
  { label: "Director", value: "director", icon: ShieldCheck },
  { label: "HoD", value: "hod", icon: Users },
  { label: "Accommodation Office", value: "accommodation", icon: Building2 },
  { label: "Mandir Committee", value: "mandir", icon: DoorOpen },
  { label: "Travel & Visa Desk", value: "travel", icon: Plane },
  { label: "IT Team", value: "it", icon: Activity },
  { label: "Admin", value: "admin", icon: ShieldCheck },
];

const navItems = [
  { id: "overview", label: "Overview", description: "Platform command center, account health and priority actions.", href: "#overview" },
  { id: "people", label: "People & profiles", description: "Browse the live staff and account directory.", href: "#people" },
  { id: "accounts", label: "All accounts", description: "Manage access, status and account-level controls.", href: "#accounts" },
  { id: "controls", label: "Platform controls", description: "Moderate notifications, reviews, documents and records.", href: "#controls" },
  { id: "application-status", label: "Decision history", description: "Review, edit and remove Directorate application decisions shown to doctors.", href: "#application-status" },
  { id: "passes", label: "QR pass management", description: "Review, suspend and revoke lifetime Seva QR passes.", href: "#passes" },
  { id: "provision", label: "Create account", description: "Provision a new platform account and assign its role.", href: "#provision" },
  { id: "session", label: "My session", description: "Review your current Admin security session.", href: "#session" },
];

export const Route = createFileRoute("/dashboard/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — PRANASAKHA" }] }),
  component: AdminDashboard,
});

const emptyData = {
  accounts: [], doctors: [], notifications: [], reviews: [], documents: [], passes: [],
  accommodation: [], darshan: [], travel: [], roster: [], audit: [], decisionHistory: [],
};

const emptyProvision = { full_name: "", email: "", password: "", role: "doctor", department: "", institution: "" };

function labelForRole(role) { return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || "Unknown"; }
function initials(name = "") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?"; }
function formatDate(value) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function formatBytes(value) { const n = Number(value); if (!Number.isFinite(n)) return "—"; if (n < 1024) return `${n} B`; if (n < 1024 ** 2) return `${Math.round(n / 1024)} KB`; return `${(n / 1024 ** 2).toFixed(1)} MB`; }
function safeText(value) { return value === undefined || value === null || value === "" ? "—" : String(value); }
function profileImageUrl(value) { const text = String(value || "").trim(); return text ? apiFileUrl(text) : ""; }

function CountCard({ icon: Icon, label, value, helper, tone = "primary" }) {
  return <article className={`adm-count-card adm-count-card--${tone}`}><span className="adm-count-icon"><Icon size={19} /></span><div className="adm-count-content"><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></article>;
}

function ProfileCard({ account, onOpen }) {
  const role = ROLE_OPTIONS.find((x) => x.value === account.role);
  const Icon = role?.icon || UserRound;
  return (
    <button type="button" className="adm-profile-card" onClick={() => onOpen(account)}>
      <span className="adm-profile-avatar-wrap">
        {profileImageUrl(account.profile_picture) ? <img src={profileImageUrl(account.profile_picture)} alt="" className="adm-profile-avatar" /> : <span className="adm-profile-avatar adm-profile-avatar--fallback">{initials(account.full_name)}</span>}
        <span className={`adm-profile-state ${account.active ? "is-online" : "is-offline"}`} />
      </span>
      <span className="adm-profile-copy"><strong>{account.full_name || "Unnamed account"}</strong><small>{account.email}</small><span><Icon size={13} /> {labelForRole(account.role)}</span></span>
      <ChevronRight size={17} />
    </button>
  );
}

function ResourceCard({ icon: Icon, title, subtitle, value, onClick, tone = "primary" }) {
  return <button type="button" className={`adm-resource-card adm-resource-card--${tone}`} onClick={onClick}><span className="adm-resource-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{subtitle}</small></span><b>{value}</b></button>;
}

function AdminDashboard() {
  const user = getCurrentUser();
  const [data, setData] = useState(emptyData);
  const [health, setHealth] = useState({ ok: false, database: "—", service: "—" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [controlTab, setControlTab] = useState("notifications");
  const [actionKey, setActionKey] = useState("");
  const [copied, setCopied] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [form, setForm] = useState(emptyProvision);
  const [notification, setNotification] = useState({ user_id: "", title: "", message: "", type: "admin" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingDecision, setEditingDecision] = useState(null);
  const [editingDecisionNote, setEditingDecisionNote] = useState("");
  const [passActionKey, setPassActionKey] = useState("");

  useEffect(() => {
    if (!selectedProfile && !confirmDelete) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (confirmDelete) setConfirmDelete(null);
        else setSelectedProfile(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedProfile, confirmDelete]);

  async function loadDashboard() {
    setLoading(true); setError("");
    try {
      const [overview, serviceHealth, passList] = await Promise.all([apiGetAdminOverview(), apiGetHealth(), apiGetPasses().catch(() => [])]);
      setData({ ...emptyData, ...overview, passes: passList || [] });
      setHealth(serviceHealth || health);
      if (Array.isArray(overview?.warnings) && overview.warnings.length) {
        setMessage(`Dashboard loaded with ${overview.warnings.length} non-critical data warning${overview.warnings.length === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      setError(err.message || "Could not load the Admin dashboard.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDashboard(); }, []);

  const accounts = data.accounts || [];
  const activeAccounts = accounts.filter((x) => x.active).length;
  const inactiveAccounts = accounts.length - activeAccounts;
  const roleCounts = useMemo(() => accounts.reduce((acc, account) => { const key = account.role || "unknown"; acc[key] ||= { total: 0, active: 0 }; acc[key].total += 1; if (account.active) acc[key].active += 1; return acc; }, {}), [accounts]);
  const pendingDoctors = (data.doctors || []).filter((x) => x.status === "pending").length;
  const approvedDoctors = (data.doctors || []).filter((x) => x.status === "approved").length;
  const openReviews = (data.reviews || []).filter((x) => x.status === "open").length;
  const unreadNotifications = (data.notifications || []).filter((x) => !x.read_at).length;

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((account) => {
      const fields = [account.full_name, account.email, account.department, account.institution, account.mobile, account.nationality];
      const textMatch = !q || fields.filter(Boolean).some((x) => String(x).toLowerCase().includes(q));
      const roleMatch = roleFilter === "all" || account.role === roleFilter;
      const roleCardMatch = selectedRole === "all" || account.role === selectedRole;
      const statusMatch = statusFilter === "all" || (statusFilter === "active" ? account.active : !account.active);
      return textMatch && roleMatch && roleCardMatch && statusMatch;
    });
  }, [accounts, search, roleFilter, statusFilter, selectedRole]);

  const recentAccounts = accounts.slice(0, 8);

  async function saveDecisionEdit() {
    if (!editingDecision) return;
    setActionKey(`decision-edit-${editingDecision.id}`);
    setError("");
    try {
      const updated = await apiAdminUpdateDecisionHistory(editingDecision.id, { note: editingDecisionNote });
      setData((current) => ({ ...current, decisionHistory: current.decisionHistory.map((x) => x.id === updated.id ? { ...x, ...updated } : x) }));
      setEditingDecision(null);
      setEditingDecisionNote("");
      setMessage("Decision history note updated.");
    } catch (err) {
      setError(err.message || "Could not update the decision history entry.");
    } finally {
      setActionKey("");
    }
  }

  async function copyText(value, key) {
    try { await navigator.clipboard.writeText(String(value)); setCopied(key); window.setTimeout(() => setCopied(""), 1100); } catch {}
  }

  async function toggleAccount(account) {
    setActionKey(`status-${account.id}`); setError("");
    try {
      const updated = await apiUpdateAdminAccountStatus(account.id, !account.active);
      setData((current) => ({ ...current, accounts: current.accounts.map((x) => x.id === account.id ? { ...x, ...updated } : x) }));
      setMessage(`${updated.full_name || updated.email} is now ${updated.active ? "active" : "inactive"}.`);
    } catch (err) { setError(err.message || "Could not update account status."); }
    finally { setActionKey(""); }
  }

  async function deleteResource(resource, id, label) {
    setConfirmDelete(null); setActionKey(`${resource}-${id}`); setError("");
    try {
      await apiAdminDelete(resource, id);
      await loadDashboard();
      setMessage(`${label || "Record"} deleted.`);
    } catch (err) { setError(err.message || "Could not delete the record."); }
    finally { setActionKey(""); }
  }

  async function handleProvision() {
    setError(""); setMessage("");
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return setError("Name, email, and password are required.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setProvisioning(true);
    try {
      await apiProvisionUser({ email: form.email.trim(), password: form.password, role: form.role, full_name: form.full_name.trim(), department: form.role === "hod" ? form.department.trim() : undefined, institution: form.role !== "hod" ? form.institution.trim() : undefined });
      setForm(emptyProvision); setMessage(`Account created for ${form.full_name.trim()}.`); await loadDashboard();
    } catch (err) { setError(err.message || "Could not create account."); }
    finally { setProvisioning(false); }
  }

  async function managePass(action, pass) {
    setPassActionKey(`${action}-${pass.id}`); setError("");
    try {
      let updated;
      if (action === "revoke") updated = await apiRevokePass(pass.id);
      else if (action === "reissue") updated = await apiReissuePass(pass.id);
      else updated = await apiSuspendPass(pass.id);
      await loadDashboard();
      setMessage(action === "revoke" ? "Lifetime QR pass revoked." : action === "reissue" ? "New lifetime QR pass issued successfully." : "Lifetime QR pass suspended.");
    } catch (err) { setError(err.message || "Could not update the QR pass."); }
    finally { setPassActionKey(""); }
  }

  async function sendNotification() {
    setError(""); setMessage("");
    if (!notification.user_id || !notification.title.trim() || !notification.message.trim()) return setError("Select a recipient and enter both a title and message.");
    setActionKey("send-notification");
    try {
      await apiAdminCreateNotification(notification);
      setNotification((x) => ({ ...x, title: "", message: "" }));
      await loadDashboard(); setMessage("Notification sent to the selected account.");
    } catch (err) { setError(err.message || "Could not send notification."); }
    finally { setActionKey(""); }
  }

  const sessionEntries = Object.entries(user || {}).filter(([key, value]) => value !== undefined && value !== null && value !== "" && !/token|password|secret/i.test(key)).slice(0, 18);

  return (
    <RoleDashboardShell role="Admin" title="Administration Console" description="One Material 3 workspace for people, permissions, operational records, notifications and platform-level controls." user={user} navItems={navItems}>
      {error ? <div className="ops-alert ops-alert--error"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div> : null}
      {message ? <div className="ops-alert ops-alert--success"><CheckCircle2 size={17} /><span>{message}</span></div> : null}

      <section id="overview" className="dashboard-view adm-section adm-overview adm-overview-v2">
        <div className="adm-command-hero">
          <div className="adm-command-copy">
            <div className="adm-command-eyebrow"><ShieldCheck size={14} /> Admin command center</div>
            <h2>Everything important, in one place.</h2>
            <p>Monitor people, access, approvals and platform activity without jumping between dashboards.</p>
          </div>
          <div className={`adm-command-health ${health.ok ? "is-online" : "is-offline"}`}><span className="adm-command-health-dot" /><div><strong>{health.ok ? "Systems healthy" : "Health check unavailable"}</strong><small>{health.service || "API"} · {health.database || "Database"}</small></div></div>
        </div>
        <div className="adm-kpi-strip">
          <button type="button" className="adm-kpi-panel adm-kpi-panel--primary" onClick={() => { setSelectedRole("all"); setRoleFilter("all"); window.location.hash = "accounts"; }}><span className="adm-kpi-panel-icon"><Users size={18} /></span><span><small>Total accounts</small><strong>{accounts.length}</strong><em>{activeAccounts} active · {inactiveAccounts} inactive</em></span><ChevronRight size={17} /></button>
          <button type="button" className="adm-kpi-panel" onClick={() => { setRoleFilter("doctor"); setSelectedRole("doctor"); window.location.hash = "accounts"; }}><span className="adm-kpi-panel-icon"><Stethoscope size={18} /></span><span><small>Doctors</small><strong>{roleCounts.doctor?.total || 0}</strong><em>{approvedDoctors} approved · {pendingDoctors} pending</em></span><ChevronRight size={17} /></button>
          <button type="button" className="adm-kpi-panel" onClick={() => { setControlTab("notifications"); window.location.hash = "controls"; }}><span className="adm-kpi-panel-icon"><Bell size={18} /></span><span><small>Notifications</small><strong>{data.notifications.length}</strong><em>{unreadNotifications} unread</em></span><ChevronRight size={17} /></button>
          <button type="button" className="adm-kpi-panel" onClick={() => { setControlTab("reviews"); window.location.hash = "controls"; }}><span className="adm-kpi-panel-icon"><MessageSquare size={18} /></span><span><small>Open reviews</small><strong>{openReviews}</strong><em>{data.reviews.length} total threads</em></span><ChevronRight size={17} /></button>
        </div>
        <div className="adm-overview-command-grid">
          <div className="adm-card adm-priority-card"><div className="adm-card-header"><div><span className="adm-section-label">Priority queue</span><h3>What needs attention</h3><p>Start with the items most likely to need an Admin decision.</p></div><span className="adm-card-icon"><AlertCircle size={18} /></span></div><div className="adm-priority-list">
            <button type="button" onClick={() => { setRoleFilter("doctor"); setSelectedRole("doctor"); window.location.hash = "accounts"; }}><span className="adm-priority-icon adm-priority-icon--amber"><Stethoscope size={16} /></span><span><strong>{pendingDoctors} doctor applications</strong><small>Pending verification</small></span><ChevronRight size={17} /></button>
            <button type="button" onClick={() => { setControlTab("reviews"); window.location.hash = "controls"; }}><span className="adm-priority-icon adm-priority-icon--violet"><MessageSquare size={16} /></span><span><strong>{openReviews} open review threads</strong><small>Messages waiting for moderation</small></span><ChevronRight size={17} /></button>
            <button type="button" onClick={() => { setControlTab("notifications"); window.location.hash = "controls"; }}><span className="adm-priority-icon adm-priority-icon--blue"><Bell size={16} /></span><span><strong>{unreadNotifications} unread notifications</strong><small>Communication that needs review</small></span><ChevronRight size={17} /></button>
            <button type="button" onClick={() => { setStatusFilter("inactive"); window.location.hash = "accounts"; }}><span className="adm-priority-icon adm-priority-icon--green"><CircleOff size={16} /></span><span><strong>{inactiveAccounts} inactive accounts</strong><small>Access currently disabled</small></span><ChevronRight size={17} /></button>
          </div></div>
          <div className="adm-card adm-role-overview-card"><div className="adm-card-header"><div><span className="adm-section-label">Organisation</span><h3>People by role</h3><p>Tap a role to open its account list.</p></div><span className="adm-card-icon"><Users size={18} /></span></div><div className="adm-role-overview-list">
            {ROLE_OPTIONS.filter((role) => role.value !== "admin").map((role) => { const Icon = role.icon; const count = roleCounts[role.value]?.total || 0; const active = roleCounts[role.value]?.active || 0; const max = Math.max(1, ...ROLE_OPTIONS.map((r) => roleCounts[r.value]?.total || 0)); return <button key={role.value} type="button" className="adm-role-overview-row" onClick={() => { setSelectedRole(role.value); setRoleFilter(role.value); window.location.hash = "accounts"; }}><span className="adm-role-overview-icon"><Icon size={15} /></span><span className="adm-role-overview-main"><strong>{role.label}</strong><span><i style={{ width: `${Math.max(4, (count / max) * 100)}%` }} /></span></span><span className="adm-role-overview-value"><b>{count}</b><small>{active} active</small></span></button>; })}
          </div></div>
        </div>
        <div className="adm-card adm-recent-admin-card"><div className="adm-card-header"><div><span className="adm-section-label">Live directory</span><h3>Recently added people</h3><p>Quick access to the latest accounts returned by the platform database.</p></div><button className="adm-text-button" type="button" onClick={() => window.location.hash = "people"}>View all people <ChevronRight size={16} /></button></div><div className="adm-profile-grid adm-profile-grid--admin">{recentAccounts.length ? recentAccounts.slice(0, 6).map((account) => <ProfileCard key={account.id} account={account} onOpen={setSelectedProfile} />) : <div className="adm-empty adm-empty--wide"><Users size={25} /><strong>No user records are being returned by the API</strong><span>The Admin UI is connected, but the database currently returned zero accounts. Use the same backend/database instance that serves the login.</span><button type="button" className="adm-button adm-button--tonal" onClick={loadDashboard}><RefreshCw size={15} /> Retry</button></div>}</div></div>
        <div className="adm-card adm-fast-controls-card"><div className="adm-card-header"><div><span className="adm-section-label">Quick controls</span><h3>Common Admin actions</h3><p>Jump directly to the area you use most.</p></div><span className="adm-mini-badge"><Activity size={13} /> Live</span></div><div className="adm-resource-grid">
          <ResourceCard icon={Bell} title="Notifications" subtitle="Review or delete notifications" value={data.notifications.length} onClick={() => { setControlTab("notifications"); window.location.hash = "controls"; }} />
          <ResourceCard icon={MessageSquare} title="Reviews & messages" subtitle="Moderate conversations" value={data.reviews.length} onClick={() => { setControlTab("reviews"); window.location.hash = "controls"; }} tone="violet" />
          <ResourceCard icon={FileText} title="Documents" subtitle="Inspect and remove files" value={data.documents.length} onClick={() => { setControlTab("documents"); window.location.hash = "controls"; }} tone="teal" />
          <ResourceCard icon={Database} title="Operations" subtitle="Accommodation, Darshan, Travel & roster" value={data.accommodation.length + data.darshan.length + data.travel.length + data.roster.length} onClick={() => { setControlTab("operations"); window.location.hash = "controls"; }} tone="amber" />
        </div></div>
      </section>

      <section id="people" className="dashboard-view adm-section adm-card">
        <div className="adm-card-header"><div><span className="adm-section-label">People & profiles</span><h3>Complete profile directory</h3><p>Click any person to inspect their profile details.</p></div><div className="adm-account-count"><strong>{accounts.length}</strong><span>people</span></div></div>
        <div className="adm-profile-grid adm-profile-grid--large">{filteredAccounts.slice(0, 24).map((account) => <ProfileCard key={account.id} account={account} onOpen={setSelectedProfile} />)}{!filteredAccounts.length ? <div className="adm-empty adm-empty--wide"><Search size={24} /><strong>No profiles match the current filters</strong><span>Clear your search or role/status filters.</span></div> : null}</div>
      </section>

      <section id="accounts" className="dashboard-view adm-section adm-card">
        <div className="adm-card-header adm-card-header--stack-mobile"><div><span className="adm-section-label">Account control</span><h3>All accounts</h3><p>Activate, deactivate, open dashboards, inspect or permanently delete accounts.</p></div><div className="adm-account-count"><strong>{filteredAccounts.length}</strong><span>shown</span></div></div>
        <div className="adm-toolbar"><label className="adm-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, department, institution..." /><kbd>⌘ K</kbd></label><label className="adm-filter"><Filter size={16} /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option>{ROLE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label className="adm-filter"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>{selectedRole !== "all" ? <button className="adm-clear-filter" onClick={() => setSelectedRole("all")}>Clear role <X size={14} /></button> : null}</div>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Person</th><th>Role</th><th>Department / organisation</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>
          {filteredAccounts.map((account) => <tr key={account.id}><td><button type="button" className="adm-account-cell adm-table-link" onClick={() => setSelectedProfile(account)}>{profileImageUrl(account.profile_picture) ? <img className="adm-avatar" src={profileImageUrl(account.profile_picture)} alt="" /> : <span className="adm-avatar">{initials(account.full_name)}</span>}<span><strong>{account.full_name || "Unnamed account"}</strong><small>{account.email}</small></span></button></td><td><span className="adm-role-chip">{labelForRole(account.role)}</span></td><td><span className="adm-org-cell">{account.role === "hod" ? safeText(account.department) : safeText(account.institution || account.department)}</span></td><td><span className={`ops-status-badge ${account.active ? "is-success" : "is-danger"}`}>{account.active ? "Active" : "Inactive"}</span></td><td><span className="adm-created">{formatDate(account.created_at)}</span></td><td><div className="adm-row-actions"><button className={`adm-icon-action ${account.active ? "is-danger" : "is-success"}`} disabled={actionKey === `status-${account.id}`} onClick={() => toggleAccount(account)} title={account.active ? "Deactivate" : "Activate"}>{actionKey === `status-${account.id}` ? <RefreshCw className="ops-spin" size={16} /> : <CircleOff size={16} />}</button><a className="adm-icon-action" href={account.role === "doctor" ? "/dashboard/doctor" : account.role === "director" ? "/dashboard/directorate" : account.role === "hod" ? "/dashboard/hod" : account.role === "accommodation" ? "/dashboard/accommodation" : account.role === "mandir" ? "/dashboard/mandir" : account.role === "travel" ? "/dashboard/travel" : account.role === "it" ? "/dashboard/it" : "/dashboard/admin"} title={`Open ${labelForRole(account.role)} dashboard`}><LayoutDashboard size={16} /></a><button className="adm-icon-action" onClick={() => copyText(account.id, `id-${account.id}`)} title="Copy account ID">{copied === `id-${account.id}` ? <CheckCircle2 size={16} /> : <Copy size={16} />}</button><button className="adm-icon-action is-danger" disabled={actionKey === `users-${account.id}`} onClick={() => setConfirmDelete({ resource: "users", id: account.id, label: account.full_name || account.email })} title="Delete account"><Trash2 size={16} /></button></div></td></tr>)}
          {!filteredAccounts.length ? <tr><td colSpan="6"><div className="adm-empty"><Users size={24} /><strong>No accounts returned</strong><span>Check the backend database connection and refresh.</span></div></td></tr> : null}
        </tbody></table></div>
      </section>

      <section id="controls" className="dashboard-view adm-section adm-card">
        <div className="adm-card-header"><div><span className="adm-section-label">Admin moderation</span><h3>Platform controls</h3><p>Delete notifications, review messages, documents and operational records directly from the Admin workspace.</p></div><span className="adm-mini-badge">Admin only</span></div>
        <div className="adm-control-tabs">{[["notifications","Notifications",Bell,data.notifications.length],["reviews","Reviews & messages",MessageSquare,data.reviews.length],["documents","Documents",FileText,data.documents.length],["operations","Operations",ListChecks,data.accommodation.length + data.darshan.length + data.travel.length + data.roster.length]].map(([value,label,Icon,count]) => <button key={value} type="button" className={controlTab === value ? "is-active" : ""} onClick={() => setControlTab(value)}><Icon size={16} /><span>{label}</span><b>{count}</b></button>)}</div>

        {controlTab === "notifications" ? <div className="adm-control-layout"><div className="adm-subcard"><div className="adm-card-header"><div><h4>Send notification</h4><p>Send a platform notification to any account.</p></div><span className="adm-card-icon"><Send size={18} /></span></div><div className="adm-form-grid"><label className="adm-span-2"><span>Recipient</span><select value={notification.user_id} onChange={(e) => setNotification((x) => ({ ...x, user_id: e.target.value }))}><option value="">Select account</option>{accounts.map((x) => <option key={x.id} value={x.id}>{x.full_name || x.email} — {labelForRole(x.role)}</option>)}</select></label><label className="adm-span-2"><span>Title</span><input value={notification.title} onChange={(e) => setNotification((x) => ({ ...x, title: e.target.value }))} placeholder="Platform announcement" /></label><label className="adm-span-2"><span>Message</span><textarea value={notification.message} onChange={(e) => setNotification((x) => ({ ...x, message: e.target.value }))} placeholder="Write the notification message..." rows="4" /></label></div><div className="adm-form-footer"><span>Existing notification delivery behaviour is preserved.</span><button className="adm-button adm-button--filled" onClick={sendNotification} disabled={actionKey === "send-notification"}>{actionKey === "send-notification" ? "Sending…" : "Send notification"}<Send size={15} /></button></div></div><div className="adm-subcard"><div className="adm-card-header"><div><h4>Recent notifications</h4><p>Delete individual records when moderation is required.</p></div></div><div className="adm-control-list">{data.notifications.slice(0, 20).map((item) => <div className="adm-control-row" key={item.id}><span className="adm-control-leading"><Bell size={16} /></span><span><strong>{item.title}</strong><small>{item.full_name || item.email} · {formatDate(item.created_at)}</small><em>{item.message}</em></span><button className="adm-icon-action is-danger" disabled={actionKey === `notifications-${item.id}`} onClick={() => setConfirmDelete({ resource: "notifications", id: item.id, label: item.title })} title="Delete notification"><Trash2 size={16} /></button></div>)}{!data.notifications.length ? <div className="adm-empty"><Bell size={22} /><strong>No notifications</strong></div> : null}</div></div></div> : null}

        {controlTab === "reviews" ? <div className="adm-control-list adm-control-list--full"><div className="adm-control-section-label">Review threads</div>{data.reviews.slice(0, 50).map((item) => <div className="adm-control-row" key={item.id}><span className="adm-control-leading"><MessageSquare size={16} /></span><span><strong>{item.original_name || "Review thread"}</strong><small>{item.doctor_name || item.doctor_email} · {item.message_count} messages · {item.status} · {formatDate(item.created_at)}</small></span><a className="adm-icon-action" href={`/dashboard/directorate#applications`} title="Open review workspace"><Eye size={16} /></a><button className="adm-icon-action is-danger" onClick={() => setConfirmDelete({ resource: "review_threads", id: item.id, label: item.original_name || "Review thread" })} title="Delete review thread and messages"><Trash2 size={16} /></button></div>)}<div className="adm-control-section-label">Messages</div>{(data.messages || []).slice(0, 80).map((item) => <div className="adm-control-row" key={`message-${item.id}`}><span className="adm-control-leading"><MessageSquare size={15} /></span><span><strong>{item.author_name || item.author_email} → {item.doctor_name || "Doctor"}</strong><small>{formatDate(item.created_at)} · Thread {String(item.thread_id).slice(0, 8)}…</small><em>{item.body}</em></span><button className="adm-icon-action is-danger" onClick={() => setConfirmDelete({ resource: "review_messages", id: item.id, label: "Review message" })} title="Delete review message"><Trash2 size={16} /></button></div>)}{!data.reviews.length && !(data.messages || []).length ? <div className="adm-empty"><MessageSquare size={22} /><strong>No review conversations</strong></div> : null}</div> : null}

        {controlTab === "documents" ? <div className="adm-control-list adm-control-list--full">{data.documents.slice(0, 50).map((item) => <div className="adm-control-row" key={item.id}><span className="adm-control-leading"><FileText size={16} /></span><span><strong>{item.original_name}</strong><small>{item.full_name || item.email} · {item.document_type} · {formatBytes(item.size_bytes)} · {item.verification_status}</small></span><a className="adm-icon-action" href={apiFileUrl(`/api/files/${item.id}`)} target="_blank" rel="noreferrer" title="Open document"><Eye size={16} /></a><button className="adm-icon-action is-danger" disabled={actionKey === `documents-${item.id}`} onClick={() => setConfirmDelete({ resource: "documents", id: item.id, label: item.original_name })} title="Delete document"><Trash2 size={16} /></button></div>)}{!data.documents.length ? <div className="adm-empty"><FileText size={22} /><strong>No documents</strong></div> : null}</div> : null}

        {controlTab === "operations" ? <div className="adm-control-list adm-control-list--full"><OperationList title="Accommodation" icon={Building2} rows={data.accommodation} getLabel={(x) => `${x.full_name || x.email} · ${x.status} · ${x.block || "No block"} ${x.room || ""}`} resource="accommodation" onDelete={(x) => setConfirmDelete({ resource: "accommodation", id: x.id, label: "Accommodation record" })} /><OperationList title="Darshan" icon={DoorOpen} rows={data.darshan} getLabel={(x) => `${x.full_name || x.email} · ${x.status} · ${x.purpose || "Darshan request"}`} resource="darshan" onDelete={(x) => setConfirmDelete({ resource: "darshan", id: x.id, label: "Darshan request" })} /><OperationList title="Travel" icon={Plane} rows={data.travel} getLabel={(x) => `${x.full_name || x.email} · letter ${x.letter_status} · pickup ${x.pickup_status}`} resource="travel" onDelete={(x) => setConfirmDelete({ resource: "travel", id: x.id, label: "Travel record" })} /><OperationList title="Roster" icon={ListChecks} rows={data.roster} getLabel={(x) => `${x.full_name || x.email} · ${x.department} · ${x.day} · ${x.slot}`} resource="roster" onDelete={(x) => setConfirmDelete({ resource: "roster", id: x.id, label: "Roster entry" })} /></div> : null}
      </section>


      <section id="passes" className="dashboard-view adm-section adm-card">
        <div className="adm-card-header"><div><span className="adm-section-label">Secure identity</span><h3>Lifetime QR passes</h3><p>Each approved healthcare volunteer receives an opaque, revocable QR token. Revoked tokens remain invalid; use Reissue new QR to create a replacement without restoring the old token.</p></div><span className="adm-card-icon"><ShieldCheck size={18} /></span></div>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Person</th><th>Category</th><th>Institution</th><th>Status</th><th>Issued</th><th>Actions</th></tr></thead><tbody>{(data.passes || []).length ? Object.values((data.passes || []).reduce((groups, pass) => { const key = pass.user_id || pass.email || pass.id; (groups[key] ||= []).push(pass); return groups; }, {})).map((passes) => { const live = passes.find((p) => p.status === "active" || p.status === "suspended"); const current = live || passes[0]; const history = passes.filter((p) => p.id !== current.id).sort((a,b) => new Date(b.issued_at) - new Date(a.issued_at)); return <tr key={`${current.user_id || current.id}-current`}><td><strong>{safeText(current.full_name)}</strong><small>{safeText(current.email)}</small>{history.length ? <span className="adm-pass-history-count">{history.length} previous pass{history.length === 1 ? "" : "es"}</span> : null}</td><td>{safeText(current.service_category)}</td><td>{safeText(current.institution)}</td><td><span className={`adm-status-pill ${current.status === "active" ? "is-active" : current.status === "suspended" ? "is-warning" : "is-offline"}`}>{current.status}</span>{history.length ? <small className="adm-pass-history-note">{history.length} revoked/previous record{history.length === 1 ? "" : "s"}</small> : null}</td><td>{formatDate(current.issued_at)}</td><td><div className="flex flex-wrap gap-2">{current.status === "active" ? <button className="adm-button adm-button--text" disabled={passActionKey===`suspend-${current.id}`} onClick={() => managePass("suspend",current)}>{passActionKey===`suspend-${current.id}`?"Suspending…":"Suspend"}</button> : null}{current.status === "active" || current.status === "suspended" ? <button className="adm-button adm-button--text" disabled={passActionKey===`revoke-${current.id}`} onClick={() => managePass("revoke",current)}>{passActionKey===`revoke-${current.id}`?"Revoking…":"Revoke"}</button> : current.status === "revoked" ? <button className="adm-button adm-button--text adm-button--reissue" disabled={passActionKey===`reissue-${current.id}`} onClick={() => managePass("reissue",current)}>{passActionKey===`reissue-${current.id}`?"Reissuing…":"Reissue new QR"}</button> : null}</div></td></tr>; }) : <tr><td colSpan="6"><div className="py-8 text-center text-sm text-muted-foreground">No lifetime passes have been issued yet. They are created automatically when the Directorate approves an application.</div></td></tr>}</tbody></table></div>
      </section>

      <section id="application-status" className="dashboard-view adm-section adm-card">
        <div className="adm-card-header">
          <div>
            <span className="adm-section-label">Application decisions</span>
            <h3>Decision history control</h3>
            <p>Admin-only management for the Directorate decisions that appear in a doctor’s Application status timeline.</p>
          </div>
          <span className="adm-card-icon"><ClipboardList size={19} /></span>
        </div>
        <div className="adm-decision-toolbar">
          <div><strong>{(data.decisionHistory || []).length}</strong><span>decision records loaded</span></div>
          <div><span className="adm-chip adm-chip--info"><ShieldCheck size={14} /> Admin control</span><small>Edit notes or permanently remove a decision-history record.</small></div>
        </div>
        <div className="adm-decision-list">
          {(data.decisionHistory || []).map((item) => {
            const action = String(item.action || "").toLowerCase();
            const tone = action === "approved" ? "success" : action === "declined" ? "danger" : action === "info_requested" ? "warning" : "neutral";
            const label = action === "approved" ? "Application approved" : action === "declined" ? "Application declined" : action === "info_requested" ? "Information requested" : action.replaceAll("_", " ");
            return (
              <article className="adm-decision-row" key={item.id}>
                <span className={`adm-decision-icon adm-decision-icon--${tone}`}>{action === "approved" ? <CheckCircle2 size={17} /> : action === "declined" ? <X size={17} /> : action === "info_requested" ? <AlertCircle size={17} /> : <ClipboardList size={17} />}</span>
                <div className="adm-decision-main">
                  <div className="adm-decision-title"><strong>{label}</strong><span>{formatDate(item.created_at)}</span></div>
                  <div className="adm-decision-meta"><span>{item.doctor_name || item.doctor_email || "Unknown doctor"}</span><span>by {item.actor_name || "Reviewer"}</span></div>
                  <p>{item.note || "No decision note recorded."}</p>
                </div>
                <div className="adm-decision-actions">
                  <button className="adm-button adm-button--text adm-button--compact" onClick={() => { setEditingDecision(item); setEditingDecisionNote(item.note || ""); }}><PenLine size={15} /> Edit note</button>
                  <button className="adm-icon-action is-danger" onClick={() => setConfirmDelete({ resource: "decision-history", id: item.id, label: `${label} for ${item.doctor_name || item.doctor_email || "doctor"}` })} title="Delete decision history"><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}
          {!(data.decisionHistory || []).length ? <div className="adm-empty"><ClipboardList size={22} /><strong>No application decisions</strong><span>Directorate decisions will appear here once available.</span></div> : null}
        </div>
      </section>

      <section id="provision" className="dashboard-view adm-section adm-main-grid adm-main-grid--provision">
        <div className="adm-card"><div className="adm-card-header"><div><span className="adm-section-label">Provisioning</span><h3>Create a new account</h3><p>All supported platform roles are available to Admin.</p></div><span className="adm-card-icon"><UserPlus size={19} /></span></div><div className="adm-form-grid"><label><span>Full name</span><input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Dr. Aarti Sharma" /></label><label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="name@example.com" /></label><label><span>Role</span><select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>{ROLE_OPTIONS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>{form.role === "hod" ? <label><span>Department</span><input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="Cardiology" /></label> : <label><span>Institution</span><input value={form.institution} onChange={(e) => setForm((p) => ({ ...p, institution: e.target.value }))} placeholder="Sri Sathya Sai Institute" /></label>}<label className="adm-span-2"><span>Temporary password</span><div className="adm-password-input"><KeyRound size={17} /><input type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Minimum 8 characters" /></div></label></div><div className="adm-form-footer"><span>Account creation uses the existing provisioning flow.</span><button className="adm-button adm-button--filled" onClick={handleProvision} disabled={provisioning}>{provisioning ? "Creating…" : "Create account"}<UserPlus size={16} /></button></div></div>
        <div className="adm-card adm-security-card"><span className="adm-section-label">Admin authority</span><h3>Full platform control</h3><div className="adm-security-list"><div><CheckCircle2 size={17} /><span><strong>People & access</strong><small>View every account, profile field and role.</small></span></div><div><CheckCircle2 size={17} /><span><strong>Moderation</strong><small>Delete notifications, review threads, documents and operational records.</small></span></div><div><CheckCircle2 size={17} /><span><strong>Provisioning</strong><small>Create Director, HoD, Doctor and every operations-team account.</small></span></div><div><CheckCircle2 size={17} /><span><strong>Audit-friendly</strong><small>Destructive admin actions are written to the existing audit table.</small></span></div></div></div>
      </section>

      <section id="session" className="dashboard-view adm-section adm-card"><div className="adm-card-header"><div><span className="adm-section-label">Security</span><h3>Current admin session</h3><p>Non-sensitive session metadata only.</p></div><span className="adm-card-icon"><KeyRound size={19} /></span></div><div className="adm-session-grid">{sessionEntries.map(([key,value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{typeof value === "object" ? JSON.stringify(value) : String(value)}</strong></div>)}</div><div className="adm-session-footer"><span><ShieldCheck size={15} /> Admin endpoints are role-protected on the server.</span><button className="adm-button adm-button--text" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top <ChevronRight size={16} /></button></div></section>

      {selectedProfile ? createPortal(<div className="adm-modal-backdrop" role="presentation" onClick={() => setSelectedProfile(null)}><div className="adm-modal adm-profile-modal" role="dialog" aria-modal="true" aria-labelledby="adm-profile-dialog-title" onClick={(e) => e.stopPropagation()}><div className="adm-modal-header"><div><span className="adm-section-label">Profile</span><h3 id="adm-profile-dialog-title">{selectedProfile.full_name || "Unnamed account"}</h3><p>{labelForRole(selectedProfile.role)} · {selectedProfile.email}</p></div><button className="adm-icon-action" onClick={() => setSelectedProfile(null)} aria-label="Close"><X size={17} /></button></div><div className="adm-profile-detail-head">{profileImageUrl(selectedProfile.profile_picture) ? <img src={profileImageUrl(selectedProfile.profile_picture)} alt="" className="adm-profile-detail-avatar" /> : <span className="adm-profile-detail-avatar adm-profile-avatar--fallback">{initials(selectedProfile.full_name)}</span>}<div><strong>{selectedProfile.full_name || "Unnamed account"}</strong><span>{selectedProfile.active ? "Active account" : "Inactive account"}</span></div><span className="adm-role-chip">{labelForRole(selectedProfile.role)}</span></div><div className="adm-detail-grid">{Object.entries(selectedProfile).filter(([key,value]) => !["id","password_hash","role","active","created_at","updated_at","profile_picture"].includes(key) && value !== "" && value !== null && value !== undefined).map(([key,value]) => <div key={key}><span>{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong></div>)}</div><div className="adm-modal-footer"><button className="adm-button adm-button--tonal" onClick={() => copyText(selectedProfile.id, "profile-id")}>{copied === "profile-id" ? "Copied" : "Copy account ID"} <Copy size={15} /></button><button className="adm-button adm-button--filled" onClick={() => { setSelectedProfile(null); setConfirmDelete({ resource: "users", id: selectedProfile.id, label: selectedProfile.full_name || selectedProfile.email }); }}><Trash2 size={15} /> Delete account</button></div></div></div>, document.body) : null}


      {editingDecision ? createPortal(<div className="adm-modal-backdrop" role="presentation" onClick={() => setEditingDecision(null)}><div className="adm-modal adm-confirm-modal adm-decision-edit-modal" role="dialog" aria-modal="true" aria-labelledby="adm-edit-decision-title" onClick={(e) => e.stopPropagation()}>
        <span className="adm-confirm-icon"><PenLine size={22} /></span>
        <h3 id="adm-edit-decision-title">Edit decision note</h3>
        <p>{editingDecision.doctor_name || editingDecision.doctor_email || "Doctor"} · {String(editingDecision.action || "").replaceAll("_", " ")}</p>
        <label className="adm-edit-field"><span>Decision note</span><textarea value={editingDecisionNote} onChange={(e) => setEditingDecisionNote(e.target.value)} rows={5} placeholder="Enter the note shown with this decision." /></label>
        <div className="adm-modal-footer"><button className="adm-button adm-button--tonal" onClick={() => setEditingDecision(null)}>Cancel</button><button className="adm-button adm-button--filled" onClick={saveDecisionEdit} disabled={actionKey === `decision-edit-${editingDecision.id}`}>{actionKey === `decision-edit-${editingDecision.id}` ? "Saving…" : "Save changes"}</button></div>
      </div></div>, document.body) : null}

      {confirmDelete ? createPortal(<div className="adm-modal-backdrop" role="presentation" onClick={() => setConfirmDelete(null)}><div className="adm-modal adm-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-confirm-title" onClick={(e) => e.stopPropagation()}><span className="adm-confirm-icon"><Trash2 size={22} /></span><h3 id="adm-confirm-title">Delete {confirmDelete.label}?</h3><p>This is a permanent admin action. The existing database cascades will remove dependent records where configured.</p><div className="adm-modal-footer"><button className="adm-button adm-button--tonal" onClick={() => setConfirmDelete(null)}>Cancel</button><button className="adm-button adm-button--danger" onClick={() => deleteResource(confirmDelete.resource, confirmDelete.id, confirmDelete.label)}>Delete permanently</button></div></div></div>, document.body) : null}
    </RoleDashboardShell>
  );
}

function OperationList({ title, icon: Icon, rows, getLabel, onDelete }) {
  return <div className="adm-operation-block"><div className="adm-operation-heading"><span><Icon size={16} />{title}</span><b>{rows.length}</b></div>{rows.slice(0, 20).map((row) => <div className="adm-control-row" key={row.id}><span><strong>{getLabel(row)}</strong><small>{formatDate(row.created_at)}</small></span><button className="adm-icon-action is-danger" onClick={() => onDelete(row)} title={`Delete ${title} record`}><Trash2 size={16} /></button></div>)}{!rows.length ? <div className="adm-mini-empty">No {title.toLowerCase()} records.</div> : null}</div>;
}
