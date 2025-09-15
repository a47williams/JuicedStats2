// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JuicedStats",
  description: "NBA Prop Research",
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    // Default to dark: add className="dark"
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Optional: honor a saved preference while defaulting to dark */}
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
      <body
        className={`${inter.className} min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50`}
      >
        {children}
      </body>
    </html>
  );
}
