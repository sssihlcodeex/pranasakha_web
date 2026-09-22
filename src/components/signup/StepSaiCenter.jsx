import { TextField } from "./fields";
export function StepSaiCenter({ data, set, errors }) {
  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="mb-2 text-label-medium uppercase text-on-surface-variant">
          Are you associated with any Sai Center?{" "}
          <span className="text-secondary">*</span>
        </legend>
        <div className="flex gap-3">
          {["yes", "no"].map((opt) => (
            <label
              key={opt}
              className={`m3-chip cursor-pointer ${
                data.saiCenterAffiliated === opt
                  ? "border-primary bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant"
              }`}
            >
              <input
                type="radio"
                name="saiCenterAffiliated"
                className="sr-only"
                checked={data.saiCenterAffiliated === opt}
                onChange={() => {
                  set("saiCenterAffiliated", opt);
                  if (opt === "yes") set("normsAccepted", true);
                  else set("normsAccepted", false);
                }}
              />
              {opt === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </div>
        {errors["saiCenterAffiliated"] && (
          <span className="mt-1 block text-label-medium text-destructive">
            {errors["saiCenterAffiliated"]}
          </span>
        )}
      </fieldset>

      {data.saiCenterAffiliated === "yes" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Sai Center name (optional)"
            value={data.saiCenterName}
            onChange={(v) => set("saiCenterName", v)}
          />
          <div className="m3-card-outlined flex items-center p-4 text-body-large text-on-surface-variant sm:col-span-1">
            Since you're already associated with a Sai Center, you're familiar
            with the rules, regulations, dress code, and conduct expected at Sri
            Sathya Sai institutions.
          </div>
        </div>
      )}

      {data.saiCenterAffiliated === "no" && (
        <div className="m3-card-outlined space-y-4 p-6">
          <p className="text-body-large text-on-surface">
            Since you're not currently associated with a Sai Center, please
            review the guidelines below before continuing — they cover dress
            code, socializing, and general conduct expected of every guest at
            Sri Sathya Sai institutions.
          </p>

          <a
            href="https://www.sathyasai.org/ashrams/prasanthi/guidelines.html"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Read the official Prasanthi Nilayam guidelines →
          </a>

          <ul className="list-disc space-y-1 pl-5 text-body-large text-on-surface-variant">
            <li>
              Modest, simple dress is expected at all times on campus — no
              sleeveless tops, shorts, or revealing clothing.
            </li>
            <li>
              Silence and decorum are maintained in and around the Mandir and
              residential areas.
            </li>
            <li>
              Public displays of affection, loud conversation, and disruptive
              behavior are discouraged.
            </li>
            <li>
              Alcohol, tobacco, and non-vegetarian food are not permitted on the
              ashram premises.
            </li>
            <li>
              Photography may be restricted in certain areas — please follow
              posted signage.
            </li>
          </ul>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={data.normsAccepted}
              onChange={(e) => set("normsAccepted", e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-secondary)]"
            />
            <span className="text-body-large text-on-surface-variant">
              I have read and accept the guidelines, dress code, and code of
              conduct for Sri Sathya Sai institutions.
            </span>
          </label>

          {errors["normsAccepted"] && (
            <span className="block text-label-medium text-destructive">
              {errors["normsAccepted"]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
