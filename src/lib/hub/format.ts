import type { HubVendorDTO } from "./types";

export function formatReviews(n?: number) {
  if (!n) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${n}+`;
}

export function formatVendorMeta(r: HubVendorDTO) {
  const parts: string[] = [];
  if (r.rating) parts.push(`⭐ ${r.rating}${r.reviewCount ? ` (${formatReviews(r.reviewCount)})` : ""}`);
  if (r.etaMin && r.etaMax) parts.push(`${r.etaMin}-${r.etaMax} mins`);
  if (!r.isOpen) parts.push("Closed");
  return parts.join(" · ");
}
