export const AVATAR_KEYS = [
  "avatar-1",
  "avatar-2",
  "avatar-3",
  "avatar-4",
  "avatar-5",
  "avatar-6",
  "avatar-7",
  "avatar-8",
  "avatar-9",
  "avatar-10",
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export function isAvatarKey(v: unknown): v is AvatarKey {
  return typeof v === "string" && (AVATAR_KEYS as readonly string[]).includes(v);
}