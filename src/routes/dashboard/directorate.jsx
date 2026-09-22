import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/RoleDashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { apiGetAllDoctors, apiGetDoctorDocuments, apiUpdateDoctorStatus, apiCreateReview, apiFileUrl } from "@/lib/api";
import { getCurrentUser, getAuthToken } from "@/lib/auth";
import "./directorate.css";

const DEPARTMENTS = ["Cardiology", "Cardiac Surgery", "Neurosurgery", "Urology", "Orthopedics", "Ophthalmology", "Anesthesiology", "General Medicine"];
const navItems = [
  { id: "overview", label: "Overview", href: "#overview" },
  { id: "applications", label: "Doctor applications", href: "#applications" },
  { id: "analytics", label: "Department analytics", href: "#analytics" },
];

export const Route = createFileRoute("/dashboard/directorate")({
  head: () => ({ meta: [{ title: "Directorate Dashboard — PRANASAKHA" }] }),
  component: DirectorateDashboard,
});

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function initials(name = "Doctor") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "DR";
}
function csv(rows) {
  return [
    ["Doctor", "Email", "Specialty", "Experience", "Status", "Department", "Submitted"],
    ...rows.map((d) => [d.full_name, d.email, d.specialty, d.years_experience, d.status, d.department_route, d.created_at]),
  ].map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
}
function downloadCsv(rows) {
  const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "pranasakha-directorate-applications.csv";
  a.click();
  URL.revokeObjectURL(url);
}
function DetailGroup({ title, fields }) {
  return <section className="directorate-detail-group"><div className="directorate-detail-title"><span>{title}</span></div><div className="directorate-detail-grid">{fields.map(([label, value]) => <div className="directorate-detail-item" key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</div></section>;
}
function StatusPill({ label, count, active, onClick }) {
  return <button className={`directorate-status-pill ${active ? "is-active" : ""}`} onClick={onClick}><span>{label}</span><strong>{count}</strong></button>;
}

function DirectorateDashboard() {
  const user = getCurrentUser();
  const [doctors, setDoctors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [activeQueue, setActiveQueue] = useState("all");
  const [department, setDepartment] = useState("");
  const [note, setNote] = useState("");
  const [drawerTab, setDrawerTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [reviewingDocumentId, setReviewingDocumentId] = useState("");
  const [error, setError] = useState("");

  async function loadDoctors() {
    try {
      const data = await apiGetAllDoctors();
      setDoctors(data || []);
      if (selected) setSelected((data || []).find((x) => x.id === selected.id) || null);
    } catch (err) {
      setError(err.message || "Failed to load applications.");
    }
  }

  useEffect(() => { loadDoctors().finally(() => setLoading(false)); }, []);

  const counts = useMemo(() => ({
    total: doctors.length,
    pending: doctors.filter((d) => d.status === "pending").length,
    info: doctors.filter((d) => d.status === "info_requested").length,
    approved: doctors.filter((d) => d.status === "approved").length,
    declined: doctors.filter((d) => d.status === "declined").length,
  }), [doctors]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const hay = [d.full_name, d.email, d.specialty, d.sub_specialty, d.affiliation, d.department_route, d.preferred_institutions].join(" ").toLowerCase();
      return (!needle || hay.includes(needle))
        && (activeQueue === "all" || d.status === activeQueue)
        && (statusFilter === "all" || d.status === statusFilter)
        && (departmentFilter === "all" || d.department_route === departmentFilter);
    });
  }, [doctors, query, activeQueue, statusFilter, departmentFilter]);

  async function openDoctor(doctor) {
    setSelected(doctor);
    setDepartment(doctor.department_route || "");
    setNote(doctor.director_note || doctor.latest_review_note || "");
    setDrawerTab("summary");
    setError("");
    try {
      setSelectedDocuments(await apiGetDoctorDocuments(doctor.user_id));
    } catch (err) {
      setSelectedDocuments([]);
      setError(err.message || "Could not load applicant documents.");
    }
  }

  async function openDocument(doc) {
    const target = window.open("", "_blank");
    if (!target) {
      setError("Your browser blocked the document window. Allow pop-ups for PRANASAKHA and try again.");
      return;
    }
    target.document.write(`<html><head><title>${String(doc.original_name || "Document").replaceAll("<", "&lt;")}</title></head><body style="font-family:system-ui,sans-serif;padding:32px;color:#3c4048">Opening document…</body></html>`);
    try {
      const token = getAuthToken();
      const response = await fetch(apiFileUrl(doc.storage_url), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error((await response.text()) || `Unable to open the document (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      target.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      target.document.body.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:32px;color:#b3261e"><h2>Unable to open document</h2><p>${String(err.message || "Authentication or file access failed.").replaceAll("<", "&lt;")}</p></div>`;
    }
  }

  function goToDrawerTab(tab) {
    setDrawerTab(tab);
    requestAnimationFrame(() => {
      document.querySelector(".directorate-drawer__scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function performAction(status) {
    if (!selected || !user?.id) return;
    if (status === "approved" && !department) {
      setError("Choose the receiving department before approving this application.");
      return;
    }
    if ((status === "declined" || status === "info_requested") && !note.trim()) {
      setError(status === "declined" ? "A decline reason is required and will be shown to the doctor." : "Explain exactly what information is required so the doctor can respond.");
      return;
    }
    setActioning(true);
    setError("");
    try {
      const updated = await apiUpdateDoctorStatus(selected.id, status, department || selected.department_route, user.id, note.trim());
      setSelected(updated);
      setDoctors((rows) => rows.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      setNote("");
    } catch (err) {
      setError(err.message || "Could not update this application.");
    } finally {
      setActioning(false);
    }
  }

  return (
    <RoleDashboardShell
      role="Director / Joint Director"
      title="Directorate review centre"
      description="Review incoming healthcare professionals, make documented decisions, and route approved specialists to the correct department with a clear audit trail."
      user={user}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search by doctor, specialty, email or hospital…"
      navItems={navItems}
    >
      {error ? <div className="dash-alert dash-alert--error"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div> : null}

      <section id="overview" className="dashboard-view directorate-overview">
        <div className="directorate-stat-grid">
          <button className="directorate-stat-button" onClick={() => setActiveQueue("all")}><StatCard icon={Users} label="Total applicants" value={counts.total} hint="All submitted applications" tone="blue" /></button>
          <button className="directorate-stat-button" onClick={() => setActiveQueue("pending")}><StatCard icon={ClipboardCheck} label="Awaiting review" value={counts.pending} hint="Priority review queue" tone="orange" /></button>
          <button className="directorate-stat-button" onClick={() => setActiveQueue("info_requested")}><StatCard icon={Info} label="Needs information" value={counts.info} hint="Doctor action required" tone="purple" /></button>
          <button className="directorate-stat-button" onClick={() => setActiveQueue("approved")}><StatCard icon={ShieldCheck} label="Approved" value={counts.approved} hint="Successfully routed" tone="green" /></button>
        </div>

        <div className="directorate-review-focus">
          <div>
            <span className="dashboard-panel__eyebrow">Review queue</span>
            <h2>{counts.pending ? `${counts.pending} application${counts.pending === 1 ? "" : "s"} need your attention` : "The review queue is clear"}</h2>
            <p>{counts.pending ? "Open an applicant, review evidence, then record one of three outcomes. Every request for information or decline must carry a reason visible to the doctor." : "Use the application directory to review approved, information-requested and historical applications."}</p>
          </div>
          <button className="dashboard-button dashboard-button--success" onClick={() => { setActiveQueue("pending"); window.location.hash = "applications"; }}><ClipboardCheck size={16} /> Open review queue <ChevronRight size={15} /></button>
        </div>

        <div className="directorate-overview-grid">
          <article className="dashboard-panel directorate-queue-card"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Decision mix</span><h2>Applications by stage</h2><p>Use the stage buttons to move directly into the corresponding work queue.</p></div></div><div className="directorate-status-pills"><StatusPill label="Pending" count={counts.pending} active={activeQueue === "pending"} onClick={() => { setActiveQueue("pending"); window.location.hash = "applications"; }} /><StatusPill label="Needs information" count={counts.info} active={activeQueue === "info_requested"} onClick={() => { setActiveQueue("info_requested"); window.location.hash = "applications"; }} /><StatusPill label="Approved" count={counts.approved} active={activeQueue === "approved"} onClick={() => { setActiveQueue("approved"); window.location.hash = "applications"; }} /><StatusPill label="Declined" count={counts.declined} active={activeQueue === "declined"} onClick={() => { setActiveQueue("declined"); window.location.hash = "applications"; }} /></div></article>
          <article className="dashboard-panel directorate-principles-card"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Decision discipline</span><h2>Designed for accountable handoff</h2></div></div><div className="directorate-rule"><span>01</span><div><strong>Review evidence first</strong><p>Supporting documents stay attached to the application and open inside this authorised review workspace.</p></div></div><div className="directorate-rule"><span>02</span><div><strong>Reason every exception</strong><p>Information requests and declines require a written reason that the applicant can understand.</p></div></div><div className="directorate-rule"><span>03</span><div><strong>Route every approval</strong><p>An approval is not complete until a receiving department is selected for the HoD handoff.</p></div></div></article>
        </div>
      </section>

      <section id="applications" className="dashboard-view dashboard-panel directorate-applications">
        <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Applicant directory</span><h2>Doctor applications</h2><p>Use status and department filters to focus the queue. Select any row for the full applicant workspace.</p></div><div className="dashboard-panel__actions"><button className="dashboard-button dashboard-button--ghost" onClick={() => downloadCsv(filtered)}><Download size={15} /> Export</button><button className="dashboard-button dashboard-button--ghost" onClick={async () => { setRefreshing(true); await loadDoctors(); setRefreshing(false); }}><RefreshCw size={15} /> {refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
        <div className="directorate-toolbar">
          <div className="directorate-status-tabs">
            {[['all','All',counts.total],['pending','Pending',counts.pending],['info_requested','Needs information',counts.info],['approved','Approved',counts.approved],['declined','Declined',counts.declined]].map(([id,label,count]) => <button key={id} className={activeQueue === id ? "is-active" : ""} onClick={() => setActiveQueue(id)}>{label}<span>{count}</span></button>)}
          </div>
          <div className="directorate-filter-row">
            <label className="directorate-list-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter the visible queue…" /></label>
            <label className="directorate-select"><Filter size={15} /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="info_requested">Needs information</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label>
            <label className="directorate-select"><SlidersHorizontal size={15} /><select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="all">All departments</option>{DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </div>
        <div className="directorate-results-meta"><span>{loading ? "Loading applications…" : `${filtered.length} application${filtered.length === 1 ? "" : "s"} shown`}</span><span>Click a row to inspect details</span></div>
        <div className="directorate-table-wrap">
          <table className="directorate-table"><thead><tr><th>Doctor</th><th>Specialty</th><th>Department</th><th>Experience</th><th>Submitted</th><th>Status</th><th /></tr></thead><tbody>
            {loading ? <tr><td colSpan="7" className="directorate-empty-row">Loading applications…</td></tr> : filtered.length === 0 ? <tr><td colSpan="7" className="directorate-empty-row"><SlidersHorizontal size={20} /><strong>No applications match these filters</strong><span>Clear a filter or search phrase to widen the queue.</span></td></tr> : filtered.map((doctor) => <tr key={doctor.id} className={selected?.id === doctor.id ? "is-selected" : ""} onClick={() => openDoctor(doctor)}><td><div className="directorate-doctor-cell"><span className="directorate-avatar">{initials(doctor.full_name)}</span><div><strong>{doctor.full_name || doctor.email || "Doctor"}</strong><small>{doctor.email}</small></div></div></td><td><strong>{doctor.specialty || "Not specified"}</strong><small>{doctor.sub_specialty || "Professional profile"}</small></td><td>{doctor.department_route || <span className="directorate-unassigned">Awaiting route</span>}</td><td>{doctor.years_experience ? `${doctor.years_experience} yrs` : "—"}</td><td>{dateText(doctor.created_at)}</td><td><StatusBadge status={doctor.status} /></td><td><ChevronRight size={17} /></td></tr>)}
          </tbody></table>
        </div>
      </section>

      <section id="analytics" className="dashboard-view directorate-analytics">
        <article className="dashboard-panel"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Department routing</span><h2>Pipeline by department</h2><p>See where applications are entering, waiting and completing the approval handoff.</p></div></div><div className="directorate-pipeline">{DEPARTMENTS.map((dept) => { const total = doctors.filter((d) => d.department_route === dept || d.specialty === dept).length; const approved = doctors.filter((d) => d.status === "approved" && d.department_route === dept).length; const pct = total ? Math.round((approved / total) * 100) : 0; return <button className="directorate-pipeline-row" key={dept} onClick={() => { setDepartmentFilter(dept); setActiveQueue("all"); window.location.hash = "applications"; }}><div><strong>{dept}</strong><span>{approved} approved • {total} in pipeline</span></div><div className="directorate-pipeline-meter"><span style={{ width: `${Math.min(100, pct)}%` }} /></div><small>{pct}%</small></button>; })}</div></article>
        <article className="dashboard-panel directorate-snapshot"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Operational snapshot</span><h2>What needs attention</h2></div></div><div className="directorate-snapshot-row"><span className="directorate-snapshot-icon is-warning"><ClipboardCheck size={16} /></span><div><strong>{counts.pending} pending reviews</strong><span>Applications waiting for a Directorate decision.</span></div></div><div className="directorate-snapshot-row"><span className="directorate-snapshot-icon is-info"><Info size={16} /></span><div><strong>{counts.info} information requests</strong><span>Doctors who need to respond or upload additional evidence.</span></div></div><div className="directorate-snapshot-row"><span className="directorate-snapshot-icon is-success"><ShieldCheck size={16} /></span><div><strong>{counts.approved} approved</strong><span>Applications already handed to department HoDs.</span></div></div></article>
      </section>

      {selected ? <div className="directorate-drawer-backdrop" onClick={() => setSelected(null)}><aside className="directorate-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="directorate-drawer__header">
          <div className="directorate-drawer__header-main">
            <span className="directorate-avatar directorate-avatar--large">{initials(selected.full_name)}</span>
            <div className="directorate-drawer__header-copy">
              <div className="directorate-drawer__kicker"><span>Applicant workspace</span><StatusBadge status={selected.status} /></div>
              <h2>{selected.full_name || "Doctor"}</h2>
              <p>{selected.specialty || "Healthcare volunteer"} • submitted {dateText(selected.created_at)}</p>
              <div className="directorate-drawer__meta"><span>{selected.email || "Email not available"}</span><small>{selected.department_route ? `Routed to ${selected.department_route}` : "Department route not assigned"}</small></div>
            </div>
          </div>
          <button className="dashboard-icon-button" onClick={() => setSelected(null)} aria-label="Close applicant details"><X size={20} /></button>
        </div>
        <div className="directorate-drawer__tabs"><button className={drawerTab === "summary" ? "is-active" : ""} onClick={() => setDrawerTab("summary")}>Profile</button><button className={drawerTab === "documents" ? "is-active" : ""} onClick={() => setDrawerTab("documents")}>Documents <span>{selectedDocuments.length}</span></button><button className={drawerTab === "decision" ? "is-active" : ""} onClick={() => setDrawerTab("decision")}>Decision</button></div>
        <div className="directorate-drawer__scroll">
          {drawerTab === "summary" ? <><DetailGroup title="Professional credentials" fields={[["Specialty", selected.specialty], ["Sub-specialty", selected.sub_specialty], ["Experience", selected.years_experience ? `${selected.years_experience} years` : "—"], ["Registration", [selected.council_authority, selected.council_number].filter(Boolean).join(" • ")], ["Affiliation", selected.affiliation], ["Clinical scope", selected.clinical_scope]]} /><DetailGroup title="Identity & contact" fields={[["Date of birth", selected.dob], ["Gender", selected.gender], ["Nationality", selected.nationality], ["Passport", [selected.passport_country, selected.passport_number].filter(Boolean).join(" • ")], ["Phone", [selected.country_code, selected.mobile].filter(Boolean).join(" ")], ["Email", selected.email], ["Address", selected.address]]} /><DetailGroup title="Seva & visit preferences" fields={[["Preferred hospitals", selected.preferred_institutions || selected.institutions], ["Availability", [selected.preferred_from, selected.preferred_to].filter(Boolean).join(" → ")], ["Languages", selected.languages], ["Sai Centre", selected.sai_center_name || selected.sai_center_affiliated], ["Arrival", [selected.airport, selected.flight_number, selected.airline].filter(Boolean).join(" • ")], ["Darshan preference", selected.darshan]]} /><div className="directorate-review-next"><div><strong>Profile review complete?</strong><span>Continue to the supporting documents.</span></div><button type="button" className="dashboard-button dashboard-button--primary" onClick={() => goToDrawerTab("documents")}>Next: Documents <ChevronRight size={15} /></button></div></> : null}
          {drawerTab === "documents" ? <><div className="directorate-document-section"><div className="directorate-document-heading"><div><span className="dashboard-panel__eyebrow">Credential evidence</span><h3>Supporting documents</h3><p>Open a file or start a review thread when clarification is required.</p></div><span>{selectedDocuments.length} file{selectedDocuments.length === 1 ? "" : "s"}</span></div>{selectedDocuments.length ? selectedDocuments.map((doc) => <div className="directorate-document-row" key={doc.id}><div className="directorate-document-row__name"><span><FileText size={15} /></span><div><strong>{doc.original_name}</strong><small>{doc.document_type?.replaceAll("_", " ")} • {doc.verification_status}</small></div></div><div className="directorate-document-actions"><button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => openDocument(doc)}>Open</button><button className="dashboard-button dashboard-button--info" disabled={reviewingDocumentId === doc.id} onClick={async () => { if (!note.trim()) { setError("Add a note before starting a document review thread."); setDrawerTab("decision"); return; } setReviewingDocumentId(doc.id); try { await apiCreateReview({ document_id: doc.id, doctor_user_id: selected.user_id, body: note.trim() }); setError(""); } catch (err) { setError(err.message || "Could not create the review thread."); } finally { setReviewingDocumentId(""); } }}>{reviewingDocumentId === doc.id ? "Starting…" : <><FileCheck2 size={14} /> Review</>}</button></div></div>) : <div className="directorate-empty-inner"><FileText size={21} /><strong>No supporting documents uploaded.</strong><span>The applicant has not provided additional evidence yet.</span></div>}</div><div className="directorate-review-next"><div><strong>Documents reviewed?</strong><span>Continue to the final Directorate decision.</span></div><button type="button" className="dashboard-button dashboard-button--primary" onClick={() => goToDrawerTab("decision")}>Next: Decision <ChevronRight size={15} /></button></div></> : null}
          {drawerTab === "decision" ? <div className="directorate-decision-workspace"><div className={`directorate-current-decision directorate-current-decision--${selected.status}`}><span className="directorate-current-decision__icon">{selected.status === "approved" ? <ShieldCheck size={18} /> : selected.status === "declined" ? <X size={18} /> : <Info size={18} />}</span><div><span className="dashboard-panel__eyebrow">Current outcome</span><strong>{selected.status === "pending" ? "Awaiting Directorate decision" : selected.status === "info_requested" ? "Information requested" : selected.status === "declined" ? "Application declined" : "Application approved"}</strong><p>{selected.director_note || selected.latest_review_note || "No decision note has been recorded."}</p></div></div><label className="directorate-form-field"><span>Receiving department</span><select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">Select department</option>{DEPARTMENTS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="directorate-form-field"><span>{selected.status === "declined" ? "Reason for decline" : selected.status === "info_requested" ? "Information required" : "Decision note"}</span><textarea rows={6} value={note} onChange={(e) => setNote(e.target.value)} placeholder={selected.status === "declined" ? "Write a clear, respectful reason that the doctor can act on." : selected.status === "info_requested" ? "Specify exactly which information or document is needed." : "Add decision context or handoff instructions."} /></label><div className="directorate-decision-actions"><button className="dashboard-button dashboard-button--success" disabled={actioning || !department || (selected.status === "approved" && department === selected.department_route)} onClick={() => performAction("approved")}><Check size={15} /> {selected.status === "approved" && department !== selected.department_route ? "Re-approve & route" : "Approve & route"}</button><button className="dashboard-button dashboard-button--info" disabled={actioning} onClick={() => performAction("info_requested")}><Info size={15} /> Request information</button><button className="dashboard-button dashboard-button--danger" disabled={actioning} onClick={() => performAction("declined")}><X size={15} /> Decline</button></div><div className="directorate-decision-helper"><ShieldCheck size={16} /><span>Any information request or decline is saved with the written reason and shown in the Doctor's application history.</span></div><div className="directorate-review-next directorate-review-next--finish"><div><strong>Decision complete?</strong><span>Review the outcome, then close the applicant workspace.</span></div><button type="button" className="dashboard-button dashboard-button--primary" onClick={() => setSelected(null)}>Finish review</button></div></div> : null}
        </div>
      </aside></div> : null}
    </RoleDashboardShell>
  );
}
