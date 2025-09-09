"use client";
import { useState } from "react";
export default function SaveViewButton({ name, params }:{ name?: string; params: any }){
  const [ok,setOk]=useState<string>("");
  const [busy,setBusy]=useState(false);
  async function save(){
    setOk(""); setBusy(true);
    try{
      const res = await fetch("/api/views", { method:"POST", headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: name||'Saved Board', params }) });
      const j= await res.json();
      setOk(j?.ok ? "Saved!" : "Failed");
    }catch{ setOk("Failed"); } finally{ setBusy(false); }
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={save} disabled={busy}
        className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-60">
        {busy? "Saving..." : "Save view"}
      </button>
      {ok && <span className="text-xs text-neutral-600 dark:text-neutral-400">{ok}</span>}
    </div>
  );
}