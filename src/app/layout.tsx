import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RegisterSW from "@/components/RegisterSW";
import AppSplash from "@/components/AppSplash";
import NativeBackButton from "@/components/NativeBackButton";

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Crafteey",
  description: "Request a trusted pro for any home job in minutes.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4002AF" />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>
            <RegisterSW />
            <AppSplash />
            <NativeBackButton />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}