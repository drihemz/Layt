"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SofResult = {
  name: string;
  status: "pending" | "processing" | "ok" | "error";
  message?: string;
  summary?: any;
  eventsCount?: number;
  filteredCount?: number;
  raw?: any;
};

// Default to the local proxy to avoid CORS issues with the upstream OCR service.
const envEndpoint =
  process.env.NEXT_PUBLIC_SOF_OCR_ENDPOINT ||
  process.env.SOF_OCR_ENDPOINT ||
  "";
const defaultEndpoint = envEndpoint || "/api/sof-extract";

const defaultFloor = process.env.SOF_CONFIDENCE_FLOOR || "0.35";

export default function SofBatchUpload() {
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [floor, setFloor] = useState(defaultFloor);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<SofResult[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalizedEndpoint = useMemo(() => {
    if (!endpoint) return "";
    // If using local proxy, keep as-is
    if (endpoint.startsWith("/api/sof-extract")) return endpoint;
    // Otherwise, append /extract if missing
    return endpoint.includes("/extract") ? endpoint : `${endpoint.replace(/\/+$/, "")}/extract`;
  }, [endpoint]);

  const runBatch = async () => {
    if (!files.length) {
      setResults([{ name: "No files selected", status: "error", message: "Add PDFs first." }]);
      return;
    }
    setRunning(true);
    setResults(files.map((f) => ({ name: f.name, status: "pending" as const })));

    const floorNum = Number(floor || 0.35) || 0.35;
    const updated: SofResult[] = [];

    for (const file of files) {
      const current: SofResult = { name: file.name, status: "processing" };
      updated.push(current);
      setResults([
        ...updated,
        ...files.slice(updated.length).map((f) => ({ name: f.name, status: "pending" as const })),
      ]);

      try {
        const form = new FormData();
        form.append("file", file);
        const controller = new AbortController();
        // Allow up to 5 minutes per file to avoid aborting large scans
        const id = setTimeout(() => controller.abort(), 300_000);

        const res = await fetch(normalizedEndpoint, {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        clearTimeout(id);

        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          json = null;
        }
        if (!res.ok || !json) {
          current.status = "error";
          current.message = (json && json.error) || text || res.statusText || "Failed";
          continue;
        }
        const events = Array.isArray(json.events) ? json.events : [];
        const filtered = Array.isArray(json.filtered_out) ? json.filtered_out : [];
        current.status = "ok";
        current.eventsCount = events.length;
        current.filteredCount = filtered.length;
        current.summary = json.summary || null;
        current.raw = json;
      } catch (err: any) {
        current.status = "error";
        current.message = err?.message || "Failed";
      }
      setResults([
        ...updated,
        ...files.slice(updated.length).map((f) => ({ name: f.name, status: "pending" as const })),
      ]);
    }

    setRunning(false);
  };

  const downloadAll = () => {
    const ok = results.filter((r) => r.status === "ok" && r.raw);
    if (!ok.length) return;
    const payload = ok.map((r) => ({ file: r.name, ...r.raw }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sof-batch.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadOne = (r: SofResult) => {
    if (!r.raw) return;
    const blob = new Blob([JSON.stringify(r.raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.name.replace(/\\.pdf$/i, "")}-sof.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bulk SOF Upload</p>
          <h2 className="text-lg font-semibold text-slate-900">Extract multiple SOFs via OCR service</h2>
          <p className="text-xs text-slate-500">Super Admin only · Uses the configured OCR endpoint</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={running}>
            Select PDFs
          </Button>
          <Button size="sm" onClick={runBatch} disabled={running || !files.length || !normalizedEndpoint}>
            {running ? "Processing..." : "Run batch"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">OCR endpoint</label>
          <Input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://sof-extract.onrender.com"
            className="bg-white"
          />
          <p className="text-[11px] text-slate-500">Defaults to local proxy (/api/sof-extract) to avoid CORS; if pointing directly to the OCR host, add /extract.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Confidence floor</label>
          <Input
            type="number"
            step="0.01"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            className="bg-white"
          />
          <p className="text-[11px] text-slate-500">Rows below this confidence are reported in filtered_out.</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Files selected</label>
          <div className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 h-20 overflow-y-auto">
            {files.length === 0 ? "None" : files.map((f) => <div key={f.name}>{f.name}</div>)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const sel = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
            setFiles(sel);
            setResults([]);
          }}
        />
        <p className="text-xs text-slate-500">Supported: PDF. Processed sequentially with a 180s timeout each.</p>
        <Button variant="ghost" size="sm" onClick={downloadAll} disabled={!results.some((r) => r.raw)}>
          Download all JSON
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg divide-y">
        {results.length === 0 ? (
          <p className="p-3 text-sm text-slate-500">No runs yet.</p>
        ) : (
          results.map((r, idx) => (
            <div key={`${r.name}-${idx}`} className="p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                <p className="text-xs text-slate-500">
                  {r.status === "ok"
                    ? `Events: ${r.eventsCount || 0} · Filtered: ${r.filteredCount || 0} · Summary: ${r.summary ? "yes" : "no"}`
                    : r.status === "pending"
                    ? "Pending..."
                    : r.message || "Failed"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2 py-1 rounded-full border ${
                    r.status === "ok"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r.status === "processing"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : r.status === "pending"
                      ? "bg-slate-50 text-slate-600 border-slate-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {r.status.toUpperCase()}
                </span>
                {r.raw && (
                  <Button variant="ghost" size="sm" onClick={() => downloadOne(r)}>
                    Download
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
