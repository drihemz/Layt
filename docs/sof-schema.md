# SOF Extraction Schema (Internal)

This document defines the normalized JSON contract for Statement of Facts (SOF) extraction returned by our `/api/sof-extract` proxy. All OCR and parsing stays inside our infra; PDFs are not sent to third parties.

## Top-level shape
- `events`: `SofEvent[]` — normalized event rows.
- `filtered_out`: `SofEvent[]` — optional list of low-confidence rows (kept in `events` too, but flagged).
- `summary`: `SofSummary | null` — header data inferred from the SOF.
- `warnings`: `string[]` — proxy-level warnings (e.g., OCR timeout).
- `error`: `string` — set when the request fails.
- `meta`: `SofMeta` — counts, timing, confidence thresholds.
- `raw`: `unknown` — optional passthrough from OCR service for debugging.

## Event shape (`SofEvent`)
- `id?: string` — stable ID when stored; absent for new extracts.
- `event: string` — cleaned label/title.
- `from_datetime?: string` — ISO start time with date (`YYYY-MM-DDTHH:mm[:ss]`).
- `to_datetime?: string` — ISO end time with date; rolled +24h if end < start.
- `event_type?: "instant" | "duration"` — derived from presence of duration keywords or differing start/end.
- `page?: number` — 1-based page number in the PDF.
- `line?: number` — 1-based line index in the OCR output.
- `bbox?: SofBoundingBox` — bounding box for overlays.
- `confidence?: number` — OCR confidence 0–1; used for filtering.
- `warnings?: string[]` — per-row issues (missing time, low confidence, etc.).
- `notes?: string | null` — original text or user notes.
- `raw_label?: string` — unstripped label from OCR (debugging).

## Summary shape (`SofSummary`)
- `port_name?: string | null`
- `terminal?: string | null` — only from explicit “Terminal:” style lines; single-word noise is dropped.
- `vessel_name?: string | null`
- `imo?: string | null`
- `cargo_name?: string | null`
- `cargo_quantity?: string | number | null` — best MT/ton figure seen.
- `laycan_start?: string | null` — ISO date.
- `laycan_end?: string | null` — ISO date.
- `operation_type?: string | null` — `"load"` or `"discharge"` when inferred.
- `raw?: unknown` — passthrough of any service-provided header.

## Bounding box (`SofBoundingBox`)
- `x: number`, `y: number`, `width: number`, `height: number` — pixel coordinates relative to the rendered page used for overlays.

## Meta (`SofMeta`)
- `sourcePages?: number` — PDF page count.
- `durationMs?: number` — OCR processing time if available.
- `filteredOutCount?: number` — how many rows were flagged for low confidence.
- `confidenceFloor?: number` — threshold applied to classify low confidence.

## Example (abridged)
```json
{
  "events": [
    {
      "event": "NOR tendered",
      "from_datetime": "2024-02-01T07:30:00",
      "to_datetime": "2024-02-01T07:30:00",
      "event_type": "instant",
      "page": 1,
      "line": 12,
      "bbox": { "x": 120, "y": 420, "width": 340, "height": 28 },
      "confidence": 0.82,
      "warnings": []
    }
  ],
  "filtered_out": [],
  "summary": {
    "port_name": "Port of Santos",
    "terminal": "Terminal XYZ",
    "vessel_name": "MV SAMPLE",
    "cargo_quantity": "58000 MT",
    "operation_type": "load"
  },
  "meta": { "sourcePages": 3, "confidenceFloor": 0.35 }
}
```
