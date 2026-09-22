import { useRef, useState } from "react";
import { Check, UploadCloud } from "lucide-react";
const baseField =
  "w-full rounded-xl border border-outline bg-surface px-4 py-3 text-body-large text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/25";
export function FieldShell({
  label,
  error,
  required,
  children,
  className = "",
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-label-medium uppercase text-on-surface-variant">
        {label}
        {required && <span className="text-secondary"> *</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-label-medium text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  error,
  required,
  type = "text",
  placeholder,
  className,
}) {
  return (
    <FieldShell
      label={label}
      error={error}
      required={required}
      className={className}
    >
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={baseField}
      />
    </FieldShell>
  );
}
export function TextAreaField({
  label,
  value,
  onChange,
  error,
  required,
  rows = 3,
  className,
}) {
  return (
    <FieldShell
      label={label}
      error={error}
      required={required}
      className={className}
    >
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseField} resize-y`}
      />
    </FieldShell>
  );
}
export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  required,
  className,
}) {
  return (
    <FieldShell
      label={label}
      error={error}
      required={required}
      className={className}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseField} appearance-none bg-[length:0] pr-10`}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
export function ChipMultiSelect({
  label,
  options,
  selected,
  onToggle,
  error,
  required,
}) {
  return (
    <div>
      <span className="mb-2 block text-label-medium uppercase text-on-surface-variant">
        {label}
        {required && <span className="text-secondary"> *</span>}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`m3-chip transition-colors ${
                active
                  ? "border-primary bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" />}
              {option}
            </button>
          );
        })}
      </div>
      {error && (
        <span className="mt-1 block text-label-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
export function UploadBox({ label, required, fileName, onFile, error }) {
  const isPdf = (file) => file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && isPdf(f)) onFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${dragging ? "border-primary bg-primary-container/40" : "border-outline hover:bg-surface-variant/60"}`}
      >
        <UploadCloud className="h-5 w-5 text-primary" />
        <span className="text-title-medium text-on-surface">
          {label}
          {required && <span className="text-secondary"> *</span>}
        </span>
        <span className="text-label-medium text-on-surface-variant">
          {fileName ? fileName : "Drag & drop or click to upload"}
        </span>
        <span className="text-[11px] font-medium text-on-surface-variant/80">PDF only</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && isPdf(f)) onFile(f);
          }}
        />
      </div>
      {error && (
        <span className="mt-1 block text-label-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
