// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "JuicedStats",
  description: "NBA prop research",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
