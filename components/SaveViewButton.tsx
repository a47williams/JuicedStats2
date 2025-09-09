// components/SaveViewButton.tsx
"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Props = {
  /** Preferred prop name (new) */
  defaultName?: string;
  /** Back-compat: some pages pass `name` */
  name?: string;
  /** Arbitrary filter params to persist */
  params: Record<string, any>;
};

export default function SaveViewButton(props: Props) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const initial = (props.defaultName ?? props.name ?? "My View").slice(0, 140);
  const [viewName, setViewName] = useState(initial);

  const disabled = !session?.user;

  async function save() {
    if (disabled) return signIn();

    try {
      setStatus("saving");
      setMsg("");

      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: viewName || initial, params: props.params }),
      });

      if (res.status === 401) {
        setStatus("error");
        setMsg("Sign in required.");
        return;
      }

      if (res.status === 501) {
        // No DB configured — save to localStorage fallback (still requires sign-in).
        try {
          const uid = (session?.user as any)?.id || "me";
          const key = `juiced:views:${uid}`;
          const list = JSON.parse(localStorage.getItem(key) || "[]");
          const item = {
            id: `local_${Date.now()}`,
            name: viewName || initial,
            params: props.params,
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem(key, JSON.stringify([item, ...list].slice(0, 50)));
          setStatus("done");
          setMsg("Saved locally.");
          setOpen(false);
          return;
        } catch {
          setStatus("error");
          setMsg("Could not save locally.");
          return;
        }
      }

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Save failed (${res.status})`);
      }

      setStatus("done");
      setMsg("Saved!");
      setOpen(false);
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message || "Save failed.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (disabled ? signIn() : setOpen((v) => !v))}
        className={[
          "rounded-md border px-3 py-2 text-sm font-medium",
          disabled
            ? "cursor-pointer border-neutral-300 bg-white text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500"
            : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20",
        ].join(" ")}
        title={disabled ? "Sign in to save views" : "Save current filters as a view"}
      >
        {disabled ? "Sign in to Save" : "Save View"}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          <div className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Name your view</div>
          <input
            className="mb-3 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            value={viewName}
            onChange={(e) => setViewName(e.target.value.slice(0, 140))}
            placeholder="e.g., Tatum Pts 26.5 L10 (Home)"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={status === "saving"}
              className="rounded-md bg-amber-500 px-3 py-1.5 font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
          {msg && (
            <div
              className={[
                "mt-2 text-xs",
                status === "error" ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
              ].join(" ")}
            >
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
