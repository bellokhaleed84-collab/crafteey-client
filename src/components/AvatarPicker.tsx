"use client";

import Avatar from "@/components/Avatar";
import { AVATAR_KEYS } from "@/lib/avatars";

export default function AvatarPicker({
  value,
  saving,
  onSelect,
}: {
  value?: string | null;
  saving: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {AVATAR_KEYS.map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={saving}
              onClick={() => onSelect(key)}
              aria-label={`Choose ${key.replace("-", " ")}`}
              aria-pressed={selected}
              className={`rounded-full transition disabled:opacity-60 ${
                selected
                  ? "ring-2 ring-brand-accent ring-offset-2 dark:ring-offset-slate-900"
                  : "hover:scale-105"
              }`}
            >
              <Avatar avatarKey={key} className="h-full w-full aspect-square" />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={saving || !value}
        onClick={() => onSelect("")}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Use my initials instead
      </button>
    </div>
  );
}