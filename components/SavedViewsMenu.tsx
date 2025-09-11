"use client";

import { useEffect, useMemo, useState } from "react";

type Saved = {
  id?: number;
  name: string;
  params: any;
  createdAt?: string;
  source: "server" | "local";
};

export default function SavedViewsMenu({
  onApply,
  onApplyAndFetch,
  className = "",
}: {
  onApply: (params: any) => void;
  onApplyAndFetch: (params: any) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Saved[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // server (signed-in)
      const res = await fetch("/api/views", { cache: "no-store" });
      let serverItems: Saved[] = [];
      if (res.ok) {
        const j = await res.json();
        if (j?.ok && Array.isArray(j.views)) {
          serverItems = j.views.map((v: any) => ({
            id: v.id,
            name: v.name,
            params: safeParse(v.params),
            createdAt: v.createdAt,
            source: "server" as const,
          }));
        }
      }
      // local fallback
      const localRaw = localStorage.getItem("juicedstats:savedViews");
      const localItems: Saved[] = safeParse(localRaw, []).map((v: any) => ({
        id: undefined,
        name: v.name || "Saved View",
        params: v.params,
        createdAt: v.createdAt,
        source: "local" as const,
      }));

      const merged = [...serverItems, ...localItems].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || "")
      );
      setItems(merged);
    } catch (e: any) {
      setError(e?.message || "Could not load saved views.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && items.length === 0) load();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function safeParse(src: any, fallback: any = null) {
    try {
      if (typeof src === "string") return JSON.parse(src);
      return src;
    } catch {
      return fallback;
    }
  }

  async function deleteItem(sv: Saved) {
    try {
      if (sv.source === "server" && sv.id) {
        const res = await fetch(`/api/views?id=${sv.id}`, { method: "DELETE" });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `HTTP ${res.status}`);
        }
      } else {
        // local
        const key = "juicedstats:savedViews";
        const curr = safeParse(localStorage.getItem(key), []);
        const next = curr.filter((x: any) => !(x.name === sv.name && x.createdAt === sv.createdAt));
        localStorage.setItem(key, JSON.stringify(next));
      }
      setItems((xs) =>
        xs.filter((x) => !(x.source === sv.source && x.id === sv.id && x.createdAt === sv.createdAt))
      );
    } catch (e: any) {
      alert(`Delete failed: ${e?.message || e}`);
    }
  }

  const label = useMemo(() => (loading ? "Saved Views…" : "Saved Views"), [loading]);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-neutral-800 px-3 py-2 text-sm hover:bg-neutral-900"
        title="Open saved views"
      >
        {label}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[380px] max-h-[60vh] overflow-auto rounded-xl border border-neutral-800 bg-black p-2 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <strong className="text-sm">Your Saved Views</strong>
            <button
              onClick={load}
              className="text-xs text-neutral-400 hover:text-neutral-200"
              title="Refresh"
            >
              Refresh
            </button>
          </div>

          {error ? <div className="px-2 py-1 text-xs text-red-400">{error}</div> : null}

          {items.length === 0 && !loading ? (
            <div className="px-2 py-2 text-xs text-neutral-400">No saved views yet.</div>
          ) : null}

          <ul className="space-y-2">
            {items.map((sv, i) => (
              <li key={`${sv.source}-${sv.id ?? "local"}-${i}`} className="rounded-lg border border-neutral-800 p-2">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{sv.name}</div>
                    <div className="text-[10px] text-neutral-500">
                      {sv.source === "server" ? "Saved to account" : "Saved locally"}
                      {sv.createdAt ? ` • ${new Date(sv.createdAt).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <div className="ml-2 flex shrink-0 gap-2">
                    <button
                      onClick={() => onApply(sv.params)}
                      className="rounded-md border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-900"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => onApplyAndFetch(sv.params)}
                      className="rounded-md border border-neutral-700 px-2 py-1 text-xs hover:bg-neutral-900"
                    >
                      Apply &amp; Fetch
                    </button>
                    <button
                      onClick={() => deleteItem(sv)}
                      className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-red-300 hover:bg-neutral-900"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-2 px-2 text-[10px] text-neutral-500">
            Tip: local saves are kept only on this device; sign in to sync saves to your account.
          </div>
        </div>
      )}
    </div>
  );
}
