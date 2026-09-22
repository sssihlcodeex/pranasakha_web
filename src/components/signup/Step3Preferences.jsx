import { ArrowDown, ArrowUp } from "lucide-react";
import { ChipMultiSelect, TextField } from "./fields";
import { CATEGORY_CLINICAL_SCOPE, INSTITUTION_ADDRESSES } from "./types";
export function Step3Preferences({ data, set, errors }) {
  const move = (index, dir) => {
    const next = [...data.institutions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    next[index] = b;
    next[target] = a;
    set("institutions", next);
  };
  const scopeOptions =
    CATEGORY_CLINICAL_SCOPE[data.category] ?? CATEGORY_CLINICAL_SCOPE.doctors;
  const toggleScope = (scope) =>
    set(
      "clinicalScope",
      data.clinicalScope.includes(scope)
        ? data.clinicalScope.filter((s) => s !== scope)
        : [...data.clinicalScope, scope],
    );
  return (
    <div className="grid gap-6">
      <div>
        <span className="mb-2 block text-label-medium uppercase text-on-surface-variant">
          Preferred institutions — order by preference
        </span>
        <ul className="grid gap-2">
          {data.institutions.map((name, i) => (
            <li
              key={name}
              className="grid gap-2 rounded-xl border border-outline bg-surface px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full bg-primary-container text-label-medium text-on-primary-container">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-body-large text-on-surface">
                  {name}
                </p>
                <p className="mt-0.5 text-label-medium text-on-surface-variant">
                  {INSTITUTION_ADDRESSES[name] ?? ""}
                </p>
              </div>
              <div className="flex items-start gap-1 sm:col-start-3">
                <button
                  type="button"
                  aria-label={`Move ${name} up`}
                  onClick={() => move(i, -1)}
                  className="rounded-full p-2 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
                  disabled={i === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${name} down`}
                  onClick={() => move(i, 1)}
                  className="rounded-full p-2 text-on-surface-variant hover:bg-surface-variant disabled:opacity-30"
                  disabled={i === data.institutions.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ChipMultiSelect
        label="Preferred clinical scope"
        required
        options={scopeOptions}
        selected={data.clinicalScope}
        onToggle={toggleScope}
        error={errors["clinicalScope"]}
      />
      {data.clinicalScope.includes("Other") && (
        <TextField
          label="Please specify"
          required
          value={data.clinicalScopeOther}
          onChange={(v) => set("clinicalScopeOther", v)}
          error={errors["clinicalScopeOther"]}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Preferred visit — from"
          type="date"
          required
          value={data.preferredFrom}
          onChange={(v) => set("preferredFrom", v)}
          error={errors["preferredFrom"]}
        />
        <TextField
          label="Preferred visit — to"
          type="date"
          required
          value={data.preferredTo}
          onChange={(v) => set("preferredTo", v)}
          error={errors["preferredTo"]}
        />
      </div>
    </div>
  );
}
