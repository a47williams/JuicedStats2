// app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import BetaBanner from "@/components/BetaBanner";
import Providers from "@/components/Providers";
import { AccountMenu } from "@/components/AuthButtons";

const inter = Inter({ subsets: ["latin"] });
const PROMO_CODE = process.env.NEXT_PUBLIC_STRIPE_PROMO_CODE || "EARLYBIRD25";
const isEarlyBird = true;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100`}>
        <Providers>
          <header className="sticky top-0 z-40 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-neutral-900/70">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Logo />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-neutral-400">v0.1</span>
                <AccountMenu />
              </div>
            </div>
            {isEarlyBird && <BetaBanner code={PROMO_CODE} />}
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
