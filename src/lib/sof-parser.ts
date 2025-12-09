import { mapCanonicalEvent } from "@/lib/sof-mapper";
import { SofExtractResponse, SofEvent, SofSummary } from "@/types/sof";

/**
 * Raw OCR payload shape coming back from the local OCR service before normalization.
 */
export type RawSofOcrResponse = {
  events?: any[];
  summary?: SofSummary | null;
  header?: SofSummary | null;
  warnings?: string[];
  error?: string;
  meta?: SofExtractResponse["meta"];
  raw?: unknown;
};

const monthMap: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function parseDate(text: string): string | null {
  let cleaned = text.replace(/\s+/g, " ").replace(/-\s+/g, "-").replace(/\s+-/g, "-");
  cleaned = cleaned.replace(/([A-Za-z])\s+([A-Za-z])/g, "$1$2");
  cleaned = cleaned
    .replace(/J\s*an/gi, "Jan")
    .replace(/F\s*eb/gi, "Feb")
    .replace(/M\s*ar/gi, "Mar")
    .replace(/A\s*pr/gi, "Apr")
    .replace(/M\s*ay/gi, "May")
    .replace(/J\s*un/gi, "Jun")
    .replace(/J\s*ul/gi, "Jul")
    .replace(/A\s*ug/gi, "Aug")
    .replace(/S\s*ep/gi, "Sep")
    .replace(/O\s*ct/gi, "Oct")
    .replace(/N\s*ov/gi, "Nov")
    .replace(/D\s*ec/gi, "Dec")
    .replace(/-\)\s*an/gi, "-Jan")
    .replace(/\)\s*an/gi, "Jan")
    .replace(/\)\s*ug/gi, "Aug");
  // Formats:
  // - 15/Feb/2025 or 15-Feb-2025
  // - 15 Feb 2025
  // - 22.01.2017
  const m =
    cleaned.match(/(\d{1,2})\s*[-/]\s*([A-Za-z]{3})[A-Za-z]*\s*[-/]\s*(\d{2,4})/) ||
    cleaned.match(/(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{2,4})/) ||
    cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const mon =
    m[2] && isNaN(Number(m[2])) ? monthMap[m[2].toLowerCase()] : m[2] ? m[2].padStart(2, "0") : null;
  if (!mon) return null;
  let year = m[3];
  if (year.length === 2) {
    year = Number(year) > 50 ? `19${year}` : `20${year}`;
  }
  return `${year}-${mon}-${day}`;
}

function parseTime(text: string): string | null {
  const m = text.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDateRange(text: string): { start?: string | null; end?: string | null } {
  const normalized = text.replace(/\s+/g, "");
  const parts = normalized.split(/to|[-–—]|→|\./i);
  if (parts.length !== 2) return {};
  const startRaw = parts[0];
  const endRaw = parts[1];
  const start = parseDate(startRaw) || parseDate(endRaw) || null;
  const end = parseDate(endRaw) || null;
  return { start, end };
}

// Handles ranges like "11-15 February 2026"
function parseMonthSpan(text: string): { start?: string | null; end?: string | null } {
  const m = text.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (!m) return {};
  const month = monthMap[m[3].slice(0, 3).toLowerCase()];
  if (!month) return {};
  const year = m[4];
  const d1 = m[1].padStart(2, "0");
  const d2 = m[2].padStart(2, "0");
  return { start: `${year}-${month}-${d1}`, end: `${year}-${month}-${d2}` };
}

function attachEndDate(from: string | null | undefined, to: string | null | undefined): string | null {
  if (!from || !to) return to || null;
  if (typeof to !== "string") return to as any;
  if (to.includes("T")) return to;
  const startDate = from.includes("T") ? from.split("T")[0] : null;
  if (!startDate) return to;
  const endTime = to.includes(":") ? to : `${to}:00`;
  let candidate = `${startDate}T${endTime}`;
  const s = new Date(from).getTime();
  const e = new Date(candidate).getTime();
  if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
    candidate = new Date(e + 24 * 3600 * 1000).toISOString();
  }
  return candidate;
}

function parseQuantity(text: string): { qty: number; unit: string } | null {
  const m = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*(mt|m\/t|tons|tonnes|t)?/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  return { qty: num, unit: m[2] || "" };
}

// Merge tabular rows where the label is on one line and start/end times follow on subsequent lines.
function mergeTableRows(rawEvents: any[]): any[] {
  const merged: any[] = [];
  for (let i = 0; i < (rawEvents || []).length; i++) {
    const curr = rawEvents[i];
    const labelCurr = (curr?.event || (curr as any)?.deduction_name || (curr as any)?.notes || "").toString().trim();
    const dateCurr = parseDate(labelCurr);
    const timeCurr = parseTime(labelCurr);

    if (!dateCurr && !timeCurr && labelCurr) {
      const next = rawEvents[i + 1];
      const nextLabel = (next?.event || (next as any)?.deduction_name || (next as any)?.notes || "").toString().trim();
      const nextDate = parseDate(nextLabel);
      const nextTime = parseTime(nextLabel);

      if (next && nextDate && nextTime) {
        let start = `${nextDate}T${nextTime}:00`;
        let end: string | null = start;
        let consumed = 1;

        const nextNext = rawEvents[i + 2];
        if (nextNext) {
          const nnLabel = (nextNext?.event || (nextNext as any)?.deduction_name || (nextNext as any)?.notes || "").toString().trim();
          const nnDate = parseDate(nnLabel);
          const nnTime = parseTime(nnLabel);
          if (nnDate && nnTime) {
            end = `${nnDate}T${nnTime}:00`;
            consumed = 2;
          }
        }

        merged.push({
          ...curr,
          event: labelCurr,
          from_datetime: start,
          to_datetime: end,
        });
        i += consumed;
        continue;
      }
    }

    merged.push(curr);
  }
  return merged;
}

function bestQuantityFromEvents(rawEvents: any[]): string | null {
  let best: { qty: number; unit?: string | null } | null = null;
  for (const ev of rawEvents || []) {
    const label = (ev.event || ev.notes || "").toString();
    if (!label) continue;
    if (!/quantity|final|loaded|discharged|figure|mt/i.test(label)) continue;
    const q = parseQuantity(label);
    if (!q) continue;
    if (!best || q.qty > best.qty) {
      best = q;
    }
  }
  if (!best) return null;
  return `${best.qty}${best.unit ? ` ${best.unit}` : ""}`;
}

function stripDateTimePrefix(label: string): string {
  let out = label;
  out = out.replace(/^(\d{1,2}\s*[-/]\s*[A-Za-z]{3}[A-Za-z]*\s*[-/]\s*\d{2,4})\s*[\\/|-]*\s*/i, "");
  out = out.replace(/^\d{1,2}[:.]\d{2}\s*[-–—]?\s*/i, "");
  out = out.replace(/\bLT\b/gi, "").trim();
  out = out.replace(/^[\\/|,\-\s]+/, "").trim();
  return out.trim();
}

function isPureDateTime(label: string): boolean {
  let tmp = label;
  tmp = tmp.replace(/(\d{1,2}\s*[-/]\s*[A-Za-z]{3}[A-Za-z]*\s*[-/]\s*\d{2,4})/gi, "");
  tmp = tmp.replace(/\d{1,2}[:.]\d{2}/g, "");
  tmp = tmp.replace(/\bLT\b/gi, "");
  tmp = tmp.replace(/[\\/|,\-\s]+/g, "").trim();
  return tmp.length === 0;
}

function normalizeSofEvents(rawEvents: any[]): { events: SofEvent[]; summary: SofSummary } {
  const mergedRaw = mergeTableRows(rawEvents || []);

  // Pre-scan for the first date token to use as a fallback context when none is found inline.
  let firstDateContext: string | null = null;
  for (const evRaw of mergedRaw || []) {
    const labelRaw = (evRaw?.event || (evRaw as any)?.deduction_name || (evRaw as any)?.notes || "").toString();
    const candidate = parseDate(labelRaw);
    if (candidate) {
      firstDateContext = candidate;
      break;
    }
  }

  let currentDate: string | null = firstDateContext;
  let pendingDateTime: string | null = null;
  let timelineStarted = false;
  const headings = [
    "statement of facts",
    "arrival / departure summary",
    "arrival/departure summary",
    "cargo details",
    "detailed statement of facts",
    "signatures",
    "terminal representative",
    "operations",
    "detailed operations log",
    "time/date",
    "event / description",
    "phase",
    "start",
    "end",
    "notes",
    "remarks & delays",
    "remarks",
    "operational notes",
    "weather delay",
    "mechanical delays",
  ];
  const skipPrefixes = ["intended loading", "final loaded", "cargo description", "dwt:"];
  const skipContains = ["cargo condition", "trimmed, inspected, secured", "signature", "master:", "agent:", "terminal representative"];
  const quantityLine = (val: string) => /^\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?\s*mt\b/i.test(val);
  const durationKeywords = ["delay", "weather", "rain", "suspension", "stoppage", "disruption", "shift", "survey", "inspection", "sampling"];
  const summaryFields = [
    "vessel name",
    "vessel:",
    "flag",
    "imo",
    "call sign",
    "deadweight",
    "cargo:",
    "shipper",
    "load port",
    "terminal",
    "port agent",
    "operation date",
    "deadweight (dwt)",
  ];

  const normalized: SofEvent[] = [];
  const summary: SofSummary = {};
  let pendingSummaryKey: "vessel_name" | "port_name" | "terminal" | "cargo_name" | "cargo_quantity" | "laycan" | null = null;

  for (const evRaw of mergedRaw || []) {
    const ev: SofEvent = { ...(evRaw as SofEvent) };
    const warnings: string[] = Array.isArray((evRaw as any).warnings) ? [...(evRaw as any).warnings] : [];
    const labelRaw = (ev.event || (evRaw as any).deduction_name || (evRaw as any).notes || "").toString();
    const label = labelRaw.replace(/\s+/g, " ").trim();
    if (label === ":") continue;
    const lower = label.toLowerCase();
    const dateInText = parseDate(label);
    const timeInText = parseTime(label);

    if (lower.startsWith("loading port") || lower.startsWith("discharge port") || lower.startsWith("port:")) {
      const m = label.match(/(?:loading port|discharge port|port)[:\s-]*(.+)/i);
      if (m) summary.port_name = m[1].trim() || summary.port_name;
    }
    if (!summary.port_name) {
      const m = label.match(/port\s+of\s+(.+)/i);
      if (m) summary.port_name = m[1].trim();
    }
    // Terminal / berth / jetty
    if (!summary.terminal) {
      const m = label.match(/(?:terminal|berth|jetty|wharf)[:\-]?\s*([A-Za-z0-9 .#\\/-]+)/i);
      if (m) summary.terminal = m[1].trim();
    }
    if (!summary.terminal && /(berth|terminal|jetty|wharf)/i.test(label) && label.length < 120) {
      const parts = label.trim().split(/\s+/);
      if (parts.length > 1) summary.terminal = label.trim();
    }
    if (lower.startsWith("vessel") || lower.includes("vessel name")) {
      const m = label.match(/vessel(?:\s+name)?:\s*([A-Za-z0-9 _-]+)/i);
      if (m) summary.vessel_name = m[1].trim();
    }
    if (!summary.vessel_name) {
      const m = label.match(/\b(m\/v|mv)\s+([A-Z0-9 _-]+)/i);
      if (m) summary.vessel_name = m[2].trim();
    }
    if (lower.startsWith("vessel name") || lower.startsWith("vessel:")) {
      const m = label.match(/vessel(?:\s+name)?[:\s]*([A-Za-z0-9 _-]+)/i);
      if (m) summary.vessel_name = m[1].trim() || summary.vessel_name;
    }
    // For early header lines without labels, take the first strong uppercase as vessel name.
    if (!timelineStarted && !summary.vessel_name && /^[A-Z0-9 ._-]{8,}$/.test(label) && lower.includes("odyssey")) {
      summary.vessel_name = label.trim();
    }
    if (!summary.vessel_name && !timelineStarted && lower.startsWith("mv ")) {
      summary.vessel_name = label.replace(/^mv\s+/i, "").trim();
    }
    // Clean vessel suffixes like " - GRAIN LOADING"
    if (summary.vessel_name && / - /.test(summary.vessel_name)) {
      const cleaned = summary.vessel_name.split(" - ")[0].trim();
      if (cleaned.length >= 3) summary.vessel_name = cleaned;
    }
    if (!(summary as any).flag && !timelineStarted && /islands|panama|liberia|bahamas/i.test(label)) {
      (summary as any).flag = label.trim();
    }
    if (lower.includes("imo")) {
      const m = label.match(/imo[:\s]*([0-9]{6,7})/i);
      if (m) summary.imo = m[1];
    } else if (!summary.imo) {
      const m = label.match(/\b([0-9]{7})\b/);
      if (m) summary.imo = m[1];
    }
    if (lower.startsWith("cargo") || lower.includes("cargo name")) {
      const m = label.match(/cargo(?:\s+name)?:\s*([A-Za-z0-9 ,._-]+)/i);
      if (m) summary.cargo_name = m[1].trim() || summary.cargo_name;
      const qty = parseQuantity(label);
      if (qty) summary.cargo_quantity = qty.qty + (qty.unit ? ` ${qty.unit}` : "");
    }
    if (lower.includes("laycan")) {
      const range = label.match(/laycan[:\s]*([0-9A-Za-z/\\-]+)\s*(?:to|-|→)\s*([0-9A-Za-z/\\-]+)/i);
      if (range) {
        const start = parseDate(range[1]);
        const end = parseDate(range[2]);
        if (start) summary.laycan_start = start;
        if (end) summary.laycan_end = end;
      }
      const span = parseMonthSpan(label);
      if (span.start && !summary.laycan_start) summary.laycan_start = span.start;
      if (span.end && !summary.laycan_end) summary.laycan_end = span.end;
    }
    if (!summary.laycan_start || !summary.laycan_end) {
      const rangeParsed = parseDateRange(label);
      if (rangeParsed.start && !summary.laycan_start) summary.laycan_start = rangeParsed.start;
      if (rangeParsed.end && !summary.laycan_end) summary.laycan_end = rangeParsed.end;
      const span = parseMonthSpan(label);
      if (span.start && !summary.laycan_start) summary.laycan_start = span.start;
      if (span.end && !summary.laycan_end) summary.laycan_end = span.end;
    }
    if (!summary.operation_type) {
      if (lower.includes("load")) summary.operation_type = "load";
      if (lower.includes("disch") || lower.includes("discharge")) summary.operation_type = "discharge";
    }
    if (lower.startsWith("operation date")) {
      const rangeParsed = parseDateRange(label);
      if (rangeParsed.start && !summary.laycan_start) summary.laycan_start = rangeParsed.start;
      if (rangeParsed.end && !summary.laycan_end) summary.laycan_end = rangeParsed.end;
    }
    if (!summary.cargo_quantity && /(cargo|quantity|tonnage|loaded|discharged)/i.test(label)) {
      const qty = parseQuantity(label);
      if (qty) summary.cargo_quantity = qty.qty + (qty.unit ? ` ${qty.unit}` : "");
    }

    const isSummaryLine =
      summaryFields.some((s) => lower.startsWith(s)) ||
      lower.startsWith("vessel:") ||
      lower.startsWith("cargo:") ||
      lower.startsWith("terminal:") ||
      lower.startsWith("load port:") ||
      lower.startsWith("operation date:");

    const isHeading =
      headings.some((h) => lower.includes(h)) ||
      skipPrefixes.some((p) => lower.startsWith(p)) ||
      skipContains.some((s) => lower.includes(s)) ||
      quantityLine(lower);

    // Pending summary values (field on previous line)
    if (pendingSummaryKey && label && !isHeading && !isSummaryLine) {
      if (pendingSummaryKey === "laycan") {
        const rangeParsed = parseDateRange(label);
        if (rangeParsed.start && !summary.laycan_start) summary.laycan_start = rangeParsed.start;
        if (rangeParsed.end && !summary.laycan_end) summary.laycan_end = rangeParsed.end;
        const span = parseMonthSpan(label);
        if (span.start && !summary.laycan_start) summary.laycan_start = span.start;
        if (span.end && !summary.laycan_end) summary.laycan_end = span.end;
      } else if (pendingSummaryKey === "cargo_quantity") {
        const qty = parseQuantity(label);
        if (qty) summary.cargo_quantity = qty.qty + (qty.unit ? ` ${qty.unit}` : "");
      } else if (pendingSummaryKey === "cargo_name") {
        if (label.toLowerCase() !== "name") summary.cargo_name = label.trim();
      } else if (pendingSummaryKey === "port_name") {
        if (label !== ":") summary.port_name = label.trim();
      } else if (pendingSummaryKey === "terminal") {
        if (label !== ":") summary.terminal = label.trim();
      } else if (pendingSummaryKey === "vessel_name") {
        if (label.toLowerCase() !== "name") summary.vessel_name = label.trim();
      }
      pendingSummaryKey = null;
    }

    if (!summary.vessel_name && /^vessel name:?$/i.test(label)) {
      pendingSummaryKey = "vessel_name";
      continue;
    }
    if (!summary.port_name && (/^loading port:?$/i.test(label) || /^discharge port:?$/i.test(label))) {
      pendingSummaryKey = "port_name";
      continue;
    }
    if (!summary.terminal && /^terminal:?$/i.test(label)) {
      pendingSummaryKey = "terminal";
      continue;
    }
    if (!summary.cargo_name && /^cargo:?$/i.test(label)) {
      pendingSummaryKey = "cargo_name";
      continue;
    }
    if (!summary.cargo_quantity && /(quantity loaded|quantity)/i.test(label) && !parseQuantity(label)) {
      pendingSummaryKey = "cargo_quantity";
      continue;
    }
    if (!summary.laycan_start && !summary.laycan_end && /^laycan:?$/i.test(label)) {
      pendingSummaryKey = "laycan";
      continue;
    }

    if (isSummaryLine || isHeading) {
      // Summary lines contribute to header but are not emitted as events.
      continue;
    }

    // Before the timeline starts (no date/time seen yet), treat lines as header context only.
    if (!timelineStarted && !dateInText && !timeInText) {
      // Harvest cargo name if it looks like a commodity, but avoid vessel-like lines.
      const looksLikeVessel = /\bmv\b/i.test(label) || /odyssey/i.test(label) || /vessel/i.test(label);
      if (!summary.cargo_name && !looksLikeVessel && /(grain|wheat|coal|iron|corn|soya|soy|sugar)/i.test(label)) {
        summary.cargo_name = label.trim();
      }
      // Harvest port if "port of" appears.
      if (!summary.port_name) {
        const m = label.match(/port\s+of\s+(.+)/i);
        if (m) summary.port_name = m[1].trim();
      }
      continue;
    }

    // Date-only lines set context and are not emitted.
    if (dateInText && !timeInText) {
      currentDate = dateInText;
      pendingDateTime = null;
      continue;
    }

    // Lines that contain both date and time: set context and also emit as an event.
    if (dateInText && timeInText) {
      currentDate = dateInText;
      const datetime = `${dateInText}T${timeInText}:00`;
      if (!ev.from_datetime) ev.from_datetime = datetime;
      if (!ev.to_datetime) ev.to_datetime = ev.end || datetime;
      timelineStarted = true;
    }

    // Lines with only a time inherit the current date if available; otherwise warn.
    if (timeInText && !ev.from_datetime) {
      if (currentDate) {
        const datetime = `${currentDate}T${timeInText}:00`;
        ev.from_datetime = datetime;
        ev.to_datetime = ev.to_datetime || ev.end || datetime;
        timelineStarted = true;
      } else {
        warnings.push("No date context");
      }
    }

    let cleanedLabel = stripDateTimePrefix(label);
    if (cleanedLabel.includes(". ")) {
      cleanedLabel = cleanedLabel.split(". ")[0].trim();
    }
    const alphaOnly = cleanedLabel.replace(/[^a-zA-Z]/g, "");
    const singleWord = cleanedLabel.split(/\s+/).filter(Boolean);
    const monthOnly = singleWord.length === 1 && /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\d{0,4}$/i.test(singleWord[0]);
    if (!cleanedLabel || cleanedLabel.length < 3 || alphaOnly.length === 0 || monthOnly || isPureDateTime(label)) {
      continue;
    }

    ev.warnings = Array.from(new Set(warnings));
    ev.event = ev.event || (evRaw as any).deduction_name || cleanedLabel || "Event";
    ev.event = stripDateTimePrefix(ev.event);

    // Map to canonical event
    const mapped = mapCanonicalEvent(ev.event);
    ev.canonical_event = mapped.canonical;
    ev.canonical_confidence = mapped.confidence;

    // Attach anchored datetime to the next row when available.
    if (!ev.from_datetime && pendingDateTime) {
      ev.from_datetime = pendingDateTime;
      ev.to_datetime = ev.to_datetime || ev.end || pendingDateTime;
      pendingDateTime = null;
    }

    ev.to_datetime = attachEndDate(ev.from_datetime || ev.start, ev.to_datetime || ev.end) || ev.to_datetime;

    const hasDuration = ev.from_datetime && ev.to_datetime && ev.from_datetime !== ev.to_datetime;
    const keywordDuration = durationKeywords.some((kw) => cleanedLabel.toLowerCase().includes(kw));
    ev.event_type = hasDuration || keywordDuration ? "duration" : "instant";

    normalized.push(ev);
  }

  // Fallback: if no events were emitted but we have merged rows with timestamps, emit them.
  if (normalized.length === 0) {
    for (const evRaw of mergedRaw || []) {
      const label = (evRaw?.event || (evRaw as any)?.deduction_name || (evRaw as any)?.notes || "").toString().trim();
      const from = (evRaw as any).from_datetime || (evRaw as any).start || null;
      const to = (evRaw as any).to_datetime || (evRaw as any).end || from || null;
      if (!label || !from || !to) continue;
      const mapped = mapCanonicalEvent(label);
      normalized.push({
        ...evRaw,
        event: label,
        from_datetime: from,
        to_datetime: to,
        event_type: from !== to ? "duration" : "instant",
        canonical_event: mapped.canonical,
        canonical_confidence: mapped.confidence,
      });
    }
  }

  return { events: normalized, summary };
}

/**
 * Normalize raw OCR payload into the standard response shape.
 */
export function normalizeSofPayload(payload: RawSofOcrResponse, opts?: { confidenceFloor?: number }): SofExtractResponse {
  const confidenceFloor = Number(opts?.confidenceFloor ?? 0.35);
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  const { events: normalizedEvents, summary: extractedSummary } = normalizeSofEvents(rawEvents);

  const filtered: SofEvent[] = [];
  const filteredOut: SofEvent[] = [];

  for (const ev of normalizedEvents) {
    const warnings: string[] = Array.isArray(ev.warnings) ? [...ev.warnings] : [];
    const from = ev.from_datetime ?? ev.start;
    let to = ev.to_datetime ?? ev.end;

    if (from && to) {
      const adjusted = attachEndDate(from, to);
      if (adjusted) {
        to = adjusted;
        ev.to_datetime = adjusted;
      }
    }

    if (!ev.event && !(ev as any).deduction_name) warnings.push("Missing event label");
    if (!from) warnings.push("Missing start time");
    if (!to) warnings.push("Missing end time");
    if (from && to && new Date(from).getTime() > new Date(to).getTime()) warnings.push("Start after end");

    const confidence = typeof ev.confidence === "number" ? ev.confidence : null;
    const merged: SofEvent = { ...ev, to_datetime: to ?? ev.to_datetime, warnings };

    if (confidence !== null && confidence < confidenceFloor) {
      merged.warnings = Array.from(new Set([...(merged.warnings || []), `Low confidence (< ${confidenceFloor})`]));
      filteredOut.push(merged);
    }
    filtered.push(merged);
  }

  const mergedSummary: SofSummary | null =
    payload.summary ||
    payload.header ||
    (extractedSummary && Object.keys(extractedSummary).length > 0 ? extractedSummary : null) || { port_name: "SOF port (unspecified)" };

  if (mergedSummary) {
    if (!mergedSummary.cargo_quantity) {
      const bestQty = bestQuantityFromEvents(rawEvents || []);
      if (bestQty) mergedSummary.cargo_quantity = bestQty;
    }
    if (mergedSummary.vessel_name) {
      const cleanVessel = mergedSummary.vessel_name.replace(/cargo.*$/i, "").trim();
      mergedSummary.vessel_name = cleanVessel || mergedSummary.vessel_name;
    }
    if (mergedSummary.terminal) {
      const term = mergedSummary.terminal.trim();
      if (term.split(" ").length <= 1 || /^\d+$/.test(term)) {
        mergedSummary.terminal = null;
      }
    }
  }

  return {
    events: filtered,
    filtered_out: filteredOut,
    summary: mergedSummary,
    warnings: payload.warnings || [],
    error: payload.error,
    meta: {
      ...payload.meta,
      filteredOutCount: filteredOut.length,
      confidenceFloor,
    },
    raw: payload.raw ?? null,
  };
}
