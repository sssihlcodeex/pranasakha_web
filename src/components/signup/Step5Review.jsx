import { CATEGORY_LABEL, INSTITUTION_ADDRESSES, UPLOADS } from "./types";
function Row({ label, value }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-label-medium uppercase text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-body-large text-on-surface">{value || "—"}</dd>
    </div>
  );
}
function Section({ title, step, onEdit, children }) {
  return (
    <section className="m3-card-outlined p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="truncate text-title-medium text-on-surface">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="shrink-0 text-label-medium uppercase text-primary hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 divide-y divide-outline/25">{children}</dl>
    </section>
  );
}
export function Step5Review({ data, set, onEdit }) {
  const consents = [
    {
      key: "consentData",
      label:
        "I consent to the processing of my personal data in line with India's DPDP Act 2023 and GDPR.",
    },
    {
      key: "consentDeclaration",
      label:
        "I declare that I am under no active disciplinary action by any council or board.",
    },
    {
      key: "consentSeva",
      label:
        "I acknowledge and accept the Seva terms of Sri Sathya Sai Medical Institutions.",
    },
  ];
  const resolvedSpecialty =
    data.specialty === "Other" ? data.specialtyOther : data.specialty;
  const resolvedScope = data.clinicalScope
    .map((s) => (s === "Other" ? data.clinicalScopeOther : s))
    .join(", ");
  return (
    <div className="grid gap-5">
      <Section title="Identity & Contact" step={0} onEdit={onEdit}>
        <Row label="Category" value={CATEGORY_LABEL[data.category]} />
        <Row label="Full legal name" value={data.fullName} />
        <Row label="Date of birth" value={data.dob} />
        <Row label="Gender" value={data.gender} />
        <Row label="Nationality" value={data.nationality} />
        <Row
          label="Passport"
          value={[
            data.passportNumber,
            data.passportCountry,
            data.passportExpiry,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Row label="Email" value={data.email} />
        <Row
          label="Mobile"
          value={data.mobile ? `${data.countryCode} ${data.mobile}` : ""}
        />
        <Row label="Address" value={data.address} />
      </Section>

      <Section title="Professional Credentials" step={1} onEdit={onEdit}>
        <Row
          label="NMC registered"
          value={
            data.hasNmc === "yes" ? "Yes" : data.hasNmc === "no" ? "No" : ""
          }
        />
        <Row
          label="Registration"
          value={[data.councilNumber, data.councilAuthority]
            .filter(Boolean)
            .join(" · ")}
        />
        <Row
          label="Specialty / Role"
          value={[resolvedSpecialty, data.subSpecialty]
            .filter(Boolean)
            .join(" — ")}
        />
        <Row
          label="Experience"
          value={data.yearsExperience ? `${data.yearsExperience} years` : ""}
        />
        <Row label="Affiliation" value={data.affiliation} />
        <Row
          label="Documents"
          value={UPLOADS.filter((u) => data.files[u.key])
            .map((u) => `${u.label}: ${data.files[u.key]?.name || data.files[u.key]}`)
            .join(", ")}
        />
        <Row label="Languages" value={data.languages.join(", ")} />
      </Section>

      <Section title="Service Preferences" step={2} onEdit={onEdit}>
        <Row
          label="Institution order"
          value={data.institutions
            .map((inst, i) => `${i + 1}. ${inst}`)
            .join(" · ")}
        />
        {data.institutions.map((inst, i) => (
          <Row key={inst} label={`Institution ${i + 1} address`} value={INSTITUTION_ADDRESSES[inst]} />
        ))}
        <Row label="Clinical scope" value={resolvedScope} />
        <Row
          label="Preferred dates"
          value={
            data.preferredFrom && data.preferredTo
              ? `${data.preferredFrom} → ${data.preferredTo}`
              : ""
          }
        />
      </Section>

      <Section title="Logistics & Accommodation" step={3} onEdit={onEdit}>
        <Row
          label="Family members"
          value={data.family
            .filter((m) => m.name)
            .map(
              (m) =>
                `${m.name} (${m.relationship || "—"}, ${m.passport || "—"})`,
            )
            .join("; ")}
        />
        <Row label="Dietary" value={data.dietary} />
        <Row label="Accessibility" value={data.accessibility} />
        <Row label="Arrival airport" value={data.airport} />
        <Row
          label="Flight"
          value={[data.flightNumber, data.airline].filter(Boolean).join(" · ")}
        />
        <Row label="Darshan seating" value={data.darshan} />
      </Section>

      <section className="m3-card-elevated p-6">
        <h3 className="text-title-medium text-on-surface">Consent</h3>
        <div className="mt-4 grid gap-3">
          {consents.map((consent) => (
            <label
              key={consent.key}
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                type="checkbox"
                checked={data[consent.key]}
                onChange={(e) => set(consent.key, e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-secondary)]"
              />
              <span className="text-body-large text-on-surface-variant">
                {consent.label}
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
