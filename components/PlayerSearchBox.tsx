// components/PlayerSearchBox.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export type PlayerOption = { id: number; name: string; teamTri?: string };

export default function PlayerSearchBox({
  value,
  onChange,
  onPick,
  placeholder = "e.g., Jayson Tatum",
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: PlayerOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlayerOption[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  // click outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // fetch suggestions
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/game-logs/players?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const j = await r.json();
        setItems(Array.isArray(j?.players) ? j.players : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  return (
    <div ref={boxRef} className="relative">
      <input
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (loading || items.length > 0) && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          {loading && <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">Searching…</div>}
          {!loading &&
            items.slice(0, 12).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-amber-50 dark:hover:bg-neutral-700/40"
              >
                <span className="text-neutral-800 dark:text-neutral-100">{p.name}</span>
                {p.teamTri && <span className="text-xs text-neutral-500 dark:text-neutral-400">{p.teamTri}</span>}
              </button>
            ))}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
