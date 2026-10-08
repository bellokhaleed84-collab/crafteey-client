"use client";

import { AVATAR_KEYS, isAvatarKey, type AvatarKey } from "@/lib/avatars";

type HairStyle = "short" | "long" | "afro" | "bun" | "cap" | "bald" | "curly" | "headwrap";

type Spec = { bg: string; skin: string; hair: string; style: HairStyle; shirt: string };

const SPECS: Record<AvatarKey, Spec> = {
  "avatar-1": { bg: "#FDE68A", skin: "#8D5524", hair: "#1F2937", style: "short", shirt: "#2563EB" },
  "avatar-2": { bg: "#BFDBFE", skin: "#C68642", hair: "#111827", style: "long", shirt: "#DB2777" },
  "avatar-3": { bg: "#BBF7D0", skin: "#5C3317", hair: "#0F172A", style: "afro", shirt: "#F59E0B" },
  "avatar-4": { bg: "#FBCFE8", skin: "#E0AC69", hair: "#78350F", style: "bun", shirt: "#7C3AED" },
  "avatar-5": { bg: "#DDD6FE", skin: "#3B2219", hair: "#1F2937", style: "cap", shirt: "#059669" },
  "avatar-6": { bg: "#FED7AA", skin: "#FFDBAC", hair: "#B45309", style: "short", shirt: "#DC2626" },
  "avatar-7": { bg: "#A7F3D0", skin: "#8D5524", hair: "#111827", style: "bald", shirt: "#0EA5E9" },
  "avatar-8": { bg: "#FECACA", skin: "#A0522D", hair: "#1F2937", style: "curly", shirt: "#16A34A" },
  "avatar-9": { bg: "#C7D2FE", skin: "#D2A679", hair: "#DB2777", style: "headwrap", shirt: "#EA580C" },
  "avatar-10": { bg: "#FEF08A", skin: "#4A2C1A", hair: "#111827", style: "long", shirt: "#1D4ED8" },
};

const SHORT_TOP = "M32 42 C31 24 42 20 50 20 C60 20 69 25 68 42 C64 33 57 30 50 30 C43 30 36 33 32 42 Z";

function HairBack({ style, color }: { style: HairStyle; color: string }) {
  if (style === "long") {
    return <path d="M29 46 C27 24 40 17 50 17 C60 17 73 24 71 46 L72 78 L28 78 Z" fill={color} />;
  }
  if (style === "afro") {
    return <circle cx="50" cy="38" r="25" fill={color} />;
  }
  if (style === "bun") {
    return <circle cx="50" cy="17" r="8" fill={color} />;
  }
  return null;
}

function HairFront({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case "short":
    case "long":
    case "afro":
    case "bun":
      return <path d={SHORT_TOP} fill={color} />;
    case "cap":
      return (
        <g fill={color}>
          <path d="M31 39 C31 21 69 21 69 39 Z" />
          <rect x="50" y="36" width="26" height="5" rx="2.5" />
        </g>
      );
    case "curly":
      return (
        <g fill={color}>
          <circle cx="36" cy="32" r="8" />
          <circle cx="44" cy="25" r="8" />
          <circle cx="56" cy="25" r="8" />
          <circle cx="64" cy="32" r="8" />
          <circle cx="50" cy="23" r="8" />
        </g>
      );
    case "headwrap":
      return (
        <g fill={color}>
          <path d="M31 40 C31 20 69 20 69 40 C60 34 40 34 31 40 Z" />
          <circle cx="68" cy="27" r="6" />
        </g>
      );
    default:
      return null;
  }
}

function AvatarArt({ spec }: { spec: Spec }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
      <rect width="100" height="100" fill={spec.bg} />
      <HairBack style={spec.style} color={spec.hair} />
      <path d="M15 100 C15 74 33 66 50 66 C67 66 85 74 85 100 Z" fill={spec.shirt} />
      <rect x="44" y="58" width="12" height="12" fill={spec.skin} />
      <ellipse cx="50" cy="44" rx="17" ry="19" fill={spec.skin} />
      <HairFront style={spec.style} color={spec.hair} />
      <circle cx="43" cy="45" r="1.8" fill="#1E293B" />
      <circle cx="57" cy="45" r="1.8" fill="#1E293B" />
      <path d="M44 53 Q50 58 56 53" stroke="#1E293B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export { AVATAR_KEYS };

export default function Avatar({
  avatarKey,
  name,
  className = "h-16 w-16",
  textClassName = "text-xl",
}: {
  avatarKey?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
}) {
  if (isAvatarKey(avatarKey)) {
    return (
      <span className={`inline-block shrink-0 overflow-hidden rounded-full ${className}`}>
        <AvatarArt spec={SPECS[avatarKey]} />
      </span>
    );
  }

  const initials =
    (name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "C";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-yellow-400 font-extrabold text-slate-900 ${textClassName} ${className}`}
    >
      {initials}
    </span>
  );
}