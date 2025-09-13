// components/TeammateOutPicker.tsx
"use client";

import { useState } from "react";
import PlayerSearchBox from "@/components/PlayerSearchBox";

type PlayerLite = {
  id: string | number;
  full_name?: string;
  name?: string;
  team_abbreviation?: string;
  team?: string;
  pos?: string;
};

export default function TeammateOutPicker({
  valueId,
  onChange,
  className = "",
}: {
  valueId?: string | number | null;
  onChange: (v: { teammateId: string | number | null; maxMinutes: number }) => void;
  className?: string;
}) {
  const [teammate, setTeammate] = useState<PlayerLite | null>(null);
  const [text, setText] = useState("");
  const [maxMinutes, setMaxMinutes] = useState<number>(0);

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-neutral-400">When teammate is OUT</label>
      <div className="flex gap-2">
        <div className="flex-1">
          <PlayerSearchBox
            value={text}
            onChange={setText}
            onSelect={(p) => {
              setTeammate(p);
              onChange({ teammateId: p?.id ?? null, maxMinutes });
            }}
            placeholder="Search teammate…"
            className="w-full"
          />
        </div>
        <div className="w-36">
          <input
            type="number"
            min={0}
            step={1}
            value={maxMinutes}
            onChange={(e) => {
              const v = Number(e.target.value || 0);
              setMaxMinutes(v);
              onChange({ teammateId: teammate?.id ?? null, maxMinutes: v });
            }}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-700"
            aria-label="Count teammate as out if minutes ≤"
            title="Count teammate as out if minutes ≤"
          />
          <div className="mt-1 text-[11px] text-neutral-500">
            Count as out if ≤ minutes (default 0)
          </div>
        </div>
      </div>
    </div>
  );
}
