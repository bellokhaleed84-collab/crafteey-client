import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import RegisterSW from "@/components/RegisterSW";

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
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>
            <RegisterSW />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}