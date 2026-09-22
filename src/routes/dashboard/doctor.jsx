import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Hotel,
  LockKeyhole,
  MapPin,
  Pencil,
  Plane,
  Save,
  ShieldCheck,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { RoleDashboardShell } from "@/components/dashboard/RoleDashboardShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { TextField, TextAreaField, SelectField, ChipMultiSelect } from "@/components/signup/fields";
import {
  CATEGORY_CLINICAL_SCOPE,
  COUNTRY_CODES,
  GENDERS,
  INSTITUTIONS, INSTITUTION_ADDRESSES,
  LANGUAGES,
  NATIONALITIES,
  CATEGORY_SPECIALTIES,
  DARSHAN_OPTIONS,
  CATEGORY_LABEL,
} from "@/components/signup/types";
import {
  apiGetMyDoctorApp,
  apiGetMyRoster,
  apiGetMyAccommodation,
  apiRequestAccommodation,
  apiGetMyDarshanRequests,
  apiRequestDarshanPass,
  apiUpdateDoctorProfile,
  apiGetDoctorDocuments,
  apiUploadDocument,
  apiGetDoctorReviewHistory,
  apiFileUrl,
  apiUploadProfilePhoto,
  apiGetMyPass,
  apiGetScans,
  API_BASE,
} from "@/lib/api";
import "./doctor.css";

const navItems = [
  { id: "overview", label: "Overview", href: "#overview" },
  { id: "application-status", label: "Application status", href: "#application-status" },
  { id: "roster-schedule", label: "Roster & schedule", href: "#roster-schedule" },
  { id: "visit-essentials", label: "Visit essentials", href: "#visit-essentials" },
  { id: "medical-pass", label: "Digital medical pass", href: "#medical-pass" },
  { id: "profile-documents", label: "Profile & documents", href: "#profile-documents" },
];

export const Route = createFileRoute("/dashboard/doctor")({
  head: () => ({ meta: [{ title: "Healthcare Volunteer Dashboard — PRANASAKHA" }] }),
  component: DoctorDashboard,
});

const STATUS = {
  pending: {
    title: "Application under review",
    body: "Your registration has been received. The Directorate is reviewing your professional profile and credentials.",
    tone: "pending",
  },
  info_requested: {
    title: "Action required from you",
    body: "The Directorate needs additional information before a final decision can be made.",
    tone: "info",
  },
  approved: {
    title: "Application approved",
    body: "Your application is approved and routed to your receiving department. Connected Seva services are now being activated.",
    tone: "approved",
  },
  declined: {
    title: "Application not approved",
    body: "The Directorate has declined this application. Read the decision reason below for the next step.",
    tone: "declined",
  },
};

function list(value) {
  return Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name = "Doctor") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "DR";
}

function resolveProfileImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("/api/profile-media/")) {
    const path = raw.slice(raw.indexOf("/api/profile-media/"));
    try {
      const apiOrigin = new URL(API_BASE, typeof window !== "undefined" ? window.location.origin : "http://localhost").origin;
      return `${apiOrigin}${path}`;
    } catch {
      return raw;
    }
  }
  return raw;
}

function mapDoctorToEdit(doctor) {
  return {
    ...doctor,
    fullName: doctor?.full_name || "",
    countryCode: doctor?.country_code || "+91",
    passportNumber: doctor?.passport_number || "",
    passportCountry: doctor?.passport_country || "",
    passportExpiry: doctor?.passport_expiry || "",
    hasNmc: doctor?.has_nmc || "",
    councilNumber: doctor?.council_number || "",
    councilAuthority: doctor?.council_authority || "",
    subSpecialty: doctor?.sub_specialty || "",
    yearsExperience: doctor?.years_experience || "",
    specialty: doctor?.specialty || "",
    affiliation: doctor?.affiliation || "",
    languages: list(doctor?.languages),
    institutions: list(doctor?.institutions || doctor?.preferred_institutions),
    clinicalScope: list(doctor?.clinical_scope),
    preferredFrom: doctor?.preferred_from || "",
    preferredTo: doctor?.preferred_to || "",
    saiCenterAffiliated: doctor?.sai_center_affiliated || "",
    saiCenterName: doctor?.sai_center_name || "",
    dietary: doctor?.dietary || "",
    accessibility: doctor?.accessibility || "",
    airport: doctor?.airport || "",
    flightNumber: doctor?.flight_number || "",
    airline: doctor?.airline || "",
    darshan: doctor?.darshan || "None",
  };
}

function Editor({ form, setForm, onSave, saving, onCancel, onPhotoUpload, photoBusy, categoryLabel }) {
  const [step, setStep] = useState(0);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const steps = [
    ["Identity & contact", "identity"],
    ["Professional credentials", "credentials"],
    ["Seva preferences", "service"],
    ["Visit & logistics", "visit"],
  ];

  return (
    <div className="doctor-editor">
      <div className="doctor-editor__header">
        <div>
          <span className="dashboard-panel__eyebrow">Profile editor</span>
          <h3>Update your registration</h3>
          <p>These sections mirror the information collected during signup. Keep the details current so the Directorate and HoD always work from the latest profile.</p>
        </div>
        <button type="button" className="dashboard-icon-button" onClick={onCancel} aria-label="Close editor"><X size={19} /></button>
      </div>

      <div className="doctor-editor__layout">
        <div className="doctor-editor__stepper">
          {steps.map(([label], index) => (
            <button key={label} type="button" className={step === index ? "is-active" : ""} onClick={() => setStep(index)}>
              <span>{index < step ? <Check size={13} strokeWidth={2.6} /> : index + 1}</span>
              <div><strong>{label}</strong><small>{index === 0 ? "Personal details" : index === 1 ? "Credentials & experience" : index === 2 ? "Service preferences" : "Travel & stay"}</small></div>
            </button>
          ))}
        </div>

        <div className="doctor-editor__content">
          {step === 0 ? (
            <div className="doctor-editor__grid">
              <div className="doctor-editor__wide rounded-3xl border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <label className="group relative grid h-20 w-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-4 border-background bg-primary-container text-xl font-extrabold text-primary shadow">
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPhotoUpload} disabled={photoBusy} />
                      {resolveProfileImage(form.profile_picture) ? <img src={resolveProfileImage(form.profile_picture)} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <span>{initials(form.fullName || categoryLabel || "Doctor")}</span>}
                    </label>
                    <div><span className="doctor-editor__label">Profile picture</span><strong className="block text-sm text-foreground">Upload a professional photo</strong><small className="block mt-1 text-xs text-muted-foreground">JPG, PNG or WEBP • maximum 5 MB</small></div>
                  </div>
                  <label className="dashboard-button dashboard-button--ghost cursor-pointer">
                    <Upload size={15} /> {photoBusy ? "Uploading…" : "Upload profile picture"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoUpload} disabled={photoBusy} hidden />
                  </label>
                </div>
              </div>
              <TextField label="Full legal name" value={form.fullName} onChange={(value) => set("fullName", value)} className="doctor-editor__wide" />
              <TextField label="Date of birth" type="date" value={form.dob || ""} onChange={(value) => set("dob", value)} />
              <SelectField label="Gender" options={GENDERS} value={form.gender || ""} onChange={(value) => set("gender", value)} />
              <SelectField label="Nationality" options={NATIONALITIES} value={form.nationality || ""} onChange={(value) => set("nationality", value)} />
              <TextField label="Email" value={form.email || ""} onChange={() => {}} />
              <TextField label="Country code" value={form.countryCode} onChange={(value) => set("countryCode", value)} />
              <TextField label="Mobile number" value={form.mobile || ""} onChange={(value) => set("mobile", value)} />
              <TextAreaField label="Home country address" rows={4} value={form.address || ""} onChange={(value) => set("address", value)} className="doctor-editor__wide" />
              <TextField label="Passport number" value={form.passportNumber} onChange={(value) => set("passportNumber", value)} />
              <SelectField label="Passport issuing country" options={NATIONALITIES} value={form.passportCountry} onChange={(value) => set("passportCountry", value)} />
              <TextField label="Passport expiry" type="date" value={form.passportExpiry} onChange={(value) => set("passportExpiry", value)} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="doctor-editor__grid">
              <SelectField label="Primary specialty / role" options={CATEGORY_SPECIALTIES[form.service_category || "doctors"] || CATEGORY_SPECIALTIES.doctors} value={form.specialty} onChange={(value) => set("specialty", value)} />
              <TextField label="Sub-specialty" value={form.subSpecialty} onChange={(value) => set("subSpecialty", value)} />
              <TextField label="Years of experience" type="number" value={form.yearsExperience} onChange={(value) => set("yearsExperience", value)} />
              <TextField label="Current hospital / affiliation" value={form.affiliation} onChange={(value) => set("affiliation", value)} />
              <SelectField label="State (Medical Council) registration? (Optional)" options={["yes", "no"]} value={form.hasNmc} onChange={(value) => set("hasNmc", value)} />
              <TextField label="State (Medical Council) registration number (Optional)" value={form.councilNumber} onChange={(value) => set("councilNumber", value)} />
              <TextField label="Issuing authority (Optional)" value={form.councilAuthority} onChange={(value) => set("councilAuthority", value)} />
              <div className="doctor-editor__wide"><ChipMultiSelect label="Languages spoken" options={LANGUAGES} selected={list(form.languages)} onToggle={(value) => set("languages", list(form.languages).includes(value) ? list(form.languages).filter((item) => item !== value) : [...list(form.languages), value])} /></div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="doctor-editor__grid">
              <div className="doctor-editor__wide"><ChipMultiSelect label="Clinical scope" options={CATEGORY_CLINICAL_SCOPE[form.service_category || "doctors"] || CATEGORY_CLINICAL_SCOPE.doctors} selected={list(form.clinicalScope)} onToggle={(value) => set("clinicalScope", list(form.clinicalScope).includes(value) ? list(form.clinicalScope).filter((item) => item !== value) : [...list(form.clinicalScope), value])} /></div>
              <div className="doctor-editor__wide">
                <span className="doctor-editor__label">Preferred hospitals</span>
                <div className="doctor-editor__chips">
                  {INSTITUTIONS.map((institution) => {
                    const active = list(form.institutions).includes(institution);
                    return <button key={institution} type="button" className={active ? "is-active" : ""} onClick={() => set("institutions", active ? list(form.institutions).filter((item) => item !== institution) : [...list(form.institutions), institution])}>{active ? <Check size={13} /> : null}{institution}</button>;
                  })}
                </div>
                <div className="mt-3 grid gap-2">
                  {INSTITUTIONS.map((institution) => (
                    <div key={`${institution}-address`} className="rounded-xl border border-border/70 bg-background px-3 py-2">
                      <span className="block text-xs font-bold text-foreground">{institution}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{INSTITUTION_ADDRESSES[institution]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <TextField label="Preferred Seva — from" type="date" value={form.preferredFrom} onChange={(value) => set("preferredFrom", value)} />
              <TextField label="Preferred Seva — to" type="date" value={form.preferredTo} onChange={(value) => set("preferredTo", value)} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="doctor-editor__grid">
              <SelectField label="Arrival airport" options={["BLR"]} value={form.airport} onChange={(value) => set("airport", value)} />
              <TextField label="Flight number (Optional)" value={form.flightNumber} onChange={(value) => set("flightNumber", value)} />
              <TextField label="Airline" value={form.airline} onChange={(value) => set("airline", value)} />
              <SelectField label="Darshan preference" options={DARSHAN_OPTIONS} value={form.darshan} onChange={(value) => set("darshan", value)} />
              <TextAreaField label="Dietary requirements" rows={3} value={form.dietary} onChange={(value) => set("dietary", value)} />
              <TextAreaField label="Accessibility / mobility needs" rows={3} value={form.accessibility} onChange={(value) => set("accessibility", value)} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="doctor-editor__footer">
        <button type="button" className="dashboard-button dashboard-button--ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Previous</button>
        <div>
          {step < steps.length - 1 ? <button type="button" className="dashboard-button dashboard-button--info" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Next step <ArrowRight size={15} /></button> : <button type="button" className="dashboard-button dashboard-button--success" onClick={onSave} disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save profile"}</button>}
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AccessCard({ icon: Icon, eyebrow, title, body, locked, status, action, onAction }) {
  return (
    <article className={`doctor-access-card ${locked ? "is-locked" : ""}`}>
      <div className="doctor-access-card__top">
        <span className="doctor-access-card__icon"><Icon size={19} /></span>
        {locked ? <span className="doctor-access-card__lock"><LockKeyhole size={13} /> Locked</span> : <StatusBadge status={status || "pending"} />}
      </div>
      <span className="dashboard-panel__eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onAction} disabled={locked}>{action} <ChevronRight size={15} /></button> : null}
    </article>
  );
}

function DoctorDashboard() {
  const router = useRouter();
  const readActiveSection = () => {
    if (typeof window === "undefined") return "overview";
    const target = window.location.hash.replace(/^#/, "");
    return navItems.some((item) => item.id === target) ? target : "overview";
  };
  const [activeSection, setActiveSection] = useState(readActiveSection);
  const [user, setUser] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [roster, setRoster] = useState([]);
  const [accommodation, setAccommodation] = useState(null);
  const [darshanRequests, setDarshanRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [requestingRoom, setRequestingRoom] = useState(false);
  const [requestingDarshan, setRequestingDarshan] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [pass, setPass] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  async function loadAll(userId) {
    const [doctorData, rosterData, accommodationData, darshanData, documentData, historyData, passData, scansData] = await Promise.all([
      apiGetMyDoctorApp(userId),
      apiGetMyRoster(userId),
      apiGetMyAccommodation(userId),
      apiGetMyDarshanRequests(userId),
      apiGetDoctorDocuments(userId),
      apiGetDoctorReviewHistory(userId),
      apiGetMyPass().catch(() => null),
      apiGetScans(userId).catch(() => []),
    ]);
    const mergedDoctor = { ...(doctorData || {}), profile_picture: doctorData?.profile_picture || user?.profile_picture || "" };
    setDoctor(mergedDoctor);
    setRoster(rosterData || []);
    setAccommodation(accommodationData || null);
    setDarshanRequests(darshanData || []);
    setDocuments(documentData || []);
    setReviewHistory(historyData || []);
    setPass(passData || null);
    setScanHistory(scansData || []);
    setForm(mapDoctorToEdit(mergedDoctor));
  }

  useLayoutEffect(() => {
    const syncActiveSection = () => setActiveSection(readActiveSection());
    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);
    return () => window.removeEventListener("hashchange", syncActiveSection);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("pranasakha_user");
    if (!raw) {
      router.navigate({ to: "/signin" });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setUser(parsed);
      loadAll(parsed.id).catch((err) => setError(err.message || "Could not load your dashboard.")).finally(() => setLoading(false));
    } catch {
      router.navigate({ to: "/signin" });
    }
  }, [router]);

  const isApproved = doctor?.status === "approved";
  const currentStatus = STATUS[doctor?.status] || STATUS.pending;
  const categoryLabel = CATEGORY_LABEL[doctor?.service_category || "doctors"] || "Doctor";
  const displayName = doctor?.full_name || user?.full_name || categoryLabel;
  const latestReview = reviewHistory[0];
  const latestDarshan = darshanRequests[0];
  const latestRoster = roster.slice(0, 3);

  const profileCompletion = useMemo(() => {
    const checks = [doctor?.full_name, doctor?.specialty, doctor?.years_experience, doctor?.affiliation, doctor?.preferred_from, doctor?.preferred_to, doctor?.clinical_scope];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [doctor]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiUpdateDoctorProfile(user.id, {
        ...form,
        full_name: form.fullName,
        country_code: form.countryCode,
        preferred_institutions: list(form.institutions),
        institutions: list(form.institutions),
        clinical_scope: list(form.clinicalScope),
        languages: list(form.languages),
        years_experience: form.yearsExperience,
        council_number: form.councilNumber,
        council_authority: form.councilAuthority,
        sub_specialty: form.subSpecialty,
        preferred_from: form.preferredFrom,
        preferred_to: form.preferredTo,
        sai_center_affiliated: form.saiCenterAffiliated,
        sai_center_name: form.saiCenterName,
        flight_number: form.flightNumber,
      });
      setDoctor(updated);
      setForm(mapDoctorToEdit(updated));
      setUser((current) => {
        const next = { ...(current || {}), ...(updated || {}) };
        try { localStorage.setItem("pranasakha_user", JSON.stringify(next)); } catch {}
        window.dispatchEvent(new Event("pranasakha-auth-changed"));
        return next;
      });
      setEditing(false);
    } catch (err) {
      setError(err.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function requestAccommodation() {
    setRequestingRoom(true);
    setError("");
    try {
      await apiRequestAccommodation({ user_id: user.id, preferred_block: "", check_in: doctor?.preferred_from || "", check_out: doctor?.preferred_to || "" });
      await loadAll(user.id);
    } catch (err) {
      setError(err.message || "Could not request accommodation.");
    } finally {
      setRequestingRoom(false);
    }
  }

  async function requestDarshan() {
    setRequestingDarshan(true);
    setError("");
    try {
      await apiRequestDarshanPass({ user_id: user.id, purpose: doctor?.darshan || "Seva visit" });
      await loadAll(user.id);
    } catch (err) {
      setError(err.message || "Could not request Darshan access.");
    } finally {
      setRequestingDarshan(false);
    }
  }

  async function uploadProfilePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setUploadingProfilePhoto(true);
    setError("");
    try {
      const result = await apiUploadProfilePhoto(file);
      const nextUser = { ...(user || {}), ...(result.user || {}), profile_picture: result.profile_picture || result.user?.profile_picture || "" };
      setUser(nextUser);
      localStorage.setItem("pranasakha_user", JSON.stringify(nextUser));
      setForm((current) => ({ ...current, profile_picture: nextUser.profile_picture || "" }));
      await loadAll(nextUser.id);
    } catch (err) {
      setError(err.message || "Could not update your profile picture.");
    } finally {
      setUploadingProfilePhoto(false);
      event.target.value = "";
    }
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingDocument(true);
    setError("");
    try {
      await apiUploadDocument(file, { userId: user.id, documentType: "supporting_document" });
      await loadAll(user.id);
    } catch (err) {
      setError(err.message || "Could not upload the document.");
    } finally {
      setUploadingDocument(false);
      event.target.value = "";
    }
  }

  return (
    <RoleDashboardShell
      role={`${categoryLabel} / Healthcare Volunteer`}
      title="My Seva workspace"
      description="Keep your application, Directorate communication, professional profile and approved Seva arrangements in one secure workspace."
      user={user}
      searchPlaceholder="Search your profile, roster or application…"
      navItems={navItems}
    >
      {error ? <div className="dash-alert dash-alert--error"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div> : null}

      {loading ? (
        <section className="doctor-loading dashboard-panel"><div className="doctor-loading__spinner" /><strong>Preparing your Seva workspace…</strong><span>Loading application, profile and connected services.</span></section>
      ) : (
        <>
          <section id="overview" style={{ display: activeSection === "overview" ? undefined : "none" }} className="dashboard-view doctor-overview">
            <div className={`doctor-status-hero doctor-status-hero--${currentStatus.tone}`}>
              <div className="doctor-status-hero__main">
                <div>
                  <div className="doctor-status-hero__status-line">
                    <span className="dashboard-panel__eyebrow">Application status</span>
                    <span className="doctor-status-hero__icon"><StatusBadge status={doctor?.status || "pending"} /></span>
                  </div>
                  <h2>{currentStatus.title}</h2>
                  <p>{currentStatus.body}</p>
                  {doctor?.department_route ? <div className="doctor-status-hero__route"><Stethoscope size={14} /> Receiving department <strong>{doctor.department_route}</strong></div> : null}
                </div>
              </div>
              <div className="doctor-status-hero__action">
                <span>Profile completion</span>
                <strong>{profileCompletion}%</strong>
                <div className="doctor-progress"><span style={{ width: `${profileCompletion}%` }} /></div>
                <button className="dashboard-button dashboard-button--ghost" onClick={() => { window.location.hash = "profile-documents"; setEditing(true); }}><Pencil size={15} /> Edit profile</button>
              </div>
            </div>

            {doctor?.status === "info_requested" || doctor?.status === "declined" ? (
              <div className={`doctor-decision-card ${doctor.status === "declined" ? "is-danger" : "is-warning"}`}>
                <span className="doctor-decision-card__icon"><FileCheck2 size={18} /></span>
                <div>
                  <span className="dashboard-panel__eyebrow">Directorate message</span>
                  <h3>{doctor.status === "info_requested" ? "Information requested" : "Decision reason"}</h3>
                  <p>{doctor.director_note || latestReview?.note || "No written reason has been recorded yet."}</p>
                  <small>{latestReview?.actor_name ? `Reviewed by ${latestReview.actor_name} • ` : ""}{dateText(latestReview?.created_at || doctor.reviewed_at)}</small>
                </div>
                {doctor.status === "info_requested" ? <button className="dashboard-button dashboard-button--info" onClick={() => { window.location.hash = "profile-documents"; setEditing(true); }}>Update profile <ArrowRight size={15} /></button> : null}
              </div>
            ) : null}

            <div className="doctor-overview-grid">
              <article className="dashboard-panel doctor-profile-card">
                <div className="doctor-profile-card__head">
                  <div className="doctor-avatar">{resolveProfileImage(doctor?.profile_picture || user?.profile_picture) ? <img src={resolveProfileImage(doctor?.profile_picture || user?.profile_picture)} alt="Profile" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" /> : initials(displayName)}</div>
                  <div><span className="dashboard-panel__eyebrow">{categoryLabel} profile</span><h3>{displayName}</h3><p>{doctor?.specialty || `${categoryLabel} volunteer`}{doctor?.sub_specialty ? ` • ${doctor.sub_specialty}` : ""}</p></div>
                  <StatusBadge status={doctor?.status || "pending"} />
                </div>
                <div className="doctor-profile-card__grid">
                  <div><span>Email</span><strong>{user?.email || "—"}</strong></div>
                  <div><span>Experience</span><strong>{doctor?.years_experience ? `${doctor.years_experience} years` : "—"}</strong></div>
                  <div><span>Availability</span><strong>{[doctor?.preferred_from, doctor?.preferred_to].filter(Boolean).join(" → ") || "Not set"}</strong></div>
                  <div><span>Preferred hospitals</span><strong>{doctor?.preferred_institutions || doctor?.institutions || "Not set"}</strong></div>
                </div>
                <button className="dashboard-button dashboard-button--ghost" onClick={() => { window.location.hash = "profile-documents"; }}>Open profile <ChevronRight size={15} /></button>
              </article>

              <article className="dashboard-panel doctor-next-card">
                <div className="doctor-next-card__top"><span className="dashboard-panel__eyebrow">Next in your workflow</span><ShieldCheck size={19} /></div>
                <h3>{isApproved ? "Prepare for your Seva assignment" : doctor?.status === "info_requested" ? "Complete the requested information" : "Wait for Directorate review"}</h3>
                <p>{isApproved ? "Your HoD can now assign duty, and approved visit services can be requested from this workspace." : doctor?.status === "info_requested" ? "Read the Directorate message, update your profile or documents, and keep your application ready for re-review." : "You can still edit your registration while the application is under review."}</p>
                <button className="dashboard-button dashboard-button--info" onClick={() => { window.location.hash = isApproved ? "visit-essentials" : doctor?.status === "info_requested" ? "profile-documents" : "application-status"; }}>{isApproved ? "View visit access" : doctor?.status === "info_requested" ? "Review required action" : "View application"} <ArrowRight size={15} /></button>
              </article>
            </div>

            <div className="doctor-access-strip">
              <AccessCard icon={Hotel} eyebrow="Ashram stay" title="Accommodation" body={isApproved ? "Request and track your Seva accommodation." : "Accommodation becomes available after Directorate approval."} locked={!isApproved} status={accommodation?.status === "confirmed" ? "confirmed" : "pending"} action={accommodation ? "View request" : "Request stay"} onAction={() => { window.location.hash = "visit-essentials"; }} />
              <AccessCard icon={Plane} eyebrow="Mandir access" title="Darshan" body={isApproved ? "Submit and track your approved visit access request." : "Mandir access is unavailable until your application is approved."} locked={!isApproved} status={latestDarshan?.status || "pending"} action={latestDarshan ? "View request" : "Request access"} onAction={() => { window.location.hash = "visit-essentials"; }} />
              <AccessCard icon={ShieldCheck} eyebrow="Identity" title="Digital medical pass" body={isApproved ? "Your approved Seva identity is eligible for connected workflows." : "The pass remains inactive until approval."} locked={!isApproved} status={isApproved ? "approved" : "pending"} action="View pass" onAction={() => { window.location.hash = "medical-pass"; }} />
              <AccessCard icon={CalendarDays} eyebrow="Department" title="Duty roster" body={isApproved ? "Your HoD's published duties appear here." : "Roster access opens once a Directorate-approved handoff is complete."} locked={!isApproved} status={isApproved ? "approved" : "pending"} action="View roster" onAction={() => { window.location.hash = "roster-schedule"; }} />
            </div>
          </section>

          <section id="application-status" style={{ display: activeSection === "application-status" ? undefined : "none" }} className="dashboard-view doctor-two-column">
            <div className="dashboard-panel">
              <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Application lifecycle</span><h2>Where your application stands</h2><p>Every Directorate decision is reflected here. Reasons for information requests and declines are visible to you.</p></div></div>
              <div className="doctor-timeline">
                {[{ title: "Application submitted", body: "Your registration was received by PRANASAKHA.", done: true, date: doctor?.created_at }, { title: "Directorate review", body: doctor?.status === "pending" ? "Waiting for Directorate review." : "Directorate has reviewed your application.", done: doctor?.status !== "pending", date: doctor?.reviewed_at }, { title: doctor?.status === "info_requested" ? "Information requested" : doctor?.status === "declined" ? "Application declined" : doctor?.status === "approved" ? "Application approved" : "Decision", body: doctor?.director_note || latestReview?.note || (doctor?.status === "pending" ? "No decision yet." : "No note recorded."), done: doctor?.status !== "pending", date: doctor?.reviewed_at, decision: doctor?.status }, { title: "HoD handoff", body: isApproved ? `Routed to ${doctor.department_route || "your department"}.` : "This step activates after approval.", done: isApproved, date: isApproved ? doctor?.reviewed_at : null }].map((item, index) => {
                  const marker = item.decision === "declined" ? <X size={14} strokeWidth={2.8} aria-hidden="true" /> : item.decision === "info_requested" ? <AlertCircle size={14} strokeWidth={2.8} aria-hidden="true" /> : item.done ? <Check size={13} strokeWidth={2.8} aria-hidden="true" /> : index + 1;
                  const tone = item.decision === "declined" ? "is-declined" : item.decision === "info_requested" ? "is-info-requested" : "";
                  return <div className={`doctor-timeline__item ${item.done ? "is-done" : ""} ${tone}`} key={`${item.title}-${index}`}><span className="doctor-timeline__marker">{marker}</span><div><div className="doctor-timeline__title"><strong>{item.title}</strong><small>{dateText(item.date)}</small></div><p>{item.body}</p></div></div>;
                })}
              </div>
            </div>
            <div className="dashboard-panel doctor-history-panel">
              <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Communication</span><h2>Decision history</h2><p>Written Directorate messages stay attached to your application.</p></div></div>
              <div className="doctor-history-list">{reviewHistory.length ? reviewHistory.map((item) => <article className="doctor-history-item" key={item.id}><span className={`doctor-history-item__icon doctor-history-item__icon--${item.action}`}><FileCheck2 size={15} /></span><div><div className="doctor-history-item__title"><strong>{item.action === "info_requested" ? "Information requested" : item.action === "approved" ? "Application approved" : item.action === "declined" ? "Application declined" : "Application updated"}</strong><small>{dateText(item.created_at)}</small></div><p>{item.note || "No additional message was recorded."}</p>{item.actor_name ? <span>By {item.actor_name}</span> : null}</div></article>) : <div className="doctor-empty"><FileCheck2 size={20} /><strong>No review messages yet</strong><span>Any Directorate decision or information request will appear here.</span></div>}</div>
            </div>
          </section>

          <section id="roster-schedule" style={{ display: activeSection === "roster-schedule" ? undefined : "none" }} className="dashboard-view dashboard-panel">
            <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Department handoff</span><h2>Your Seva roster</h2><p>Published by your department HoD after Directorate approval.</p></div><span className="doctor-count-pill">{roster.length} {roster.length === 1 ? "shift" : "shifts"}</span></div>
            {!isApproved ? <div className="doctor-locked-section"><LockKeyhole size={22} /><div><strong>Roster will activate after approval</strong><p>Your department receives your profile only after the Directorate approves and routes your application.</p></div></div> : latestRoster.length ? <div className="doctor-roster-list">{latestRoster.map((item) => <article className="doctor-roster-row" key={item.id}><div className="doctor-roster-date"><CalendarDays size={17} /><strong>{item.day}</strong></div><div className="doctor-roster-main"><strong>{item.slot}</strong><span><MapPin size={14} />{item.location}</span>{item.details ? <p>{item.details}</p> : null}</div><CheckCircle2 className="doctor-roster-ok" size={19} /></article>)}</div> : <div className="doctor-empty"><CalendarDays size={21} /><strong>No duties published yet</strong><span>Your HoD will publish assignments here once your Seva planning is complete.</span></div>}
          </section>

          <section id="visit-essentials" style={{ display: activeSection === "visit-essentials" ? undefined : "none" }} className="dashboard-view">
            <div className="doctor-section-intro"><div><span className="dashboard-panel__eyebrow">Visit access</span><h2>Stay, Mandir and travel essentials</h2><p>These services open only after the Directorate approves your application, so access is never granted prematurely.</p></div><span className={`doctor-access-summary ${isApproved ? "is-open" : "is-locked"}`}>{isApproved ? "Approved access" : "Locked until approval"}</span></div>
            <div className="doctor-essentials-grid">
              <article className={`dashboard-panel doctor-essentials-card ${!isApproved ? "is-locked" : ""}`}>
                <div className="doctor-essentials-card__head"><span className="doctor-essentials-card__icon"><Hotel size={19} /></span><StatusBadge status={accommodation?.status === "confirmed" ? "confirmed" : isApproved ? "pending" : "pending"} /></div>
                <span className="dashboard-panel__eyebrow">Accommodation</span><h3>Ashram stay</h3><p>{isApproved ? "Request accommodation for the dates in your approved Seva visit." : "Ashram stay requests are available only after Directorate approval."}</p>
                {accommodation ? <div className="doctor-service-state"><strong>{accommodation.status === "confirmed" ? `${accommodation.block || "Block"} • Room ${accommodation.room || "—"}` : "Request received"}</strong><span>{accommodation.status === "confirmed" ? "Confirmed by Accommodation Office" : "Awaiting confirmation"}</span></div> : <button className="dashboard-button dashboard-button--ghost" disabled={!isApproved || requestingRoom} onClick={requestAccommodation}>{requestingRoom ? "Submitting…" : "Request accommodation"} <ArrowRight size={15} /></button>}
              </article>

              <article className={`dashboard-panel doctor-essentials-card ${!isApproved ? "is-locked" : ""}`}>
                <div className="doctor-essentials-card__head"><span className="doctor-essentials-card__icon"><Plane size={19} /></span><StatusBadge status={latestDarshan?.status || (isApproved ? "pending" : "pending")} /></div>
                <span className="dashboard-panel__eyebrow">Mandir access</span><h3>Darshan request</h3><p>{isApproved ? "Submit and monitor the access request associated with your Seva visit." : "Mandir access remains unavailable while the application is not approved."}</p>
                {latestDarshan ? <div className="doctor-service-state"><strong>{latestDarshan.purpose || "Darshan request"}</strong><span>{latestDarshan.status === "issued" ? "Pass issued" : "Request under review"}</span></div> : <button className="dashboard-button dashboard-button--ghost" disabled={!isApproved || requestingDarshan} onClick={requestDarshan}>{requestingDarshan ? "Submitting…" : "Request Darshan access"} <ArrowRight size={15} /></button>}
              </article>

              <article className={`dashboard-panel doctor-essentials-card ${!isApproved ? "is-locked" : ""}`}>
                <div className="doctor-essentials-card__head"><span className="doctor-essentials-card__icon"><Plane size={19} /></span><span className={`doctor-mini-chip ${isApproved ? "is-ready" : "is-locked"}`}>{isApproved ? "Ready" : "Locked"}</span></div>
                <span className="dashboard-panel__eyebrow">Travel</span><h3>Arrival information</h3><p>{isApproved ? "Keep arrival airport and flight details available for the coordinating teams." : "Travel coordination is enabled only after your application is approved."}</p>
                <div className="doctor-service-state"><strong>{doctor?.airport || "Arrival airport not set"}</strong><span>{[doctor?.airline, doctor?.flight_number].filter(Boolean).join(" • ") || "No flight details added"}</span></div>
              </article>
            </div>
          </section>

          <section id="medical-pass" style={{ display: activeSection === "medical-pass" ? undefined : "none" }} className="dashboard-view doctor-pass-layout">
            <article className={`dashboard-panel doctor-pass-preview-card ${!isApproved ? "is-locked" : ""} ${pass?.status === "revoked" ? "is-revoked" : ""}`}>
              <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Lifetime Virtual ID</span><h2>{!isApproved ? "Pass activation pending" : pass?.status === "revoked" ? "Seva pass revoked" : pass?.status === "suspended" ? "Seva pass suspended" : "Active Seva pass"}</h2><p>{!isApproved ? "A lifetime QR pass is issued automatically after Directorate approval." : pass?.status === "revoked" ? "This QR has been permanently revoked and cannot be used for verification. A new pass must be reissued by an authorised administrator." : pass?.status === "suspended" ? "This QR is temporarily suspended and will not grant checkpoint access until restored by an authorised administrator." : "This QR contains only an opaque token. Checkpoints receive only the information their role permits."}</p></div><span className={`doctor-pass-state ${pass?.status || (!isApproved ? "pending" : "active")}`}><span className="doctor-pass-state__dot" />{(pass?.status || (!isApproved ? "pending" : "active")).toUpperCase()}</span></div>
              <div className="doctor-pass-card">
                <div className="doctor-pass-card__brand"><ShieldCheck size={20} /><span>PRANASAKHA • SECURE ID</span></div>
                {pass?.status === "revoked" ? <div className="doctor-pass-revoked"><div className="doctor-pass-revoked__icon"><X size={24} /></div><div><strong>QR pass revoked</strong><p>This pass is no longer valid. Keep it only as a record of the revoked identity token.</p></div></div> : <div className="doctor-pass-qr">{isApproved && pass?.qr_data_url ? <img src={pass.qr_data_url} alt="PRANASAKHA lifetime QR" /> : <div className="doctor-pass-qr__placeholder"><ShieldCheck size={34} /><span>{isApproved ? "Preparing your secure QR…" : "Available after approval"}</span></div>}</div>}
                <div className={`doctor-pass-code ${pass?.status === "revoked" ? "is-revoked" : ""}`}>{pass?.code || `PSK-${String(user?.id || "00000000").replaceAll("-", "").slice(0, 4).toUpperCase()}-${String(user?.id || "00000000").replaceAll("-", "").slice(4, 8).toUpperCase()}`}</div>
                <div className="doctor-pass-card__identity"><div className="doctor-avatar doctor-avatar--large">{resolveProfileImage(doctor?.profile_picture || user?.profile_picture) ? <img src={resolveProfileImage(doctor?.profile_picture || user?.profile_picture)} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials(displayName)}</div><div><strong>{displayName}</strong><span>{doctor?.specialty || `${categoryLabel} volunteer`}</span><small>{doctor?.institution || "Institution not set"}</small></div></div>
                <div className="doctor-pass-card__footer"><span>{categoryLabel}</span><span>{pass?.status === "active" ? "LIFETIME QR" : (pass?.status || "PENDING").toUpperCase()}</span></div>
              </div>
            </article>
            <article className="dashboard-panel doctor-pass-guidance"><span className="dashboard-panel__eyebrow">Checkpoint privacy</span><h3>{isApproved ? "One pass. Different permitted views." : "Protected until approval"}</h3><p>{isApproved ? "The same lifetime token resolves differently at Gate, Canteen, Mandir and Camp checkpoints. The server never exposes medical data to a checkpoint that does not need it." : "PRANASAKHA keeps the pass unavailable until the Directorate confirms your application."}</p><div className="doctor-pass-checks"><span><CheckCircle2 size={15} /> Gate — identity & visit status</span><span><CheckCircle2 size={15} /> Canteen — meal entitlement</span><span><CheckCircle2 size={15} /> Mandir — Darshan status</span><span><CheckCircle2 size={15} /> Camp — service participation</span></div><div className="doctor-pass-history"><span className="dashboard-panel__eyebrow">Recent scans</span>{scanHistory.length ? scanHistory.slice(0,5).map((scan)=><div key={scan.id}><strong>{scan.checkpoint_name || scan.checkpoint_type}</strong><span>{scan.result} • {dateText(scan.scanned_at)}</span></div>) : <p>No scan history yet.</p>}</div></article>
          </section>

          <section id="profile-documents" style={{ display: activeSection === "profile-documents" ? undefined : "none" }} className="dashboard-view dashboard-panel">
            <div className="dashboard-panel__header"><div><span className="dashboard-panel__eyebrow">Profile & documents</span><h2>{isApproved ? "Professional profile" : "Registration overview"}</h2><p>{isApproved ? "Approved professionals can view their full registration data. Before approval, sensitive identity and credential fields remain hidden in read-only mode." : "Your basic profile remains visible, while sensitive fields stay protected until approval. You can still edit the registration you submitted."}</p></div><button className="dashboard-button dashboard-button--ghost" onClick={() => setEditing((value) => !value)}>{editing ? <><X size={15} />Close editor</> : <><Pencil size={15} />Edit profile</>}</button></div>
            {!isApproved && !editing ? <div className="doctor-profile-protection"><LockKeyhole size={19} /><div><strong>Sensitive profile details are protected</strong><p>Passport information, registration details, address and other sensitive fields are intentionally hidden from the read-only dashboard until your application is approved.</p></div></div> : null}
            {!editing ? <div className="doctor-profile-details">{(isApproved ? [["Full name", displayName], ["Email", user?.email], ["Date of birth", doctor?.dob], ["Gender", doctor?.gender], ["Nationality", doctor?.nationality], ["Mobile", [doctor?.country_code, doctor?.mobile].filter(Boolean).join(" ")], ["Specialty", doctor?.specialty], ["Sub-specialty", doctor?.sub_specialty], ["Experience", doctor?.years_experience ? `${doctor.years_experience} years` : "—"], ["Registration", [doctor?.council_authority, doctor?.council_number].filter(Boolean).join(" • ")], ["Affiliation", doctor?.affiliation], ["Languages", doctor?.languages], ["Clinical scope", doctor?.clinical_scope], ["Preferred hospitals", doctor?.preferred_institutions || doctor?.institutions], ["Availability", [doctor?.preferred_from, doctor?.preferred_to].filter(Boolean).join(" → ")], ["Address", doctor?.address]] : [["Full name", displayName], ["Email", user?.email], ["Specialty", doctor?.specialty], ["Experience", doctor?.years_experience ? `${doctor.years_experience} years` : "—"], ["Preferred hospitals", doctor?.preferred_institutions || doctor?.institutions], ["Clinical scope", doctor?.clinical_scope], ["Preferred Seva period", [doctor?.preferred_from, doctor?.preferred_to].filter(Boolean).join(" → ") || "—"]]).map(([label, value]) => <div className="doctor-detail-cell" key={label}><span>{label}</span><strong>{value || "—"}</strong></div>)}</div> : <Editor categoryLabel={categoryLabel} form={form} setForm={setForm} onSave={saveProfile} saving={saving} onPhotoUpload={uploadProfilePhoto} photoBusy={uploadingProfilePhoto} onCancel={() => { setForm(mapDoctorToEdit(doctor)); setEditing(false); }} />}

            <div className="doctor-documents">
              <div className="doctor-documents__head"><div><span className="dashboard-panel__eyebrow">Supporting evidence</span><h3>Credentials & documents</h3><p>Uploaded files are private and visible only through authorised workflows. The acceptable format is PDF.</p></div><label className="dashboard-button dashboard-button--ghost"><Upload size={15} />{uploadingDocument ? "Uploading…" : "Upload document"}<input type="file" accept="application/pdf,.pdf" onChange={uploadDocument} hidden disabled={uploadingDocument} /></label></div>
              {documents.length ? <div className="doctor-document-list">{documents.map((doc) => <a key={doc.id} href={apiFileUrl(doc.storage_url)} target="_blank" rel="noreferrer" className="doctor-document-row"><span className="doctor-document-row__icon"><FileText size={16} /></span><div><strong>{doc.original_name}</strong><small>{doc.document_type?.replaceAll("_", " ")} • {doc.verification_status}</small></div><ChevronRight size={16} /></a>)}</div> : <div className="doctor-empty"><FileText size={21} /><strong>No documents uploaded yet</strong><span>Use the upload action to add a supporting credential or other requested file.</span></div>}
            </div>
          </section>
        </>
      )}
    </RoleDashboardShell>
  );
}
