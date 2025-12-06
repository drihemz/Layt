import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  // Normalize spaces and fix split month tokens like "J an"
  let cleaned = text.replace(/\s+/g, " ").replace(/-\s+/g, "-").replace(/\s+-/g, "-");
  cleaned = cleaned.replace(/([A-Za-z])\s+([A-Za-z])/g, "$1$2");
  const m = cleaned.match(/(\d{1,2})\s*[-/]\s*([A-Za-z]{3})[A-Za-z]*\s*[-/]\s*(\d{2,4})/);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const mon = monthMap[m[2].toLowerCase()] || null;
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

// Accepts formats like 05-07/01/2025 or 05/01/2025-07/01/2025
function parseDateRange(text: string): { start?: string | null; end?: string | null } {
  const normalized = text.replace(/\s+/g, "");
  const parts = normalized.split(/to|-|→/i);
  if (parts.length !== 2) return {};
  const startRaw = parts[0];
  const endRaw = parts[1];
  const start = parseDate(startRaw) || parseDate(endRaw) || null;
  const end = parseDate(endRaw) || null;
  return { start, end };
}

function stripDateTimePrefix(label: string): string {
  let out = label;
  // Remove leading date tokens
  out = out.replace(/^(\d{1,2}\s*[-/]\s*[A-Za-z]{3}[A-Za-z]*\s*[-/]\s*\d{2,4})\s*[\\/|-]*\s*/i, "");
  // Remove leading time tokens (with optional dash)
  out = out.replace(/^\d{1,2}[:.]\d{2}\s*[-–—]?\s*/i, "");
  // Remove trailing LT/L.T.
  out = out.replace(/\bLT\b/gi, "").trim();
  // Remove leftover leading slashes/dashes/commas and extra spaces
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

function parseQuantity(text: string): { qty: number; unit: string } | null {
  const m = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*(mt|m\/t|tons|tonnes|t)?/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  return { qty: num, unit: m[2] || "" };
}

function normalizeSofEvents(rawEvents: any[]) {
  let currentDate: string | null = null;
  const headings = [
    "statement of facts",
    "arrival / departure summary",
    "arrival/departure summary",
    "cargo details",
    "detailed statement of facts",
    "signatures",
    "terminal representative",
  ];
  const skipPrefixes = ["intended loading", "final loaded", "cargo description", "dwt:"];
  const skipContains = ["cargo condition", "trimmed, inspected, secured", "signature", "master:", "agent:", "terminal representative"];
  const quantityLine = (val: string) => /^\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?\s*mt\b/i.test(val);
  const durationKeywords = ["delay", "weather", "rain", "suspension", "stoppage", "disruption", "shift", "survey", "inspection", "sampling"];

  const normalized: any[] = [];
  const summary: any = {};

  for (const ev of rawEvents) {
    const warnings: string[] = Array.isArray(ev.warnings) ? [...ev.warnings] : [];
    const labelRaw = (ev.event || ev.deduction_name || "").toString();
    const label = labelRaw.replace(/\s+/g, " ").trim();
    const lower = label.toLowerCase();

    // Harvest header info before any skipping
    if (lower.startsWith("port:")) {
      summary.port_name = label.replace(/^port:\s*/i, "").trim() || summary.port_name;
    }
    // Generic "Port of X" capture
    if (!summary.port_name) {
      const m = label.match(/port\s+of\s+(.+)/i);
      if (m) summary.port_name = m[1].trim();
    }
    if (lower.includes("terminal")) {
      const m = label.match(/terminal[:\-]?\s*(.*)/i);
      if (m) summary.terminal = m[1].trim() || summary.terminal;
    }
    if (lower.startsWith("vessel:")) {
      summary.vessel_name = label.replace(/^vessel:\s*/i, "").trim() || summary.vessel_name;
    }
    if (lower.includes("imo")) {
      const m = label.match(/imo[:\s]*([0-9]{6,7})/i);
      if (m) summary.imo = m[1];
    }
    if (lower.startsWith("cargo:")) {
      summary.cargo_name = label.replace(/^cargo:\s*/i, "").trim() || summary.cargo_name;
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
    }
    // Handle generic date ranges that look like laycan (05-07 Jan 2025)
    if (!summary.laycan_start || !summary.laycan_end) {
      const rangeParsed = parseDateRange(label);
      if (rangeParsed.start && !summary.laycan_start) summary.laycan_start = rangeParsed.start;
      if (rangeParsed.end && !summary.laycan_end) summary.laycan_end = rangeParsed.end;
    }
    if (!summary.operation_type) {
      if (lower.includes("load")) summary.operation_type = "load";
      if (lower.includes("disch") || lower.includes("discharge")) summary.operation_type = "discharge";
    }
    if (!summary.cargo_name && lower.startsWith("cargo")) {
      const m = label.match(/cargo[:\s-]*(.+)/i);
      if (m) summary.cargo_name = m[1].trim();
    }
    if (!summary.cargo_quantity) {
      const qty = parseQuantity(label);
      if (qty) summary.cargo_quantity = qty.qty + (qty.unit ? ` ${qty.unit}` : "");
    }
    if (!summary.vessel_name) {
      const m = label.match(/\b(m\/v|mv)\s+([A-Z0-9 _-]+)/i);
      if (m) summary.vessel_name = m[2].trim();
    }
    if (!summary.imo) {
      const m = label.match(/\bIMO[:\s]*([0-9]{6,7})/i);
      if (m) summary.imo = m[1];
    }
    if (!summary.terminal) {
      const m = label.match(/terminal[:\s-]*([A-Za-z0-9 \/-]+)/i);
      if (m) summary.terminal = m[1].trim();
    }

    if (
      headings.some((h) => lower.includes(h)) ||
      skipPrefixes.some((p) => lower.startsWith(p)) ||
      skipContains.some((s) => lower.includes(s)) ||
      quantityLine(lower)
    ) {
      continue;
    }

    const dateInText = parseDate(label);
    const timeInText = parseTime(label);

    // Date-only lines: set context and skip emitting an event.
    if (dateInText && !timeInText) {
      currentDate = dateInText;
      continue;
    }

    if (dateInText && timeInText) {
      currentDate = dateInText;
      const datetime = `${dateInText}T${timeInText}:00`;
      if (!ev.from_datetime) ev.from_datetime = datetime;
      if (!ev.to_datetime) ev.to_datetime = ev.end || datetime;
    } else if (timeInText && currentDate) {
      const datetime = `${currentDate}T${timeInText}:00`;
      if (!ev.from_datetime) ev.from_datetime = datetime;
      if (!ev.to_datetime) ev.to_datetime = ev.end || datetime;
    } else if (timeInText && !currentDate) {
      warnings.push("No date context");
    }

    // Drop rows that still have no time context at all.
    if (!timeInText && !ev.from_datetime && !ev.to_datetime) {
      continue;
    }

    const cleanedLabel = stripDateTimePrefix(label);
    const alphaOnly = cleanedLabel.replace(/[^a-zA-Z]/g, "");
    // If label is only date/time with no meaningful text, skip emitting.
    const singleWord = cleanedLabel.split(/\s+/).filter(Boolean);
    const monthOnly = singleWord.length === 1 && /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\d{0,4}$/i.test(singleWord[0]);
    if (!cleanedLabel || cleanedLabel.length < 3 || alphaOnly.length === 0 || monthOnly || isPureDateTime(label)) {
      continue;
    }

    ev.warnings = Array.from(new Set(warnings));
    ev.event = ev.event || ev.deduction_name || cleanedLabel || "Event";
    ev.event = stripDateTimePrefix(ev.event);

    // Categorize instant vs duration
    const hasDuration = ev.from_datetime && ev.to_datetime && ev.from_datetime !== ev.to_datetime;
    const keywordDuration = durationKeywords.some((kw) => cleanedLabel.toLowerCase().includes(kw));
    ev.event_type = hasDuration || keywordDuration ? "duration" : "instant";

    normalized.push(ev);
  }

  return { events: normalized, summary };
}

export async function POST(req: Request) {
  const endpoint = process.env.SOF_OCR_ENDPOINT || process.env.NEXT_PUBLIC_SOF_OCR_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({ error: "SOF OCR endpoint not configured" }, { status: 500 });
  }
  // Allow users to provide the base host; append /extract if missing.
  const target = endpoint.includes("/extract")
    ? endpoint
    : `${endpoint.replace(/\/+$/, "")}/extract`;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const forward = new FormData();
  forward.append("file", file);

  const confidenceFloor = Number(process.env.SOF_CONFIDENCE_FLOOR ?? 0.35);

  try {
    const res = await fetch(target, {
      method: "POST",
      body: forward,
    });
    const text = await res.text();
    const json = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })();
    if (!res.ok) {
      return NextResponse.json({ error: json?.error || text || "SOF service error" }, { status: res.status });
    }
    if (!json || !Array.isArray(json.events)) {
      return NextResponse.json({ error: "Invalid response from SOF service", raw: text }, { status: 502 });
    }
    const { events: normalizedEvents, summary: extractedSummary } = normalizeSofEvents(json.events);

    const filtered = [];
    const filteredOut: any[] = [];

    for (const ev of normalizedEvents) {
      const warnings: string[] = [];
      const from = ev.from_datetime ?? ev.start;
      const to = ev.to_datetime ?? ev.end;

      if (!ev.event && !ev.deduction_name) warnings.push("Missing event label");
      if (!from) warnings.push("Missing start time");
      if (!to) warnings.push("Missing end time");
      if (from && to && new Date(from).getTime() > new Date(to).getTime()) warnings.push("Start after end");

      const confidence = typeof ev.confidence === "number" ? ev.confidence : null;
      const merged = { ...ev, warnings };

      if (confidence !== null && confidence < confidenceFloor) {
        filteredOut.push(merged);
        continue;
      }
      filtered.push(merged);
    }

    const mergedSummary =
      json.summary ||
      json.header ||
      (extractedSummary && Object.keys(extractedSummary).length > 0 ? extractedSummary : null) || {
        port_name: "SOF port (unspecified)",
      };

    return NextResponse.json({
      events: filtered,
      meta: {
        filteredOutCount: filteredOut.length,
        confidenceFloor,
      },
      filtered_out: filteredOut,
      summary: mergedSummary,
      raw: json.raw || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to call SOF service" }, { status: 500 });
  }
}
