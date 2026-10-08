"use client";

import {
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import CrafteeyMark from "./CrafteeyMark";

type IconProps = { className?: string };

function Svg({ className = "h-5 w-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MailIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Svg>
  );
}
export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}
export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </Svg>
  );
}
export function PhoneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </Svg>
  );
}
export function EyeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Svg>
  );
}
export function EyeOffIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 3l18 18" />
      <path d="M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.8M6.7 7.3A15.5 15.5 0 0 0 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1" />
      <path d="M9.9 10a2.8 2.8 0 0 0 4 4" />
    </Svg>
  );
}
export function ArrowLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Svg>
  );
}
export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}
export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function Spinner({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Page wrapper used by every auth screen: phone-width column, safe-area aware. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate mx-auto flex min-h-screen w-full max-w-sm flex-col overflow-hidden px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      {children}
    </main>
  );
}

export function AuthLogo() {
  return (
    <div className="flex items-center justify-center gap-2.5 text-[#4002AF] dark:text-white">
      <CrafteeyMark className="h-8 w-9" />
      <span className="text-2xl font-bold tracking-tight">Crafteey</span>
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
    >
      <ArrowLeftIcon />
    </button>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  icon: ReactNode;
  onChange: (value: string) => void;
  right?: ReactNode;
};

export function Field({ label, icon, onChange, right, ...rest }: FieldProps) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-[#4002AF] focus-within:ring-2 focus-within:ring-[#4002AF]/20">
      <span className="text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-slate-500">{label}</span>
        <input
          {...rest}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </span>
      {right}
    </label>
  );
}

export function PasswordField(props: Omit<FieldProps, "icon" | "type" | "right">) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      icon={<LockIcon />}
      type={show ? "text" : "password"}
      right={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

export function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(pw), label: "One uppercase letter" },
    { ok: /\d/.test(pw), label: "One number" },
  ];
}

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-1.5 pt-1">
      {passwordChecks(password).map((c) => (
        <li key={c.label} className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full ${
              c.ok ? "bg-emerald-500 text-white" : "bg-slate-200 text-transparent"
            }`}
          >
            <CheckIcon className="h-3 w-3" />
          </span>
          <span className={c.ok ? "text-slate-700" : ""}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300"
    >
      {message}
    </p>
  );
}

export function PrimaryButton({
  loading,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4002AF] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4002AF]/25 transition hover:bg-[#35028F] active:scale-[0.99] disabled:opacity-60 ${className}`}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function OptionButton({
  icon,
  label,
  primary,
  loading,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  primary?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-60 ${
        primary
          ? "border-[#4002AF] bg-[#4002AF] text-white shadow-lg shadow-[#4002AF]/25 hover:bg-[#35028F]"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {loading ? <Spinner /> : icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRightIcon className="h-4 w-4 opacity-60" />
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      or
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}