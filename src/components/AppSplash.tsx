"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { useAuth } from "@/contexts/AuthContext";

const BG = "#4002AF";
const ICON = "#F29A00";
const TOTAL_MS = 5000; // the animation always plays this long
const MAX_MS = 8000; // hard cap if the app is still loading after the animation
const FADE_MS = 350;

// Show once per app launch, not on every page change.
let shownThisLaunch = false;

type Phase = "off" | "show" | "fade";

const chevron = (o: number) =>
  `M${471 + o} 677H${489 + o}L${558 + o} 736.5L${489 + o} 796H${471 + o}L${520 + o} 736.5Z`;

const GLYPHS: Record<string, ReactNode> = {
  bike: (
    <>
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </>
  ),
  car: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  box: (
    <>
      <path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
  bag: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z" />
  ),
  burger: (
    <>
      <path d="M4 11a8 6 0 0 1 16 0Z" />
      <path d="M3 14.5h18" />
      <path d="M4 17.5v.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5Z" />
    </>
  ),
};

function Glyph({ name, className }: { name: string; className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ICON}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name]}
    </svg>
  );
}

// Each bubble shows the first icon, then swaps to the second one mid-orbit.
const SLOTS: [string, string][] = [
  ["bike", "car"],
  ["truck", "burger"],
  ["box", "bag"],
  ["burger", "wrench"],
  ["bag", "box"],
  ["car", "bike"],
  ["truck", "bag"],
  ["wrench", "burger"],
];

const vars = (o: Record<string, string | number>) => o as CSSProperties;

const CSS = `
.cs-root { --R: min(40vw, 26vh); --d: min(14vw, 8vh); }

/* logo: rest, glow, pulse when the icons return, settle */
@keyframes cs-logo {
  0%, 8% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
  14% { transform: scale(1.02); filter: drop-shadow(0 0 16px rgba(255,255,255,0.6)); }
  22%, 72% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(255,255,255,0.15)); }
  80% { transform: scale(1.08); filter: drop-shadow(0 0 22px rgba(255,255,255,0.7)); }
  90% { transform: scale(0.97); filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
  100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); }
}
.cs-logo { position: relative; width: 22.7vh; max-width: 70vw; animation: cs-logo 5s ease-in-out both; }
.cs-logo svg { display: block; width: 100%; height: auto; }

/* chevrons: quick shine sweep at the start */
@keyframes cs-chev {
  0% { transform: translateX(0); fill: #FEB200; }
  50% { transform: translateX(12px); fill: #FFE08A; }
  100% { transform: translateX(0); fill: #FEB200; }
}
.cs-chev { animation: cs-chev 0.6s ease-in-out both; }

/* glint on the middle chevron */
@keyframes cs-glint {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  45% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
}
.cs-glint {
  position: absolute; left: 69%; top: 50.5%; width: 46%; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,214,102,0.5) 25%, rgba(255,255,255,0) 65%);
  opacity: 0; animation: cs-glint 0.8s ease-out 0.55s both;
}

/* light streak shooting out of the right chevron */
@keyframes cs-streak {
  0% { transform: scaleX(0); opacity: 0; }
  25% { transform: scaleX(0.5); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
.cs-streak {
  position: absolute; left: 99%; top: 50.5%; height: 3px; width: 60vw; margin-top: -1.5px;
  transform-origin: left center; border-radius: 2px;
  background: linear-gradient(90deg, #FFE9A8, rgba(254,178,0,0.65) 30%, rgba(254,178,0,0));
  box-shadow: 0 0 10px 2px rgba(254,178,0,0.45);
  opacity: 0; animation: cs-streak 1s ease-out 3.95s both;
}

/* ring of icons */
@keyframes cs-spin { 0%, 18% { transform: rotate(0deg); } 100% { transform: rotate(150deg); } }
@keyframes cs-counter { 0%, 18% { transform: rotate(0deg); } 100% { transform: rotate(-150deg); } }
.cs-ring { position: absolute; left: 50%; top: 50%; width: 0; height: 0; animation: cs-spin 5s linear both; }
.cs-slot { position: absolute; left: 0; top: 0; width: 0; height: 0; transform: rotate(var(--a)); }

@keyframes cs-emerge {
  from { transform: translateY(0) scale(0); opacity: 0; }
  to { transform: translateY(calc(var(--R) * -1)) scale(1); opacity: 1; }
}
.cs-out {
  position: absolute; left: 0; top: 0; width: 0; height: 0;
  animation: cs-emerge 0.7s cubic-bezier(0.2, 1.3, 0.4, 1) calc(0.9s + var(--i) * 0.06s) both;
}

@keyframes cs-suck {
  from { transform: translateY(0) scale(1); opacity: 1; }
  to { transform: translateY(var(--R)) scale(0); opacity: 0; }
}
.cs-in {
  position: absolute; left: 0; top: 0; width: 0; height: 0;
  animation: cs-suck 0.55s ease-in calc(3.7s + var(--i) * 0.03s) both;
}

.cs-up { position: absolute; left: 0; top: 0; width: 0; height: 0; transform: rotate(calc(var(--a) * -1)); }
.cs-cc { position: absolute; left: 0; top: 0; width: 0; height: 0; animation: cs-counter 5s linear both; }

.cs-bubble {
  position: absolute; width: var(--d); height: var(--d); left: calc(var(--d) * -0.5); top: calc(var(--d) * -0.5);
  border-radius: 50%; background: #FFFFFF;
  box-shadow: 0 0 14px 2px rgba(255,255,255,0.55);
}
.cs-g { position: absolute; left: 21%; top: 21%; width: 58%; height: 58%; }

@keyframes cs-gout { to { opacity: 0; transform: scale(0.6) rotate(-30deg); } }
@keyframes cs-gin { from { opacity: 0; transform: scale(0.6) rotate(30deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
.cs-ga { animation: cs-gout 0.4s ease both calc(2.3s + var(--i) * 0.09s); }
.cs-gb { opacity: 0; animation: cs-gin 0.4s ease both calc(2.3s + var(--i) * 0.09s); }
`;

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

  // Leave when the app is ready, but never before the full animation has played.
  useEffect(() => {
    if (phase !== "show" || loading) return;
    const wait = Math.max(0, TOTAL_MS - (Date.now() - startedAt.current));
    const t = setTimeout(() => setPhase("fade"), wait);
    return () => clearTimeout(t);
  }, [phase, loading]);

  // Safety cap in case loading never finishes.
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
      className="cs-root"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: phase === "fade" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <style>{CSS}</style>

      {/* Icon ring sits behind the logo so the icons slip behind it on the way in and out. */}
      <div className="cs-ring">
        {SLOTS.map(([a, b], i) => (
          <div key={i} className="cs-slot" style={vars({ "--a": `${i * 45}deg`, "--i": i })}>
            <div className="cs-out">
              <div className="cs-in">
                <div className="cs-up">
                  <div className="cs-cc">
                    <div className="cs-bubble">
                      <Glyph name={a} className="cs-g cs-ga" />
                      <Glyph name={b} className="cs-g cs-gb" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Same size as the native splash logo (22.7% of screen height) so there is no visible jump. */}
      <div className="cs-logo">
        <svg viewBox="352 591 307 288">
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
              style={{ animationDelay: `${0.5 + i * 0.1}s` }}
            />
          ))}
        </svg>
        <div className="cs-glint" />
        <div className="cs-streak" />
      </div>
    </div>
  );
}