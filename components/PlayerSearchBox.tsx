"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PlayerLite = {
  id: string | number;
  full_name?: string;
  name?: string;
  team_abbreviation?: string;
  team?: string;
  pos?: string;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: PlayerLite | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export default function PlayerSearchBox({
  value,
  onChange,
  onSelect,
  placeholder = "Search player…",
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PlayerLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // NEW: remember the last selected player's name to suppress "No matches"
  const lastPickedNameRef = useRef<string | null>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    const t = setTimeout(async () => {
      try {
        const url = `/api/game-logs/players?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list: PlayerLite[] = Array.isArray(data) ? data : (data?.players ?? []);
        setItems(list.slice(0, 12));
        setHighlight(0);
        setOpen(true);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Search failed");
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const display = (p: PlayerLite) => {
    const nm = p.full_name || p.name || "";
    const team = p.team_abbreviation || p.team || "";
    const pos = p.pos ? ` • ${p.pos}` : "";
    return team ? `${nm} (${team}${pos})` : `${nm}${pos}`;
  };

  function handleSelect(p: PlayerLite) {
    const nm = p.full_name || p.name || "";
    lastPickedNameRef.current = nm; // remember selection
    onSelect(p);
    onChange(nm);
    setQuery(nm);
    setItems([]);        // clear list so dropdown doesn’t reopen with “No matches”
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, items.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (items[highlight]) {
        e.preventDefault();
        handleSelect(items[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Suppress "No matches" if the input equals the last picked name
  const suppressNoMatches =
    lastPickedNameRef.current != null &&
    query.trim() === lastPickedNameRef.current;

  const showNoMatches = useMemo(
    () =>
      !loading &&
      open &&
      query.trim().length >= 2 &&
      items.length === 0 &&
      !error &&
      !suppressNoMatches,
    [loading, open, query, items, error, suppressNoMatches]
  );

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          onChange(v);
          // if user starts typing after a selection, allow "No matches" again
          if (lastPickedNameRef.current && v.trim() !== lastPickedNameRef.current) {
            lastPickedNameRef.current = null;
          }
          if (v.trim().length >= 2) setOpen(true);
        }}
        onFocus={() => {
          if (items.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none ring-0 focus:border-neutral-700"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="player-search-listbox"
      />

      {open && (
        <div
          id="player-search-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-neutral-800 bg-neutral-950 shadow-lg"
        >
          {loading ? (
            <div className="px-3 py-2 text-sm text-neutral-400">Searching…</div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-400">Error: {error}</div>
          ) : showNoMatches ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No matches</div>
          ) : (
            items.map((p, idx) => {
              const isActive = idx === highlight;
              return (
                <div
                  key={`${p.id}-${idx}`}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(p)}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    isActive ? "bg-neutral-800 text-white" : "text-neutral-200 hover:bg-neutral-900"
                  }`}
                >
                  {display(p)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
