import { SelectField, TextAreaField, TextField, FieldShell } from "./fields";
import {
  COUNTRY_CODES,
  COUNTRY_CODE_ISO,
  GENDERS,
  NATIONALITIES,
} from "./types";
export function Step1Identity({ data, set, errors }) {
  const iso = COUNTRY_CODE_ISO[data.countryCode] ?? "in";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        label="Full legal name (as per passport)"
        required
        value={data.fullName}
        onChange={(v) => set("fullName", v)}
        error={errors["fullName"]}
        className="sm:col-span-2"
      />
      <TextField
        label="Date of birth"
        type="date"
        required
        value={data.dob}
        onChange={(v) => set("dob", v)}
        error={errors["dob"]}
      />
      <SelectField
        label="Gender"
        required
        options={GENDERS}
        value={data.gender}
        onChange={(v) => set("gender", v)}
        error={errors["gender"]}
      />
      <SelectField
        label="Nationality"
        required
        options={NATIONALITIES}
        value={data.nationality}
        onChange={(v) => set("nationality", v)}
        error={errors["nationality"]}
      />
      <TextField
        label="Passport number"
        required
        value={data.passportNumber}
        onChange={(v) => set("passportNumber", v)}
        error={errors["passportNumber"]}
      />
      <SelectField
        label="Issuing country"
        required
        options={NATIONALITIES}
        value={data.passportCountry}
        onChange={(v) => set("passportCountry", v)}
        error={errors["passportCountry"]}
      />
      <TextField
        label="Passport expiry"
        type="date"
        required
        value={data.passportExpiry}
        onChange={(v) => set("passportExpiry", v)}
        error={errors["passportExpiry"]}
      />
      <TextField
        label="Email address"
        type="email"
        required
        value={data.email}
        onChange={(v) => set("email", v)}
        error={errors["email"]}
      />
      <FieldShell label="Mobile number" required error={errors["mobile"]}>
        <div className="flex gap-2">
          <div className="flex w-28 items-center gap-1.5 rounded-xl border border-outline bg-surface px-2 py-3">
            <img
              src={`https://flagcdn.com/24x18/${iso}.png`}
              alt=""
              width={20}
              height={15}
              className="shrink-0 rounded-[2px]"
            />
            <select
              aria-label="Country code"
              value={data.countryCode}
              onChange={(e) => set("countryCode", e.target.value)}
              className="w-full bg-transparent text-body-large text-on-surface outline-none"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <input
            value={data.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            className="w-full rounded-xl border border-outline bg-surface px-4 py-3 text-body-large text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
        </div>
      </FieldShell>
      <TextAreaField
        label="Home country address"
        required
        rows={3}
        value={data.address}
        onChange={(v) => set("address", v)}
        error={errors["address"]}
        className="sm:col-span-2"
      />
    </div>
  );
}
