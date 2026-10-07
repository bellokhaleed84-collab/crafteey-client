"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAuth } from "@/contexts/AuthContext";

const BG = "#4002AF";
const MIN_MS = 900; // never flash shorter than this
const MAX_MS = 2600; // never hold longer than this, even on a slow phone
const FADE_MS = 350;

// Show once per app launch, not on every page change.
let shownThisLaunch = false;

type Phase = "off" | "show" | "fade";

const chevron = (o: number) =>
  `M${471 + o} 677H${489 + o}L${558 + o} 736.5L${489 + o} 796H${471 + o}L${520 + o} 736.5Z`;

export default function AppSplash() {
  const { loading } = useAuth();
  const [phase, setPhase] = useState<Phase>("off");
  const startedAt = useRef(0);

  // Start: only inside the Android app, or in a browser with ?splash in the URL (for testing).
  useEffect(() => {
    if (shownThisLaunch) return;
    const native = Capacitor.isNativePlatform();
    const preview = new URLSearchParams(window.location.search).has("splash");
    if (!native && !preview) return;
    shownThisLaunch = true;
    startedAt.current = Date.now();
    setPhase("show");
    if (native) {
      // Hand over from the native splash only after this overlay has painted.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          void SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {});
        })
      );
    }
  }, []);

  // Leave as soon as the app is ready, but not before MIN_MS.
  useEffect(() => {
    if (phase !== "show" || loading) return;
    const wait = Math.max(0, MIN_MS - (Date.now() - startedAt.current));
    const t = setTimeout(() => setPhase("fade"), wait);
    return () => clearTimeout(t);
  }, [phase, loading]);

  // Safety cap for slow phones.
  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("fade"), MAX_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => setPhase("off"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "off") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: phase === "fade" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <style>{`
        @keyframes cs-run {
          0% { transform: translateX(0); opacity: 1; }
          30% { transform: translateX(14px); opacity: 1; }
          60% { transform: translateX(0); opacity: 0.35; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .cs-chev { animation: cs-run 1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cs-chev { animation: none; } }
      `}</style>
      {/* Same size as the native splash logo (22.7% of screen height) so there is no visible jump. */}
      <svg viewBox="352 591 307 288" style={{ width: "22.7vh", maxWidth: "70vw", height: "auto" }}>
        <path
          fill="#FFFFFF"
          fillRule="evenodd"
          d="M636 591H496A144 144 0 0 0 496 879H636V808H497A72.5 72.5 0 0 1 497 663H636Z"
        />
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            className="cs-chev"
            fill="#FEB200"
            d={chevron(51.5 * i)}
            style={{ animationDelay: `${0.25 + i * 0.12}s` }}
          />
        ))}
      </svg>
    </div>
  );
}