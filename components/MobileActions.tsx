// components/MobileActions.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type FindSpec = {
  id?: string;
  data?: string; // e.g. data-action="fetch"
  text?: RegExp; // matches button text content
};

function findButton(specs: FindSpec[]): HTMLButtonElement | null {
  for (const s of specs) {
    if (s.id) {
      const byId = document.getElementById(s.id);
      if (byId instanceof HTMLButtonElement) return byId;
    }
    if (s.data) {
      const byData = document.querySelector(
        `button[data-action="${s.data}"]`
      ) as HTMLButtonElement | null;
      if (byData) return byData;
    }
    if (s.text) {
      const all = Array.from(document.querySelectorAll("button"));
      const match = all.find((b) => s.text!.test(b.textContent || ""));
      if (match) return match as HTMLButtonElement;
    }
  }
  return null;
}

function useTargetButton(specs: FindSpec[]) {
  const [btn, setBtn] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    const update = () => setBtn(findButton(specs));
    update();

    // Watch for DOM changes that might add/replace buttons
    const mo = new MutationObserver(update);
    mo.observe(document.body, { childList: true, subtree: true });

    // Watch for attribute changes (e.g., disabled)
    const ao = new MutationObserver(update);
    if (btn) ao.observe(btn, { attributes: true });

    return () => {
      mo.disconnect();
      ao.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return btn;
}

export default function MobileActions() {
  // Locate your existing buttons in a robust way.
  const fetchBtn = useTargetButton([
    { id: "fetch-btn" },
    { data: "fetch" },
    { text: /fetch game logs/i },
  ]);

  const resetBtn = useTargetButton([
    { id: "reset-btn" },
    { data: "reset" },
    { text: /reset/i },
  ]);

  const saveBtn = useTargetButton([
    { id: "save-view-btn" },
    { data: "save-view" },
    { text: /save view/i },
  ]);

  // Derive disabled state from the actual fetch button
  const disabled = useMemo(() => {
    return fetchBtn ? fetchBtn.disabled : false;
  }, [fetchBtn?.disabled, fetchBtn]);

  const canSave = Boolean(saveBtn && !saveBtn.disabled);

  return (
    <>
      {/* Spacer so content isn’t hidden under the bar on mobile */}
      <div className="md:hidden h-16" aria-hidden />

      {/* Sticky bar — hidden on md+ */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60 md:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          {resetBtn && (
            <button
              type="button"
              onClick={() => resetBtn?.click()}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-200"
              aria-label="Reset filters"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchBtn?.click()}
            disabled={disabled}
            className={[
              "flex-1 rounded-lg px-4 py-3 text-sm font-semibold",
              disabled
                ? "bg-neutral-800 text-neutral-500"
                : "bg-amber-500 text-black hover:bg-amber-400",
            ].join(" ")}
            aria-label="Fetch Game Logs"
          >
            Fetch Game Logs
          </button>

          {saveBtn && (
            <button
              type="button"
              onClick={() => saveBtn?.click()}
              disabled={!canSave}
              className={[
                "rounded-lg px-3 py-2 text-sm",
                canSave
                  ? "border border-neutral-700 text-neutral-200"
                  : "border border-neutral-800 text-neutral-500",
              ].join(" ")}
              aria-label="Save view"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </>
  );
}
