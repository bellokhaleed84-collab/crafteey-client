import crypto from "crypto";

/**
 * Two-stage job QR verification helpers.
 * Copy this file into BOTH crafteey-client and the technician app (src/lib/jobVerification.ts).
 *
 * What goes inside a QR code:  CQ1.S.<random token>   (start)
 *                              CQ1.C.<random token>   (completion)
 *
 * The token is 32 random bytes. It is NOT a job id, phone number, name, price or address.
 * Only its SHA-256 hash is stored in the database, so a database leak cannot be used to fake a scan.
 */

export type QrStage = "start" | "complete";

/** How long a displayed QR stays valid. The client screen re-issues a fresh one automatically. */
export const QR_TTL_MS = 10 * 60 * 1000;

/** Job statuses in which the technician is allowed to do the START scan. */
export const START_ALLOWED_STATUSES = ["dispatched", "on_the_way", "arrived"] as const;

/** Job statuses in which the client is allowed to be shown any QR at all. */
export const QR_VISIBLE_STATUSES = [
  "dispatched",
  "on_the_way",
  "arrived",
  "in_progress",
] as const;

const PREFIX = "CQ1";
const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/; // base64url of 32 bytes is exactly 43 chars

export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildPayload(stage: QrStage, token: string): string {
  return `${PREFIX}.${stage === "start" ? "S" : "C"}.${token}`;
}

export function parsePayload(
  raw: unknown
): { stage: QrStage; token: string } | null {
  if (typeof raw !== "string") return null;
  const parts = raw.trim().split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;

  const stage: QrStage | null =
    parts[1] === "S" ? "start" : parts[1] === "C" ? "complete" : null;
  if (!stage) return null;

  const token = parts[2];
  if (!TOKEN_REGEX.test(token)) return null;

  return { stage, token };
}

/** Whole seconds between two server-side Dates. Works across midnight (10:32 PM -> 12:05 AM). */
export function computeDurationSeconds(startedAt: Date, completedAt: Date): number {
  const ms = completedAt.getTime() - startedAt.getTime();
  return Math.max(0, Math.round(ms / 1000));
}

/** 5580 -> "1h 33m", 2700 -> "45m", 20 -> "Under 1m" */
export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 1) return "Under 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}