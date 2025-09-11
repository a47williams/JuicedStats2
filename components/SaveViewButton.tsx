"use client";

import { useState } from "react";

type SaveParams = Record<string, any>;

type Props = {
  /** The exact params object you want saved (we'll stringify on the server) */
  params: SaveParams;
  /** Optional default name (we also try to build a readable name if not provided) */
  defaultName?: string;
  className?: string;
};

export default function SaveViewButton({ params, defaultName = "", className = "" }: Props) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function buildAutoName() {
    const p = params || {};
    const nm = [
      p.playerName || p.player || "",
      p.season || "",
      p.stat || "",
      p.propLine != null && p.propLine !== "" ? `@ ${p.propLine}` : "",
      p.odds != null && p.odds !== "" ? `(${p.odds})` : "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return nm || "My View";
  }

  async function onSave() {
    try {
      setSaving(true);
      setStatus("idle");

      // Ask for a name (pre-filled). You could replace with a nicer modal later.
      const suggestion = defaultName || buildAutoName();
      const name = (window.prompt("Name this view:", suggestion) || suggestion).trim();
      if (!name) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, params }),
      });

      if (res.status === 401) {
        // Not signed in → send them to sign in then back here
        const cb = encodeURIComponent(window.location.href);
        window.location.href = `/api/auth/signin?callbackUrl=${cb}`;
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setStatus("error");
        console.error("[SaveView] server error:", data);
      } else {
        setStatus("saved");
      }
    } catch (e) {
      console.error("[SaveView] error", e);
      setStatus("error");
    } finally {
      setSaving(false);
      // Clear "Saved" indicator after a short moment
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-neutral-700"
        title="Save these filters as a quick view"
      >
        {saving ? "Saving…" : "Save View"}
      </button>

      {status === "saved" && (
        <span className="text-xs font-medium text-emerald-400">Saved ✓</span>
      )}
      {status === "error" && (
        <span className="text-xs font-medium text-red-400">Couldn’t save</span>
      )}
    </div>
  );
}
