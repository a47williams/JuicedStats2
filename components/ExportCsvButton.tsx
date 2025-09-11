// components/ExportCsvButton.tsx
"use client";

export default function ExportCsvButton({ rows }: { rows: any[] }) {
  function download() {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "juicedstats.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
      title="Export table to CSV"
    >
      Export CSV
    </button>
  );
}
