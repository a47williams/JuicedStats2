// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";

import PromoBanner from "@/components/PromoBanner";
import AuthButtons from "@/components/AuthButtons";
import ThemeToggle from "@/components/ThemeToggle"; // you already have this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JuicedStats",
  description: "NBA Prop Research",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('theme');
                if (t === 'light') document.documentElement.classList.remove('dark');
                else document.documentElement.classList.add('dark');
              } catch {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50`}>
        {/* Promo banner */}
        <PromoBanner />

        {/* Top nav */}
        <header className="sticky top-0 z-40 bg-neutral-50/80 backdrop-blur dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight">
              JuicedStats <span className="opacity-50 text-xs align-top">v0.1</span>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <AuthButtons />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
