"use client";

import React, { useEffect, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SofExtractResult } from "@/lib/sof-extractor";

export type SofExtractorTabProps = {
  claim: any;
  events: any[];
  attachments: any[];
  onApplySummary?: (fields: Record<string, any>) => Promise<string | void> | string | void;
  onAttachmentAdded?: (att: any) => void;
  onPortCallCreated?: (payload: { port_call: any; events?: any[]; claim?: any }) => void;
  timeFormat: "dhms" | "decimal";
  formatDate: (value: any) => string;
  formatHours: (hours: number, mode: "dhms" | "decimal") => string;
  durationHours: (from: any, to: any, rate: number) => number;
  SofExtractorPanel: React.ComponentType<{
    claimId?: string;
    onResult?: (r: SofExtractResult) => void;
    onError?: (msg: string) => void;
    onAttachmentAdded?: (att: any) => void;
  }>;
};

export default function SofExtractorTab(props: SofExtractorTabProps) {
  const { claim, events, attachments, timeFormat, formatDate, formatHours, durationHours, SofExtractorPanel } = props;
  const { onApplySummary, onAttachmentAdded, onPortCallCreated } = props;

  const sofFiles = attachments
    .filter((a) => a.attachment_type?.toLowerCase() === "sof")
    .map((a) => ({ ...a, effective_url: (a as any).signed_url || a.file_url }));

  const sortedEvents = [...events].sort((a, b) => new Date(a.from_datetime).getTime() - new Date(b.from_datetime).getTime());

  const [extracted, setExtracted] = useState<SofExtractResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingEvents, setEditingEvents] = useState<any[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ event: "", from: "", to: "", rate: "", page: "" });
  const [selectedEventKey, setSelectedEventKey] = useState<string | number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [renderDims, setRenderDims] = useState<{ w: number; h: number; scale: number } | null>(null);
  const [pdfReady, setPdfReady] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [pcStatus, setPcStatus] = useState<string | null>(null);
  const [pcLoading, setPcLoading] = useState(false);

  const portCalls = Array.isArray(claim?.port_calls) ? claim.port_calls : [];
  const filteredOutCount = (extracted as any)?.meta?.filteredOutCount || 0;
  const confidenceFloor = (extracted as any)?.meta?.confidenceFloor;
  const filteredOut = (extracted as any)?.filtered_out || [];

  const baseEvents = extracted
    ? showLowConfidence
      ? [...(extracted.events || []), ...filteredOut]
      : extracted.events || []
    : sortedEvents;

  const toLocalInput = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const updateEvent = (idx: number, patch: Record<string, any>) => {
    setEditingEvents((prev) => prev.map((ev, i) => (i === idx ? { ...ev, ...patch } : ev)));
  };

  const applyNewEvent = () => {
    if (!newEvent.event.trim()) return;
    const fromIso = newEvent.from ? new Date(newEvent.from).toISOString() : null;
    const toIso = newEvent.to ? new Date(newEvent.to).toISOString() : fromIso;
    const pageVal = newEvent.page ? Number(newEvent.page) : activePage || 1;
    setEditingEvents((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        event: newEvent.event.trim(),
        from_datetime: fromIso,
        to_datetime: toIso,
        rate_of_calculation: newEvent.rate === "" ? null : Number(newEvent.rate),
        warnings: ["Manual entry"],
        event_type: fromIso && toIso && fromIso !== toIso ? "duration" : "instant",
        page: pageVal,
      },
    ]);
    setNewEvent({ event: "", from: "", to: "", rate: "", page: pageVal ? String(pageVal) : "" });
    setShowAddForm(false);
  };

  useEffect(() => {
    if (!editMode && baseEvents) {
      setEditingEvents(baseEvents);
    }
  }, [extracted, showLowConfidence, editMode, events.length]);

  const displayedEvents = editMode ? editingEvents : baseEvents;

  const deleteEventAt = (idx: number) => {
    setEditingEvents((prev) => prev.filter((_, i) => i !== idx));
  };

  const summary = extracted?.summary || null;

  const handleApplySummary = async () => {
    if (!summary || !onApplySummary) return;
    const payload: Record<string, any> = {};
    const portText = summary.port_name || (summary as any).port || summary.terminal;
    if (portText) payload.port_name = portText;

    const laycanStart = (summary as any).laycan_start || (summary as any).laycanStart;
    const laycanEnd = (summary as any).laycan_end || (summary as any).laycanEnd;
    if (laycanStart) payload.laycan_start = laycanStart;
    if (laycanEnd) payload.laycan_end = laycanEnd;

    const op = summary.operation_type || (summary as any).activity;
    if (op && typeof op === "string") {
      const lower = op.toLowerCase();
      if (lower.includes("dis")) payload.operation_type = "discharge";
      else if (lower.includes("load")) payload.operation_type = "load";
    }

    if (Object.keys(payload).length === 0) {
      setSummaryStatus("No mappable fields in SOF header.");
      return;
    }

    const confirmMsg = `Apply SOF header to claim?\nPort: ${payload.port_name || "—"}\nLaycan: ${payload.laycan_start || "—"} → ${payload.laycan_end || "—"}`;
    const ok = typeof window === "undefined" ? true : window.confirm(confirmMsg);
    if (!ok) return;

    setSummaryStatus("Applying...");
    try {
      const res = await onApplySummary(payload);
      setSummaryStatus(res || "SOF header applied to claim");
    } catch (err: any) {
      setSummaryStatus(err?.message || "Failed to apply header");
    }
  };

  // derive page dimensions from bboxes so we can scale overlays
  const pageDims = React.useMemo(() => {
    const dims: Record<number, { w: number; h: number }> = {};
    (baseEvents || []).forEach((ev: any) => {
      const p = ev.page ?? ev.page_number ?? ev.page_index ?? ev.pageIndex ?? ev.source_page ?? ev.pageNo ?? null;
      if (!p || !ev.bbox) return;
      const w = (ev.bbox.x || 0) + (ev.bbox.width || 0);
      const h = (ev.bbox.y || 0) + (ev.bbox.height || 0);
      const prev = dims[p] || { w: 0, h: 0 };
      dims[p] = { w: Math.max(prev.w, w), h: Math.max(prev.h, h) };
    });
    return dims;
  }, [baseEvents, showLowConfidence]);

  const selectedEvent =
    displayedEvents.find(
      (ev: any, idx: number) =>
        selectedEventKey === (ev.id || `${ev.page || "ext"}-${ev.line || idx}`)
    ) || null;

  const handleSaveToClaim = async () => {
    if (!claim?.id) return;
    setSaving(true);
    setSaveStatus(null);
    const payload = editingEvents.map((ev: any, idx: number) => ({
      deduction_name: ev.deduction_name || ev.event,
      from_datetime: ev.from_datetime || ev.start,
      to_datetime: ev.to_datetime || ev.end,
      rate_of_calculation: ev.rate_of_calculation ?? ev.ratePercent ?? 100,
      port_call_id: ev.port_call_id ?? null,
      row_order: idx + 1,
    })).filter((ev: any) => ev.deduction_name && ev.from_datetime && ev.to_datetime);

    try {
      const res = await fetch(`/api/claims/${claim.id}/events`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: payload }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      const j = await res.json();
      setSaveStatus("Saved to claim events");
      if (j.events) {
        setEditingEvents(j.events);
        setExtracted((prev) => (prev ? { ...prev, events: j.events } : { events: j.events } as any));
      }
    } catch (err: any) {
      console.error("Save SOF events failed", err);
      setSaveStatus(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePortCall = async () => {
    if (!claim?.id || !summary) return;
    setPcLoading(true);
    setPcStatus(null);
    const payload = {
      summary,
      events: editingEvents,
    };
    try {
      const res = await fetch(`/api/claims/${claim.id}/port-call-from-sof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create port call");
      setPcStatus("Port call created from SOF and events saved.");
      if (onPortCallCreated) onPortCallCreated(json);
    } catch (err: any) {
      console.error("Create port call from SOF failed", err);
      setPcStatus(err?.message || "Failed to create port call");
    } finally {
      setPcLoading(false);
    }
  };

  // Render PDF page via pdfjs to allow aligned overlays
  useEffect(() => {
    const url = (sofFiles[0] as any)?.effective_url;
    if (!url) return;
    let cancelled = false;
    const doRender = async () => {
      try {
        const loadPdfJs = () =>
          new Promise<void>((resolve, reject) => {
            if (typeof window === "undefined") return reject(new Error("No window"));
            if ((window as any).pdfjsLib) return resolve();
            if ((window as any)["pdfjs-dist/build/pdf"]) return resolve();
            const script = document.createElement("script");
            script.src = "/pdfjs-dist/build/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.body.appendChild(script);
          });

        await loadPdfJs();
        const pdfjs: any = (window as any).pdfjsLib || (window as any)["pdfjs-dist/build/pdf"];
        if (pdfjs?.GlobalWorkerOptions) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/build/pdf.worker.min.js";
        }
        if (!pdfjs || typeof pdfjs.getDocument !== "function") {
          console.warn("pdfjsLib not ready, falling back");
          setRenderDims(null);
          setPdfReady(false);
          return;
        }

        const loadingTask = pdfjs.getDocument({ url, disableWorker: true });
        const pdf = await loadingTask.promise;
        const pageNum = Math.max(1, Math.min(activePage || 1, pdf.numPages));
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = canvasWrapperRef.current?.clientWidth || viewport.width;
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        setRenderDims({ w: scaledViewport.width, h: scaledViewport.height, scale });
        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
        if (cancelled) return;
        setPdfReady(true);
      } catch (err) {
        console.error("PDF render failed; fallback to iframe", err);
        setRenderDims(null);
        setPdfReady(false);
      }
    };
    doRender();
    return () => {
      cancelled = true;
    };
  }, [sofFiles, activePage]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">SOF extraction</p>
          <h2 className="text-2xl font-semibold text-slate-900">Statement of Facts</h2>
          <p className="text-xs text-slate-600">Summary up top; time-based events below. Upload to extract and reconcile.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditMode((v) => {
                if (v) {
                  setExtracted((prev) => ({ ...(prev || {}), events: editingEvents }));
                }
                return !v;
              });
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          >
            {editMode ? "Done editing" : "Edit SOF events"}
          </button>
          <button
            type="button"
            onClick={handleSaveToClaim}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save to claim events"}
          </button>
          {summary && (
            <button
              type="button"
              onClick={handleCreatePortCall}
              disabled={pcLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
            >
              {pcLoading ? "Creating port call..." : "Create port call from SOF"}
            </button>
          )}
          <SofExtractorPanel
            claimId={claim?.id}
            onAttachmentAdded={onAttachmentAdded}
            onResult={(r) => {
              setExtracted(r);
              setExtractError(r.error || null);
              setEditMode(false);
              setEditingEvents(r.events || []);
            }}
            onError={(msg) => setExtractError(msg)}
          />
        </div>
      </div>
      {saveStatus && <p className="text-[11px] text-slate-600 text-right">{saveStatus}</p>}
      {pcStatus && <p className="text-[11px] text-slate-600 text-right">{pcStatus}</p>}

      {summary && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-emerald-800">Extracted header</p>
              <h3 className="text-lg font-semibold text-slate-900">Port · Vessel · Cargo · Laycan</h3>
              <p className="text-[11px] text-emerald-900/80">Review and apply to claim header if correct.</p>
            </div>
            {onApplySummary && (
              <button
                type="button"
                onClick={handleApplySummary}
                className="text-xs px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
              >
                Apply to claim
              </button>
            )}
          </div>
          <div className="grid md:grid-cols-4 gap-3 text-sm text-slate-900">
            <div>
              <p className="text-[11px] text-slate-600 uppercase tracking-wide">Port</p>
              <p className="font-semibold">
                {summary.port_name || (summary as any).port || summary.terminal || "—"}
              </p>
              {summary.terminal && <p className="text-[11px] text-slate-600 mt-1">Terminal: {summary.terminal}</p>}
            </div>
            <div>
              <p className="text-[11px] text-slate-600 uppercase tracking-wide">Vessel</p>
              <p className="font-semibold">{summary.vessel_name || "—"}</p>
              {summary.imo && <p className="text-[11px] text-slate-600 mt-1">IMO: {summary.imo}</p>}
            </div>
            <div>
              <p className="text-[11px] text-slate-600 uppercase tracking-wide">Cargo</p>
              <p className="font-semibold">
                {summary.cargo_name || "—"}
                {summary.cargo_quantity ? ` · ${summary.cargo_quantity}` : ""}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-600 uppercase tracking-wide">Laycan</p>
              <p className="font-semibold">
                {summary.laycan_start ? formatDate(summary.laycan_start) : "—"}
                {summary.laycan_end ? ` → ${formatDate(summary.laycan_end)}` : ""}
              </p>
            </div>
          </div>
          {summaryStatus && <p className="text-[11px] text-slate-700">{summaryStatus}</p>}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Port call</p>
          <p className="text-sm text-slate-900">{claim?.port_name || portCalls?.[0]?.port_name || "Port not set"}</p>
          <p className="text-xs text-slate-600">Activity: {claim?.operation_type || portCalls?.[0]?.activity || "—"}</p>
          <p className="text-xs text-slate-600">
            Laycan: {claim?.laycan_start ? formatDate(claim.laycan_start) : "—"} {claim?.laycan_end ? `→ ${formatDate(claim.laycan_end)}` : ""}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Vessel / Voyage</p>
          <p className="text-sm text-slate-900">{claim?.voyages?.voyage_reference || "—"}</p>
          <p className="text-xs text-slate-600">Reversible: {claim?.reversible ? `Yes (${claim?.reversible_scope || "all ports"})` : "No"}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <p className="text-xs font-semibold text-slate-600">Cargo</p>
          <p className="text-sm text-slate-900">
            {claim?.voyages?.cargo_names?.name || "—"} {claim?.voyages?.cargo_quantity ? `· ${claim?.voyages?.cargo_quantity}` : ""}
          </p>
          <p className="text-xs text-slate-600">Term: {claim?.terms?.name || "—"}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
        <p className="text-sm font-semibold text-slate-800">SOF uploads</p>
        {sofFiles.length === 0 ? (
          <p className="text-xs text-slate-500">No SOF uploads yet. Add files from the workspace tab.</p>
        ) : (
          <ul className="text-sm text-slate-700 list-disc ml-4 space-y-1">
            {sofFiles.map((f) => (
              <li key={f.id}>
                <a className="text-ocean-700" href={(f as any).effective_url || f.file_url} target="_blank" rel="noreferrer">
                  {f.filename}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div
          className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm relative"
          onClick={() => {
            if (editMode) {
              setShowAddForm(true);
              setNewEvent((prev) => ({ ...prev, page: String(activePage || 1) }));
            }
          }}
        >
          <p className="text-sm font-semibold text-slate-800 mb-2">SOF preview</p>
          <p className="text-[10px] text-slate-500 mb-1">Renderer: {pdfReady ? "pdf.js (local)" : "iframe fallback"}</p>
          {sofFiles[0] ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden relative" ref={canvasWrapperRef}>
                  {editMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                    setShowAddForm((v) => !v);
                    setNewEvent((prev) => ({ ...prev, page: String(activePage || 1) }));
                  }}
                  className="absolute top-2 right-2 text-xs px-3 py-1 rounded-md bg-white/90 border border-slate-200 text-slate-700 hover:bg-white shadow-sm"
                >
                  {showAddForm ? "Close form" : "Add event from preview"}
                </button>
              )}
              {(sofFiles[0] as any).effective_url && (
                <a
                  href={(sofFiles[0] as any).effective_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute top-2 left-2 text-xs px-3 py-1 rounded-md bg-white/90 border border-slate-200 text-slate-700 hover:bg-white shadow-sm"
                >
                  Open in new tab
                </a>
              )}
              {(sofFiles[0] as any).effective_url ? (
                renderDims ? (
                  <div className="relative">
                    <canvas ref={canvasRef} className="w-full h-auto block" />
                    {selectedEvent &&
                      (selectedEvent.page ??
                        selectedEvent.page_number ??
                        selectedEvent.page_index ??
                        selectedEvent.pageIndex ??
                        selectedEvent.source_page ??
                        selectedEvent.pageNo) === activePage &&
                      selectedEvent.bbox &&
                      pageDims[activePage] && (
                        <div className="pointer-events-none absolute left-0 top-0" style={{ width: renderDims.w, height: renderDims.h }}>
                          {(() => {
                            const { bbox } = selectedEvent;
                            const dims = pageDims[activePage];
                            const style = {
                              left: `${(bbox.x / dims.w) * renderDims.w}px`,
                              top: `${(bbox.y / dims.h) * renderDims.h}px`,
                              width: `${(bbox.width / dims.w) * renderDims.w}px`,
                              height: `${(bbox.height / dims.h) * renderDims.h}px`,
                            };
                            return (
                              <div
                                className="absolute bg-emerald-300/30 border border-emerald-500/80 rounded-sm shadow-[0_0_0_1px_rgba(16,185,129,0.6)]"
                                style={style}
                              />
                            );
                          })()}
                        </div>
                      )}
                  </div>
                ) : (
                  <iframe
                    src={`${(sofFiles[0] as any).effective_url}${activePage ? `#page=${activePage}` : ""}`}
                    className="w-full h-[480px]"
                    title="SOF preview"
                  />
                )
              ) : (
                <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-100">
                  SOF file URL not available to preview. Open via link below.
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Upload a SOF file to preview and extract.</p>
          )}
          {editMode && showAddForm && (
            <div className="mt-3 space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">Add manual event (page {activePage || 1})</p>
              <input
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200 bg-white"
                placeholder="Event name"
                value={newEvent.event}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, event: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200 bg-white"
                  value={newEvent.from}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, from: e.target.value }))}
                />
                <input
                  type="datetime-local"
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200 bg-white"
                  value={newEvent.to}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, to: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={1}
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200 bg-white"
                  value={newEvent.page}
                  onChange={(e) => {
                    setNewEvent((prev) => ({ ...prev, page: e.target.value }));
                    const num = Number(e.target.value);
                    if (!Number.isNaN(num) && num > 0) setActivePage(num);
                  }}
                  placeholder="Page"
                />
                <input
                  type="number"
                  step="0.1"
                  className="w-24 rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200 bg-white"
                  value={newEvent.rate}
                  onChange={(e) => setNewEvent((prev) => ({ ...prev, rate: e.target.value }))}
                  placeholder="Rate %"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyNewEvent();
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-800">SOF timeline (time-related events only)</p>
          </div>
          {extractError && <p className="text-xs text-red-600 mb-2">Extraction error: {extractError}</p>}
          {extracted?.events?.length ? (
            <div className="mb-3 p-3 rounded-lg border border-emerald-100 bg-emerald-50 text-xs text-emerald-800">
              {extracted.events.length} extracted rows ready to review. Hover a row to see page/line notes.
            </div>
          ) : null}
          {filteredOutCount > 0 && (
            <div className="mb-3 p-3 rounded-lg border border-amber-100 bg-amber-50 text-[11px] text-amber-800">
              {filteredOutCount} rows were skipped for low confidence{confidenceFloor ? ` (< ${Math.round(confidenceFloor * 100)}%)` : ""}. You can fine-tune on the service side later.
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="show-low-confidence"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  checked={showLowConfidence}
                  onChange={(e) => setShowLowConfidence(e.target.checked)}
                />
                <label htmlFor="show-low-confidence" className="text-[11px] text-amber-800">
                  Show the low-confidence rows below
                </label>
              </div>
            </div>
          )}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>Counted</TableHead>
                  <TableHead>Warnings</TableHead>
                  {editMode && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-slate-500 py-6">
                      No events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedEvents.map((ev: any, idx: number) => {
                    const pageVal =
                      ev.page ?? ev.page_number ?? ev.page_index ?? ev.pageIndex ?? ev.source_page ?? ev.pageNo ?? null;
                    return (
                  <TableRow
                    key={ev.id || `${ev.page || "ext"}-${ev.line || idx}`}
                    title={ev.page || ev.line ? `Page ${ev.page || "?"}, line ${ev.line || "?"}` : undefined}
                    className={cn(
                      editMode ? "group relative cursor-pointer" : "cursor-pointer",
                      pageVal && Number(pageVal) === activePage ? "bg-ocean-50" : ""
                    )}
                    onClick={() => {
                      if (pageVal) setActivePage(Number(pageVal));
                      setSelectedEventKey(ev.id || `${ev.page || "ext"}-${ev.line || idx}`);
                    }}
                  >
                        <TableCell className="text-xs text-slate-500">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {editMode ? (
                            <input
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200"
                              value={ev.deduction_name || ev.event || ""}
                              onChange={(e) => updateEvent(idx, { event: e.target.value, deduction_name: e.target.value })}
                              placeholder="Event name"
                            />
                          ) : (
                            <>
                              {ev.deduction_name || ev.event || "—"}
                              {typeof ev.confidence === "number" && (
                                <span className="ml-2 text-[10px] text-slate-500">({Math.round(ev.confidence * 100)}%)</span>
                              )}
                              {ev.canonical_event && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                  {ev.canonical_event}
                                  {typeof ev.canonical_confidence === "number" && (
                                    <span className="ml-1 text-[9px] text-emerald-600">
                                      ({Math.round(ev.canonical_confidence * 100)}%)
                                    </span>
                                  )}
                                </span>
                              )}
                            </>
                          )}
                          {pageVal && <p className="text-[10px] text-slate-500 mt-0.5">Page {pageVal}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {editMode ? (
                            <input
                              type="datetime-local"
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200"
                              value={toLocalInput(ev.from_datetime || ev.start)}
                              onChange={(e) => updateEvent(idx, { from_datetime: e.target.value })}
                            />
                          ) : (
                            formatDate(ev.from_datetime || ev.start)
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {editMode ? (
                            <input
                              type="datetime-local"
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200"
                              value={toLocalInput(ev.to_datetime || ev.end)}
                              onChange={(e) => updateEvent(idx, { to_datetime: e.target.value })}
                            />
                          ) : (
                            formatDate(ev.to_datetime || ev.end)
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {editMode ? (
                            <input
                              type="number"
                              step="0.1"
                              className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ocean-200"
                              value={ev.rate_of_calculation ?? ev.ratePercent ?? ""}
                              onChange={(e) =>
                                updateEvent(idx, { rate_of_calculation: e.target.value === "" ? null : Number(e.target.value) })
                              }
                            />
                          ) : (
                            <>{ev.rate_of_calculation ?? ev.ratePercent ?? "—"}%</>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-900">
                          {formatHours(
                            ev.time_used ??
                              (ev.start && ev.end ? durationHours(ev.start, ev.end, ev.ratePercent || ev.rate_of_calculation || 100) : 0),
                            timeFormat
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-amber-700 space-y-1">
                          {(ev.warnings || []).length === 0
                            ? "—"
                            : (ev.warnings || []).map((w: string, i: number) => (
                                <div key={i} className="inline-block mr-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  {w}
                                </div>
                              ))}
                        </TableCell>
                        {editMode && (
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => deleteEventAt(idx)}
                              className="opacity-0 group-hover:opacity-100 transition text-xs text-rose-700 hover:text-rose-800"
                            >
                              Delete
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
