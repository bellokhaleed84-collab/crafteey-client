import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Unchanged — this is already used everywhere for headings
        // (text-brand) and primary buttons (bg-brand). Renaming its
        // meaning to yellow would make every existing heading and
        // button illegible, so it stays exactly as it was.
        brand: {
          DEFAULT: "#0F172A",
          light: "#1E293B",
          // Changed from orange (#D97706) to electric blue, matching
          // the new palette. Safe repaint: same usage pattern (buttons,
          // links, focus rings), same white-text contrast profile.
          accent: "#2563EB",
          accentLight: "#3B82F6",
          accentDark: "#1D4ED8",
        },
        // New — the mockup's warm bright yellow. Nothing currently uses
        // this, so adding it is zero-risk. Use it deliberately going
        // forward for logo marks, hero banners, and any CTA you choose
        // to repaint from navy to yellow.
        sunshine: {
          DEFAULT: "#FACC15",
          light: "#FDE047",
          dark: "#CA8A04",
        },
        // New — white background + very light gray for cards/sections/
        // dividers, per the mockup's "clean, modern" surfaces.
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F5F7",
        },
        // Fix — `text-steel` is already used across several existing
        // pages but was never defined here, so it's been rendering as
        // plain inherited text color this whole time. This makes it
        // the muted charcoal-gray it was clearly always meant to be.
        steel: "#6B7280",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        "card-lg": "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;