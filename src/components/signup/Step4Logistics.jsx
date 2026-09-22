import { Plus, Trash2 } from "lucide-react";
import { TextAreaField, TextField } from "./fields";
import { DARSHAN_OPTIONS } from "./types";
export function Step4Logistics({ data, set, errors }) {
  const updateMember = (index, key, value) => {
    const next = data.family.map((m, i) =>
      i === index ? { ...m, [key]: value } : m,
    );
    set("family", next);
  };
  return (
    <div className="grid gap-6">
      <div>
        <span className="mb-2 block text-label-medium uppercase text-on-surface-variant">
          Accompanying family members <span className="ml-1 text-xs font-normal normal-case tracking-normal text-on-surface-variant">(Optional)</span>
        </span>
        <div className="grid gap-3">
          {data.family.map((member, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-2xl border border-outline p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <TextField
                label="Name"
                value={member.name}
                onChange={(v) => updateMember(i, "name", v)}
              />
              <TextField
                label="Relationship"
                value={member.relationship}
                onChange={(v) => updateMember(i, "relationship", v)}
              />
              <TextField
                label="Passport number"
                value={member.passport}
                onChange={(v) => updateMember(i, "passport", v)}
              />
              <button
                type="button"
                aria-label={`Remove family member ${i + 1}`}
                onClick={() =>
                  set(
                    "family",
                    data.family.filter((_, idx) => idx !== i),
                  )
                }
                className="self-end rounded-full p-3 text-on-surface-variant hover:bg-surface-variant"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            set("family", [
              ...data.family,
              { name: "", relationship: "", passport: "" },
            ])
          }
          className="m3-btn-outlined mt-3 !rounded-full !py-2.5 !text-sm"
        >
          <Plus className="h-4 w-4" /> Add family member
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextAreaField
          label="Dietary requirements (Optional)"
          rows={2}
          value={data.dietary}
          onChange={(v) => set("dietary", v)}
        />
        <TextAreaField
          label="Accessibility / mobility needs (Optional)"
          rows={2}
          value={data.accessibility}
          onChange={(v) => set("accessibility", v)}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-label-medium uppercase text-on-surface-variant">
          Preferred arrival airport <span className="ml-1 text-xs font-normal normal-case tracking-normal text-on-surface-variant">(Optional)</span>
        </legend>
        <div className="flex flex-wrap gap-3">
          {[
            { value: "BLR", label: "BLR — Bengaluru" },
          ].map((option) => (
            <label
              key={option.value}
              className={`m3-chip cursor-pointer ${
                data.airport === option.value
                  ? "border-primary bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant"
              }`}
            >
              <input
                type="radio"
                name="airport"
                className="sr-only"
                checked={data.airport === option.value}
                onChange={() => set("airport", option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
        {errors["airport"] && (
          <span className="mt-1 block text-label-medium text-destructive">
            {errors["airport"]}
          </span>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Flight number (Optional)"
          placeholder="e.g. AI 202"
          value={data.flightNumber}
          onChange={(v) => set("flightNumber", v)}
          error={errors["flightNumber"]}
        />
        <TextField
          label="Airline name (Optional)"
          placeholder="e.g. Air India"
          value={data.airline}
          onChange={(v) => set("airline", v)}
          error={errors["airline"]}
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-label-medium uppercase text-on-surface-variant">
          Kulwant Hall Darshan seating request <span className="ml-1 text-xs font-normal normal-case tracking-normal text-on-surface-variant">(Optional)</span>
        </legend>
        <div className="inline-flex flex-wrap gap-1 rounded-full border border-outline p-1">
          {DARSHAN_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={data.darshan === option}
              onClick={() => set("darshan", option)}
              className={`rounded-full px-4 py-2 text-label-medium transition-colors ${
                data.darshan === option
                  ? "bg-secondary text-secondary-foreground"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
