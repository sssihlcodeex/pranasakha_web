import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Stethoscope,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/RoleDashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { apiGetDoctorsForDepartment, apiGetRosterForDepartment, apiPublishRoster } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import "./hod.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const navItems = [
  { id: "overview", label: "Overview", href: "#overview" },
  { id: "specialists", label: "Specialist directory", href: "#specialists" },
  { id: "roster", label: "Duty roster", href: "#roster" },
];

export const Route = createFileRoute("/dashboard/hod")({
  head: () => ({ meta: [{ title: "HoD Dashboard — PRANASAKHA" }] }),
  component: HodDashboard,
});

function initials(name = "Doctor") { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "DR"; }
function csv(rows) { return [["Doctor", "Specialty", "Experience", "Availability", "Department"], ...rows.map((d) => [d.full_name, d.specialty, d.years_experience, `${d.preferred_from || ""} → ${d.preferred_to || ""}`, d.department_route])].map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n"); }
function downloadCsv(rows) { const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "pranasakha-hod-specialists.csv"; a.click(); URL.revokeObjectURL(url); }

function HodDashboard() {
  const user = getCurrentUser();
  const [specialists, setSpecialists] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selected, setSelected] = useState(null);
  const [publishDoctor, setPublishDoctor] = useState(null);
  const [query, setQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [day, setDay] = useState("Monday");
  const [slot, setSlot] = useState("");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (!user?.department) return;
    try {
      const [doctorRows, rosterRows] = await Promise.all([apiGetDoctorsForDepartment(user.department), apiGetRosterForDepartment(user.department)]);
      setSpecialists(doctorRows || []);
      setRoster(rosterRows || []);
      if (selected) setSelected((doctorRows || []).find((item) => item.id === selected.id) || null);
      if (publishDoctor) setPublishDoctor((doctorRows || []).find((item) => item.id === publishDoctor.id) || null);
    } catch (err) {
      setError(err.message || "Could not load the department workspace.");
    }
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [user?.department]);

  useEffect(() => {
    const syncTab = () => {
      if (window.location.hash !== "#specialists") setSelected(null);
    };
    syncTab();
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  const specialtyOptions = useMemo(() => [...new Set(specialists.map((d) => d.specialty).filter(Boolean))].sort(), [specialists]);
  const assignedDoctorIds = useMemo(() => new Set(roster.map((row) => row.user_id)), [roster]);
  const rosterRows = useMemo(() => roster.map((row) => ({ ...row, doctor_name: specialists.find((d) => d.user_id === row.user_id)?.full_name || "Doctor", specialty: specialists.find((d) => d.user_id === row.user_id)?.specialty || "" })), [roster, specialists]);
  const nextDuty = rosterRows[0];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return specialists.filter((doctor) => {
      const hay = [doctor.full_name, doctor.email, doctor.specialty, doctor.sub_specialty, doctor.clinical_scope, doctor.preferred_institutions].join(" ").toLowerCase();
      const hasDuty = assignedDoctorIds.has(doctor.user_id);
      const availability = doctor.preferred_from || doctor.preferred_to ? "set" : "open";
      return (!needle || hay.includes(needle))
        && (specialtyFilter === "all" || doctor.specialty === specialtyFilter)
        && (availabilityFilter === "all" || availability === availabilityFilter)
        && (assignmentFilter === "all" || (assignmentFilter === "assigned" ? hasDuty : !hasDuty));
    });
  }, [specialists, query, specialtyFilter, availabilityFilter, assignmentFilter, assignedDoctorIds]);

  const filteredRoster = useMemo(() => rosterRows.filter((row) => dayFilter === "all" || row.day === dayFilter), [rosterRows, dayFilter]);

  async function publishDuty() {
    if (!user?.id || !user.department || !publishDoctor || !slot.trim() || !location.trim()) {
      setError("Select an approved specialist and complete the time slot and location.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      await apiPublishRoster({ user_id: publishDoctor.user_id, department: user.department, day, slot, location, details, actor_user_id: user.id });
      setSlot("");
      setLocation("");
      setDetails("");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not publish the duty.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <RoleDashboardShell
      role="Head of Department"
      title={`${user?.department || "Department"} operations`}
      description="Manage Directorate-approved specialists, build the department duty plan, and publish assignments directly to doctors."
      user={user}
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search specialists, specialties or hospitals…"
      navItems={navItems}
    >
      {error ? <div className="dash-alert dash-alert--error"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div> : null}

      <section id="overview" className="dashboard-view hod-overview">
        <div className="hod-stat-grid"><StatCard icon={Users} label="Approved specialists" value={specialists.length} hint="Directorate handoff" tone="blue" /><StatCard icon={CalendarDays} label="Published duties" value={roster.length} hint="Visible to doctors" tone="green" /><StatCard icon={CheckCircle2} label="Coverage" value={specialists.length ? `${Math.round((assignedDoctorIds.size / specialists.length) * 100)}%` : "0%"} hint="Specialists with a duty" tone="orange" /><StatCard icon={Stethoscope} label="Department" value={user?.department || "—"} hint="Authorised HoD scope" tone="purple" /></div>
        <div className="hod-command-card"><div><span className="dashboard-panel__eyebrow">Department handoff</span><h2>Approved specialists are ready for scheduling</h2><p>Only doctors approved and routed to <strong>{user?.department || "your department"}</strong> appear in this workspace.</p></div><div className="hod-command-actions"><button className="dashboard-button dashboard-button--info" onClick={() => { window.location.hash = "specialists"; }}>Open directory <ChevronRight size={15} /></button><button className="dashboard-button dashboard-button--ghost" onClick={() => { window.location.hash = "roster"; }}>Plan duty <CalendarDays size={15} /></button></div></div>
        <div className="hod-overview-grid"><article className="dashboard-panel hod-next-duty"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Next operational item</span><h2>{nextDuty ? nextDuty.doctor_name : "No duty published"}</h2><p>{nextDuty ? `${nextDuty.day} • ${nextDuty.slot} • ${nextDuty.location}` : "Choose a specialist and publish the first assignment."}</p></div></div>{nextDuty ? <StatusBadge status="approved" /> : <UserCheck size={24} />}</article><article className="dashboard-panel hod-department-note"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Roster hygiene</span><h2>Use filters before publishing</h2><p>Check assignment coverage and availability before selecting a specialist. Every publish action is validated against approval and department routing.</p></div></div><div className="hod-hygiene-row"><span><CheckCircle2 size={15} /> Approved only</span><span><CheckCircle2 size={15} /> Department matched</span><span><CheckCircle2 size={15} /> Doctor notified</span></div></article></div>
      </section>

      <section id="specialists" className="dashboard-view dashboard-panel">
        <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Directorate handoff</span><h2>Specialist directory</h2><p>Filter the approved pool by specialty, availability and current duty assignment. Click a doctor to inspect their profile.</p></div><div className="dashboard-panel__actions"><button className="dashboard-button dashboard-button--ghost" onClick={() => downloadCsv(filtered)}><Download size={15} /> Export</button><button className="dashboard-button dashboard-button--ghost" onClick={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }}><RefreshCw size={15} /> {refreshing ? "Refreshing…" : "Refresh"}</button></div></div>
        <div className="hod-filter-shell">
          <div className="hod-filter-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search visible specialists…" /></div>
          <label className="hod-filter-select"><Filter size={14} /><select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}><option value="all">All specialties</option>{specialtyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="hod-filter-select"><SlidersHorizontal size={14} /><select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}><option value="all">All availability</option><option value="set">Availability set</option><option value="open">Availability not set</option></select></label>
          <label className="hod-filter-select"><CalendarDays size={14} /><select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}><option value="all">All assignments</option><option value="assigned">Has duty</option><option value="unassigned">No duty yet</option></select></label>
        </div>
        <div className="hod-results-meta"><span>{loading ? "Loading specialists…" : `${filtered.length} of ${specialists.length} specialists`}</span><span>All records are Directorate-approved</span></div>
        <div className="hod-specialist-table-wrap"><table className="hod-specialist-table"><thead><tr><th>Specialist</th><th>Specialty</th><th>Experience</th><th>Availability</th><th>Duty</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="hod-empty-row">Loading specialists…</td></tr> : filtered.length === 0 ? <tr><td colSpan="6" className="hod-empty-row"><UserCheck size={20} /><strong>No specialists match these filters</strong><span>Try a broader specialty, assignment or availability filter.</span></td></tr> : filtered.map((doctor) => { const assigned = assignedDoctorIds.has(doctor.user_id); return <tr key={doctor.id} className={selected?.id === doctor.id ? "is-selected" : ""} onClick={() => setSelected(doctor)}><td><div className="hod-doctor-cell"><span className="hod-avatar">{initials(doctor.full_name)}</span><div><strong>{doctor.full_name || doctor.email}</strong><small>{doctor.email}</small></div></div></td><td><strong>{doctor.specialty || "Not specified"}</strong><small>{doctor.sub_specialty || "Specialist"}</small></td><td>{doctor.years_experience ? `${doctor.years_experience} yrs` : "—"}</td><td>{[doctor.preferred_from, doctor.preferred_to].filter(Boolean).join(" → ") || "Flexible"}</td><td><span className={`hod-duty-chip ${assigned ? "is-assigned" : "is-open"}`}>{assigned ? "Assigned" : "Open"}</span></td><td><ChevronRight size={17} /></td></tr>; })}</tbody></table></div>
      </section>

      <section id="roster" className="dashboard-view">
        <div className="hod-roster-layout">
          <article className="dashboard-panel hod-publish-card"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Duty planning</span><h2>Publish a duty</h2><p>The selected doctor must already be approved and routed to your department.</p></div></div><div className="hod-publish-form"><label>Approved specialist<select value={publishDoctor?.user_id || ""} onChange={(e) => { setPublishDoctor(specialists.find((item) => item.user_id === e.target.value) || null); setSelected(null); }}><option value="">Select specialist</option>{specialists.map((doctor) => <option key={doctor.user_id} value={doctor.user_id}>{doctor.full_name || doctor.email} — {doctor.specialty}</option>)}</select></label><label>Day<select value={day} onChange={(e) => setDay(e.target.value)}>{DAYS.map((item) => <option key={item}>{item}</option>)}</select></label><label>Time slot<input value={slot} onChange={(e) => setSlot(e.target.value)} placeholder="09:00 AM – 01:00 PM" /></label><label>Location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="OPD • Room 204" /></label><label className="hod-publish-wide">Duty notes<textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Unit, reporting time or special instructions…" /></label></div><div className="hod-publish-footer"><div className="hod-selection-summary"><span>Selected specialist</span><strong>{publishDoctor?.full_name || "Choose a specialist"}</strong><small>{publishDoctor ? `${publishDoctor.specialty || "Healthcare"}${publishDoctor.sub_specialty ? ` • ${publishDoctor.sub_specialty}` : ""}` : "The publish action becomes available after selection."}</small></div><button className="dashboard-button dashboard-button--success" disabled={publishing || !publishDoctor} onClick={publishDuty}>{publishing ? "Publishing…" : "Publish duty"} <ChevronRight size={15} /></button></div></article>
          <article className="dashboard-panel hod-publish-help"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Publishing check</span><h2>Before you publish</h2></div></div><div className="hod-check-list"><span><CheckCircle2 size={16} /> Doctor is Directorate-approved</span><span><CheckCircle2 size={16} /> Department matches {user?.department || "your scope"}</span><span><CheckCircle2 size={16} /> Doctor receives a notification</span><span><CheckCircle2 size={16} /> Duty appears on the Doctor dashboard</span></div></article>
        </div>
        <article className="dashboard-panel hod-live-roster"><div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Live schedule</span><h2>Department roster</h2><p>Use the day filter to review the current published plan.</p></div><label className="hod-roster-filter"><CalendarDays size={14} /><select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}><option value="all">All days</option>{DAYS.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="hod-roster-table-wrap"><table className="hod-roster-table"><thead><tr><th>Doctor</th><th>Day</th><th>Time</th><th>Location</th><th>Notes</th></tr></thead><tbody>{filteredRoster.length === 0 ? <tr><td colSpan="5" className="hod-empty-row">No duties match this day filter.</td></tr> : filteredRoster.map((row) => <tr key={row.id}><td><div className="hod-doctor-cell"><span className="hod-avatar">{initials(row.doctor_name)}</span><div><strong>{row.doctor_name}</strong><small>{row.specialty}</small></div></div></td><td><strong>{row.day}</strong></td><td>{row.slot}</td><td>{row.location}</td><td>{row.details || "—"}</td></tr>)}</tbody></table></div></article>
      </section>

      {selected ? <div className="hod-drawer-backdrop" onClick={() => setSelected(null)}><aside className="hod-drawer" onClick={(e) => e.stopPropagation()}><div className="hod-drawer__header"><div><span className="dashboard-panel__eyebrow">Approved specialist</span><h2>{selected.full_name || "Doctor"}</h2><p>{selected.specialty || "Healthcare volunteer"} • {selected.email}</p></div><button className="dashboard-icon-button" onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button></div><div className="hod-drawer__profile"><span className="hod-avatar hod-avatar--large">{initials(selected.full_name)}</span><div><strong>{selected.full_name || "Doctor"}</strong><span>{selected.email}</span><small>{selected.department_route || user?.department}</small></div><StatusBadge status="approved" /></div><div className="hod-drawer__body"><div className="hod-detail-grid">{[["Specialty", selected.specialty], ["Sub-specialty", selected.sub_specialty], ["Experience", selected.years_experience ? `${selected.years_experience} years` : "—"], ["Clinical scope", selected.clinical_scope], ["Preferred hospitals", selected.preferred_institutions || selected.institutions], ["Languages", selected.languages], ["Availability", [selected.preferred_from, selected.preferred_to].filter(Boolean).join(" → ") || "Flexible"], ["Contact", [selected.country_code, selected.mobile].filter(Boolean).join(" ") || selected.email]].map(([label,value]) => <div className="hod-detail-item" key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</div><div className="hod-drawer-action"><CalendarDays size={17} /><div><strong>{assignedDoctorIds.has(selected.user_id) ? "Duty already published" : "Ready for duty assignment"}</strong><p>{assignedDoctorIds.has(selected.user_id) ? "This specialist already has a live assignment in the department roster." : "Use the Duty roster tab to publish a shift for this approved specialist."}</p></div></div></div><div className="hod-drawer__footer"><button className="dashboard-button dashboard-button--info" onClick={() => { window.location.hash = "roster"; }}>Open duty planner <ChevronRight size={15} /></button></div></aside></div> : null}
    </RoleDashboardShell>
  );
}
