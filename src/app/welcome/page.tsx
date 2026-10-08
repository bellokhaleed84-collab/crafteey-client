"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CrafteeyMark from "@/components/auth/CrafteeyMark";
import { ChevronRightIcon } from "@/components/auth/AuthParts";

const IMG_W = 768;
const IMG_H = 1376;

// top/bottom = the part of each picture (0 to 1 of its height) that is kept.
// This crops off the logo and caption baked into the images, so the logo,
// title and text are drawn by the app in the app's own purple.
const SLIDES = [
  {
    src: "/onboarding/slide-rides.jpg",
    top: 0.22,
    bottom: 0.79,
    title: "Send It. We'll Deliver It.",
    text: "Send packages quickly and reliably with real-time delivery tracking.",
  },
  {
    src: "/onboarding/slide-food.jpg",
    top: 0.25,
    bottom: 0.72,
    title: "Food & Groceries, Made Easy",
    text: "Order your favorite meals and everyday essentials and have them delivered.",
  },
  {
    src: "/onboarding/slide-technicians.jpg",
    top: 0.27,
    bottom: 0.68,
    title: "Trusted Help, When You Need It",
    text: "Find skilled professionals for repairs, maintenance and everyday jobs.",
  },
  {
    src: "/onboarding/slide-delivery.png",
    top: 0.22,
    bottom: 0.8,
    title: "Send It With Ease",
    text: "Send packages quickly and track your delivery in real time.",
  },
];

const MASK = "radial-gradient(ellipse 75% 75% at 50% 50%, #000 62%, transparent 100%)";

function SlideArt({ src, top, bottom }: { src: string; top: number; bottom: number }) {
  const band = bottom - top;
  const aspect = IMG_W / (IMG_H * band);
  return (
    <div className="flex h-[44vh] items-center justify-center">
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: aspect,
          width: `min(100%, calc(44vh * ${aspect}))`,
          WebkitMaskImage: MASK,
          maskImage: MASK,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute left-0 w-full select-none"
          style={{ top: `${-(top / band) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  function finish(to: string) {
    try {
      localStorage.setItem("crafteey_onboarded", "1");
    } catch {}
    router.replace(to);
  }

  function onScroll() {
    const el = scroller.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  function next() {
    if (last) finish("/register");
    else goTo(index + 1);
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#2B0180] via-[#4002AF] to-[#2B0180] text-white">
      <div className="flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <span className="w-12" />
        <CrafteeyMark className="h-12 w-14 text-white" />
        <button
          type="button"
          onClick={() => finish("/register")}
          className="w-12 text-right text-sm font-medium text-white/70"
        >
          Skip
        </button>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="mt-4 flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((s) => (
          <section key={s.src} className="flex w-full shrink-0 snap-center flex-col px-6">
            <SlideArt src={s.src} top={s.top} bottom={s.bottom} />
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-bold leading-tight">{s.title}</h1>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                {s.text}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="mx-auto w-full max-w-sm px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mb-5 flex justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-amber-500" : "w-2 bg-white/30"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-[#2B0180] shadow-lg shadow-black/20 transition active:scale-[0.99]"
        >
          {last ? "Get Started" : "Next"}
          <ChevronRightIcon className="h-4 w-4" />
        </button>

        <p className="mt-4 text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link
            href="/login"
            onClick={() => {
              try {
                localStorage.setItem("crafteey_onboarded", "1");
              } catch {}
            }}
            className="font-semibold text-amber-400"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}