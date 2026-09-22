import { ChipMultiSelect, SelectField, TextField, UploadBox } from "./fields";
import { CATEGORY_SPECIALTIES, LANGUAGES, UPLOADS } from "./types";
export function Step2Credentials({ data, set, errors }) {
  const toggleLanguage = (lang) =>
    set(
      "languages",
      data.languages.includes(lang)
        ? data.languages.filter((l) => l !== lang)
        : [...data.languages, lang],
    );
  const specialtyOptions =
    CATEGORY_SPECIALTIES[data.category] ?? CATEGORY_SPECIALTIES.doctors;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-label-medium uppercase text-on-surface-variant">
          Do you have any state (Medical Council) registration Number?
          <span className="ml-1 text-xs font-semibold normal-case tracking-normal text-muted-foreground">(Optional)</span>
        </legend>
        <div className="flex gap-3">
          {["yes", "no"].map((opt) => (
            <label
              key={opt}
              className={`m3-chip cursor-pointer ${
                data.hasNmc === opt
                  ? "border-primary bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant"
              }`}
            >
              <input
                type="radio"
                name="hasNmc"
                className="sr-only"
                checked={data.hasNmc === opt}
                onChange={() => set("hasNmc", opt)}
              />
              {opt === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </div>
        {errors["hasNmc"] && (
          <span className="mt-1 block text-label-medium text-destructive">
            {errors["hasNmc"]}
          </span>
        )}
      </fieldset>

      {data.hasNmc === "yes" ? (
        <TextField
          label="State (Medical Council) registration number"
          value={data.councilNumber}
          onChange={(v) => set("councilNumber", v)}
          error={errors["councilNumber"]}
        />
      ) : (
        <TextField
          label="State (Medical Council) registration number"
          value={data.councilNumber}
          onChange={(v) => set("councilNumber", v)}
          error={errors["councilNumber"]}
        />
      )}
      <TextField
        label="Issuing authority"
        value={data.councilAuthority}
        onChange={(v) => set("councilAuthority", v)}
        error={errors["councilAuthority"]}
      />

      <SelectField
        label="Primary specialty / role"
        required
        options={specialtyOptions}
        value={data.specialty}
        onChange={(v) => set("specialty", v)}
        error={errors["specialty"]}
      />
      {data.specialty === "Other" && (
        <TextField
          label="Please specify your specialty / role"
          required
          value={data.specialtyOther}
          onChange={(v) => set("specialtyOther", v)}
          error={errors["specialtyOther"]}
        />
      )}
      {data.specialty !== "Other" && (
        <TextField
          label="Sub-specialty"
          value={data.subSpecialty}
          onChange={(v) => set("subSpecialty", v)}
        />
      )}

      <TextField
        label="Years of experience"
        type="number"
        required
        value={data.yearsExperience}
        onChange={(v) => set("yearsExperience", v)}
        error={errors["yearsExperience"]}
      />
      <TextField
        label="Current affiliation / hospital"
        required
        value={data.affiliation}
        onChange={(v) => set("affiliation", v)}
        error={errors["affiliation"]}
      />

      <div className="sm:col-span-2">
        <div className="mb-3">
          <span className="block text-label-medium uppercase text-on-surface-variant">Documents</span>
          <p className="mt-1 text-sm text-on-surface-variant">The acceptable format is PDF.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {UPLOADS.map((upload) => (
            <UploadBox
              key={upload.key}
              label={upload.label}
              required={upload.required}
              fileName={data.files[upload.key]?.name || data.files[upload.key]}
              error={errors[`file_${upload.key}`]}
              onFile={(file) =>
                set("files", { ...data.files, [upload.key]: file })
              }
            />
          ))}
        </div>
      </div>

      <div className="sm:col-span-2">
        <ChipMultiSelect
          label="Languages spoken"
          required
          options={LANGUAGES}
          selected={data.languages}
          onToggle={toggleLanguage}
          error={errors["languages"]}
        />
      </div>
    </div>
  );
}
