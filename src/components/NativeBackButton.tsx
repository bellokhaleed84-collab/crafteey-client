"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const TAB_ROOTS = [
  "/dashboard/hub",
  "/dashboard/rider",
  "/dashboard/technicians",
  "/dashboard/settings",
];
const EXIT_SCREENS = ["/", "/dashboard", "/login", "/register"];

function showToast(text: string) {
  const el = document.createElement("div");
  el.textContent = text;
  el.setAttribute("role", "status");
  el.style.cssText =
    "position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:9998;" +
    "background:rgba(15,23,42,.92);color:#fff;font-size:13px;font-weight:600;" +
    "padding:10px 16px;border-radius:999px;";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

export default function NativeBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const routerRef = useRef(router);
  const lastPress = useRef(0);

  useEffect(() => {
    pathRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handle = () => {
      // 1. An open sheet or dialog: close it first.
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const btn = Array.from(dialog.querySelectorAll("button")).find((b) =>
          /^(close|not now|cancel)$/i.test((b.getAttribute("aria-label") || b.textContent || "").trim())
        );
        if (btn) {
          (btn as HTMLButtonElement).click();
          return;
        }
      }

      const path = pathRef.current;

      // 2. Home / login: press twice to exit.
      if (EXIT_SCREENS.includes(path)) {
        const now = Date.now();
        if (now - lastPress.current < 2000) {
          void App.exitApp();
        } else {
          lastPress.current = now;
          showToast("Press back again to exit");
        }
        return;
      }

      // 3. Main tabs go to Home.
      if (TAB_ROOTS.includes(path)) {
        routerRef.current.replace("/dashboard");
        return;
      }

      // 4. Anything deeper goes back one step.
      if (window.history.length > 1) routerRef.current.back();
      else routerRef.current.replace("/dashboard");
    };

    const sub = App.addListener("backButton", handle);
    return () => {
      void sub.then((s) => s.remove());
    };
  }, []);

  return null;
}