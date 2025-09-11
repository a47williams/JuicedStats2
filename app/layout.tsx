import "./globals.css";
import { Inter } from "next/font/google";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButtons from "@/components/AuthButtons";
import Providers from "@/components/Providers";
import BetaBanner from "@/components/BetaBanner"; // ← keep ONLY this one

const inter = Inter({ subsets: ["latin"] });
const PROMO_CODE = process.env.NEXT_PUBLIC_STRIPE_PROMO_CODE || "EARLYBIRD25";
const isEarlyBird = true; // or your date check

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-50 dark:bg-neutral-950`}>
        <Providers>
          <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-neutral-950/60">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Logo />
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <AuthButtons />
                <span className="text-[10px] text-gray-400">v0.1</span>
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
