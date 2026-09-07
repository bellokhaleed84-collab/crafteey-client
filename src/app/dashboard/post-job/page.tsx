"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TRADE_OPTIONS, ISSUE_SUGGESTIONS, OTHER_ISSUE, type Trade } from "@/lib/constants";

interface UploadedFile {
  url: string;
  isVideo: boolean;
  name: string;
}

export default function PostJobPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [category, setCategory] = useState<Trade | "">("");
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCategoryChange(value: string) {
    setCategory(value as Trade | "");
    // Suggestions are trade-specific, so a previously picked issue no
    // longer makes sense once the trade changes.
    setIssueType("");
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const sigRes = await fetch("/api/upload/signature", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sigRes.ok) throw new Error("Could not prepare upload");
      const sig = await sigRes.json();

      const uploaded: UploadedFile[] = [];

      for (const file of selected) {
        const isVideo = file.type.startsWith("video/");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sig.apiKey);
        formData.append("timestamp", String(sig.timestamp));
        formData.append("signature", sig.signature);
        formData.append("folder", sig.folder);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${isVideo ? "video" : "image"}/upload`;

        const res = await fetch(uploadUrl, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();

        uploaded.push({ url: data.secure_url, isVideo, name: file.name });
      }

      setFiles((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Some files failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please select a trade.");
      return;
    }
    if (!issueType) {
      setError("Please select what the issue is.");
      return;
    }
    if (!description) {
      setError("Please describe the issue.");
      return;
    }
    if (!area) {
      setError("Please tell us the area/address.");
      return;
    }

    setSubmitting(true);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          issueType,
          description,
          area,
          photoUrls: files.filter((f) => !f.isVideo).map((f) => f.url),
          videoUrls: files.filter((f) => f.isVideo).map((f) => f.url),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post job");
      }

      const data = await res.json();
      router.push(`/dashboard/jobs/${data.job._id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const issueOptions = category ? [...ISSUE_SUGGESTIONS[category], OTHER_ISSUE] : [];
  const selectClasses =
    "block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  const inputClasses =
    "block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500";

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-brand dark:text-white">Post a job</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Tell us what you need — we'll find you a vetted pro.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-900/30">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            What do you need done?
          </label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={selectClasses}
          >
            <option value="" disabled>
              Select a trade
            </option>
            {TRADE_OPTIONS.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>

        {category && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              What's the issue?
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className={selectClasses}
            >
              <option value="" disabled>
                Select an issue
              </option>
              {issueOptions.map((issue) => (
                <option key={issue} value={issue}>
                  {issue}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Describe the issue
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              issueType === OTHER_ISSUE
                ? "Please tell us exactly what's going on — the more detail, the better."
                : "e.g. My kitchen tap is leaking and won't shut off properly."
            }
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Area / address
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. 12 Adeola Street, Ikeja, Lagos"
            className={inputClasses}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Photos or videos of the issue (optional, but helps a lot)
          </label>
          <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center cursor-pointer transition-colors hover:border-brand-accent/50 dark:border-slate-700 dark:bg-slate-800">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {uploading ? "Uploading…" : "Tap to add photos or videos"}
            </span>
          </label>
          {files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {f.isVideo ? "🎥" : "📷"} {f.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post job"}
        </button>
      </form>
    </div>
  );
}