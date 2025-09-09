import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButtons from "@/components/AuthButtons";
const inter = Inter({ subsets: ["latin"] });
export const metadata = { title: "JuicedStats", description: "NBA Prop Research", icons: { icon: "/favicon.ico" } };
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
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}