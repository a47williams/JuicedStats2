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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-dvh bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-50`}
      >
        {/*
          If you have a Providers component for Theme/Auth, you can wrap children with it:
          <Providers>{children}</Providers>
          Leaving it out avoids build breaks if that file was moved/renamed.
        */}
        {children}
      </body>
    </html>
  );
}
