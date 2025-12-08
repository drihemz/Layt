"use client";

import { useEffect, useMemo, useState } from "react";
import { canonicalMappings, SofMapping } from "@/lib/sof-mapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type BatchEntry = {
  file: string;
  events?: any[];
  filtered_out?: any[];
  summary?: any;
};

type ParsedMappingInput = { canonical: string; keywords: string[]; confidence?: number; label?: string };

export default function SofMapperAdminPage() {
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [unmapped, setUnmapped] = useState<{ label: string; count: number }[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [proposed, setProposed] = useState<ParsedMappingInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unmappedDb, setUnmappedDb] = useState<{ label: string; count: number; last_seen_at?: string }[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ id: string; label: string; keywords: string; confidence: string }>({
    id: "",
    label: "",
    keywords: "",
    confidence: "0.7",
  });

  const mappingList = useMemo(() => canonicalMappings, []);
  const [dbMappings, setDbMappings] = useState<SofMapping[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const res = await fetch("/api/admin/sof-mapping");
        const json = await res.json();
        if (json?.mappings) setDbMappings(json.mappings);
      } catch (e) {
        // ignore, fallback to static
      }
    };
    fetchMappings();
    const fetchUnmapped = async () => {
      try {
        const res = await fetch("/api/admin/sof-unmapped");
        const json = await res.json();
        if (json?.unmapped) setUnmappedDb(json.unmapped);
      } catch (e) {
        // ignore
      }
    };
    fetchUnmapped();
  }, []);

  const handleBatchFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list: BatchEntry[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.files)
        ? parsed.files
        : [];
      setBatchEntries(list);
      const unmappedMap: Record<string, number> = {};
      list.forEach((entry) => {
        const evs = [...(entry.events || []), ...(entry.filtered_out || [])];
        evs.forEach((ev) => {
          if (!ev.canonical_event) {
            const label = ev.event || ev.deduction_name || ev.notes || "Unknown";
            if (!label) return;
            const key = label.toString().trim();
            if (!key) return;
            unmappedMap[key] = (unmappedMap[key] || 0) + 1;
          }
        });
      });
      const unmappedList = Object.entries(unmappedMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
      setUnmapped(unmappedList);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to parse batch JSON");
    }
  };

  const handleProposed = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const list: ParsedMappingInput[] = Array.isArray(parsed)
        ? parsed
        : parsed.events && Array.isArray(parsed.events)
        ? parsed.events
        : [];
      setProposed(
        list.map((p) => ({
          canonical: p.canonical || (p as any).id || "",
          keywords: p.keywords || [],
          confidence: p.confidence ?? undefined,
          label: p.label,
        }))
      );
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Invalid JSON");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">SOF Mapping & Parser Admin</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Load SOF Batch JSON</h2>
          <Input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBatchFile(file);
            }}
          />
          <p className="text-xs text-slate-500">
            Upload a `sof-batch*.json` to review mapped/unmapped events and summaries.
          </p>
          {batchEntries.length > 0 && (
            <div className="text-sm text-slate-700">
              Loaded {batchEntries.length} files. Unmapped labels: {unmapped.length}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Bulk Add/Preview Canonical Events</h2>
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste JSON array like [{"id":"NAV_EOSP","label":"...","keywords":["..."]}]'
            className="min-h-[160px]"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleProposed}>
              Preview
            </Button>
            {proposed.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/admin/sof-mapping", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(
                        proposed.map((p) => ({
                          id: p.canonical,
                          label: p.label || p.canonical,
                          keywords: p.keywords,
                          confidence: p.confidence,
                        }))
                      ),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json?.error || "Failed to save mappings");
                    const refresh = await fetch("/api/admin/sof-mapping").then((r) => r.json()).catch(() => null);
                    if (refresh?.mappings) setDbMappings(refresh.mappings);
                  } catch (e: any) {
                    setError(e?.message || "Save failed");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to DB"}
              </Button>
            )}
          </div>
          {proposed.length > 0 && (
            <div className="text-sm text-slate-700">
              Proposed: {proposed.length} items
              <ul className="mt-2 space-y-1">
                {proposed.map((p, i) => (
                  <li key={`${p.canonical}-${i}`} className="text-xs text-slate-600">
                    <span className="font-semibold">{p.canonical}</span> — keywords: {p.keywords.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Current Canonical Events</h2>
        <div className="space-y-2 max-h-[360px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
          {(dbMappings || mappingList).map((m: SofMapping, idx) => {
            const canonicalId = (m as any).canonical || (m as any).id || m.canonical;
            const label = (m as any).label || canonicalId;
            const keywords = (m.keywords || []).map((k: any) =>
              typeof k === "string" ? k : k?.source ? `/${k.source}/` : k?.toString()
            );
            const keywordStr = keywords.join(", ");
            return (
              <div key={`${canonicalId}-${idx}`} className="py-2 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {canonicalId || "—"}{" "}
                      {label && label !== canonicalId ? <span className="text-xs text-slate-500">({label})</span> : null}
                    </div>
                    <div className="text-[11px] text-slate-600">Confidence: {Math.round((m.confidence || 0) * 100)}%</div>
                  </div>
                  {dbMappings && (
                    <div className="flex items-center gap-2">
                      <Dialog
                        open={editOpen && editForm.id === canonicalId}
                        onOpenChange={(open) => {
                          setEditOpen(open);
                          if (open) {
                            setEditForm({
                              id: canonicalId,
                              label: label || canonicalId,
                              keywords: keywordStr,
                              confidence: String(m.confidence ?? 0.7),
                            });
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="xs" variant="outline">
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Mapping: {canonicalId}</DialogTitle>
                            <DialogDescription className="sr-only">
                              Edit label, keywords, and confidence for the canonical event.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Label</Label>
                              <Input
                                value={editForm.label}
                                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Keywords (comma separated)</Label>
                              <Textarea
                                value={editForm.keywords}
                                onChange={(e) => setEditForm((f) => ({ ...f, keywords: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-slate-600">Confidence (0-1)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editForm.confidence}
                                onChange={(e) => setEditForm((f) => ({ ...f, confidence: e.target.value }))}
                              />
                            </div>
                          </div>
                          <DialogFooter className="flex justify-end gap-2">
                            <DialogClose asChild>
                              <Button variant="ghost" size="sm">
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              size="sm"
                              onClick={async () => {
                                const kw = editForm.keywords
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const conf = Number(editForm.confidence) || 0.7;
                                setSaving(true);
                                setError(null);
                                try {
                                  const res = await fetch("/api/admin/sof-mapping", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify([
                                      { id: canonicalId, label: editForm.label || canonicalId, keywords: kw, confidence: conf },
                                    ]),
                                  });
                                  const json = await res.json();
                                  if (!res.ok) throw new Error(json?.error || "Save failed");
                                  setDbMappings((prev) =>
                                    (prev || []).map((x) =>
                                      (x as any).canonical === canonicalId || (x as any).id === canonicalId
                                        ? { ...x, label: editForm.label || canonicalId, keywords: kw, confidence: conf }
                                        : x
                                    )
                                  );
                                  setEditOpen(false);
                                } catch (e: any) {
                                  setError(e?.message || "Save failed");
                                } finally {
                                  setSaving(false);
                                }
                              }}
                            >
                              Save
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={async () => {
                              if (!confirm(`Delete mapping ${canonicalId}?`)) return;
                              setDeleteLoading(canonicalId);
                              try {
                                const res = await fetch(`/api/admin/sof-mapping?id=${encodeURIComponent(canonicalId)}`, { method: "DELETE" });
                                const json = await res.json();
                                if (!res.ok) throw new Error(json?.error || "Delete failed");
                                setDbMappings((prev) =>
                                  (prev || []).filter((x) => (x as any).canonical !== canonicalId && (x as any).id !== canonicalId)
                                );
                              } catch (e: any) {
                                setError(e?.message || "Delete failed");
                              } finally {
                                setDeleteLoading(null);
                              }
                            }}
                            disabled={deleteLoading === canonicalId}
                          >
                            {deleteLoading === canonicalId ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      )}
                    </div>
                <div className="text-xs text-slate-700 mt-1">Keywords: {keywordStr}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="unmapped-batch" className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <TabsList className="mb-3">
          <TabsTrigger value="unmapped-batch">Unmapped (Batch Upload)</TabsTrigger>
          <TabsTrigger value="unmapped-db">Unmapped (DB)</TabsTrigger>
        </TabsList>
        <TabsContent value="unmapped-batch">
          <div className="space-y-2 max-h-[320px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
            {unmapped.length === 0 ? (
              <p className="text-sm text-slate-600">No batch loaded or all events mapped.</p>
            ) : (
              unmapped.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-800">{item.label}</span>
                  <span className="text-xs text-slate-500">Count: {item.count}</span>
                </div>
              ))
            )}
          </div>
          {unmapped.length > 0 && (
            <div className="pt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(unmapped, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "unmapped-batch.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export JSON
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="unmapped-db">
          <div className="space-y-2 max-h-[320px] overflow-y-auto border rounded-lg p-3 bg-slate-50">
            {unmappedDb.length === 0 ? (
              <p className="text-sm text-slate-600">No unmapped labels stored.</p>
            ) : (
              unmappedDb.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-800">{item.label}</span>
                  <span className="text-xs text-slate-500">
                    Count: {item.count}
                    {item.last_seen_at ? ` · Last: ${new Date(item.last_seen_at).toLocaleString()}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
          {unmappedDb.length > 0 && (
            <div className="pt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(unmappedDb, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "unmapped-db.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export JSON
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (!confirm("Clear all unmapped labels?")) return;
                  setSaving(true);
                  try {
                    const res = await fetch("/api/admin/sof-unmapped", { method: "DELETE" });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json?.error || "Failed to clear");
                    setUnmappedDb([]);
                  } catch (e: any) {
                    setError(e?.message || "Failed to clear");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Clear unmapped (DB)
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
