import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButtons from "@/components/AuthButtons";
import BetaBanner from "@/components/BetaBanner";
import Logo from "@/components/Logo";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100`}
      >
        <Providers>
          <header className="sticky top-0 z-40 border-b border-black/10 dark:border-white/10 bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Logo />
                <span className="text-[10px] text-neutral-400">v0.1</span>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <AuthButtons />
              </div>
            </div>
            <div className="border-t border-black/10 dark:border-white/10">
              {/* Promo / info banner */}
              <div className="mx-auto max-w-6xl px-4 py-2">
                <BetaBanner code={process.env.NEXT_PUBLIC_STRIPE_PROMO_CODE || "EARLYBIRD25"} />
              </div>
            </div>
          </header>

          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
