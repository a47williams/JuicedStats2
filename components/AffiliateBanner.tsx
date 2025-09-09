// components/AffiliateBanner.tsx
// Fix: use direct NEXT_PUBLIC_* access (compiled at build time) so SSR/CSR match.
// Avoid bracket access / globalThis lookups which caused hydration mismatch.

export default function AffiliateBanner() {
  const links = [
    { href: process.env.NEXT_PUBLIC_AFFILIATE_DK,  label: "DraftKings" },
    { href: process.env.NEXT_PUBLIC_AFFILIATE_FD,  label: "FanDuel" },
    { href: process.env.NEXT_PUBLIC_AFFILIATE_MGM, label: "BetMGM"  },
  ].filter(
    (x): x is { href: string; label: string } =>
      typeof x.href === "string" && x.href.length > 0
  );

  if (!links.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {links.map(({ href, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-green-300 bg-green-100 px-3 py-1 text-sm text-green-900 hover:bg-green-200 dark:border-green-400/40 dark:bg-green-400/10 dark:text-green-300 dark:hover:bg-green-400/20"
        >
          {label}
        </a>
      ))}
    </div>
  );
}
