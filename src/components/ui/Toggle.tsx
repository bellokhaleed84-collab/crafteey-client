"use client";

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-brand-accent" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      {/* Inline colour so the dark-mode CSS can never turn the knob black. */}
      <span
        aria-hidden="true"
        style={{ backgroundColor: "#FFFFFF" }}
        className={`pointer-events-none inline-block h-6 w-6 rounded-full shadow-md transition-transform duration-200 ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}