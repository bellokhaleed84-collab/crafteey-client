"use client";

interface SearchingOverlayProps {
  onCancel: () => void;
}

export default function SearchingOverlay({ onCancel }: SearchingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-white/95 backdrop-blur dark:bg-slate-950/95">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand dark:border-slate-700 dark:border-t-brand-accent" />

      <div className="text-center">
        <p className="text-base font-bold text-slate-900 dark:text-slate-100">
          Finding a courier
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This usually takes a moment. You can cancel at any time.
        </p>
      </div>

      <button
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Cancel
      </button>
    </div>
  );
}