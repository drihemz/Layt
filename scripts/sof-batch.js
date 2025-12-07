/**
 * Batch runner to extract and normalize SOFs in /Sample_SOF.
 * Usage: node scripts/sof-batch.js
 *
 * Reads all PDFs under /Sample_SOF, sends them to the configured OCR endpoint,
 * applies the same normalization logic as /api/sof-extract, and writes outputs
 * to /Sample_SOF/outputs/<file>.json for review/regression.
 */

import fs from "fs";
import path from "path";

const monthMap = {
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

function parseDate(text) {
  if (!text) return null;
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

function parseTime(text) {
  const m = text.match(/(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDateRange(text) {
  const normalized = (text || "").replace(/\s+/g, "");
  const parts = normalized.split(/to|-|→/i);
  if (parts.length !== 2) return {};
  const startRaw = parts[0];
  const endRaw = parts[1];
  const start = parseDate(startRaw) || parseDate(endRaw) || null;
  const end = parseDate(endRaw) || null;
  return { start, end };
}

function stripDateTimePrefix(label) {
  let out = label;
  out = out.replace(/^(\d{1,2}\s*[-/]\s*[A-Za-z]{3}[A-Za-z]*\s*[-/]\s*\d{2,4})\s*[\\/|-]*\s*/i, "");
  out = out.replace(/^\d{1,2}[:.]\d{2}\s*[-–—]?\s*/i, "");
  out = out.replace(/\bLT\b/gi, "").trim();
  out = out.replace(/^[\\/|,\-\s]+/, "").trim();
  return out.trim();
}

function isPureDateTime(label) {
  let tmp = label;
  tmp = tmp.replace(/(\d{1,2}\s*[-/]\s*[A-Za-z]{3}[A-Za-z]*\s*[-/]\s*\d{2,4})/gi, "");
  tmp = tmp.replace(/\d{1,2}[:.]\d{2}/g, "");
  tmp = tmp.replace(/\bLT\b/gi, "");
  tmp = tmp.replace(/[\\/|,\-\s]+/g, "").trim();
  return tmp.length === 0;
}

function parseQuantity(text) {
  const m = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?)\s*(mt|m\/t|tons|tonnes|t)?/i);
  if (!m) return null;
  const num = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  return { qty: num, unit: m[2] || "" };
}

function normalizeSofEvents(rawEvents) {
  let currentDate = null;
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
  const quantityLine = (val) => /^\d{1,3}(?:[.,]\d{3})*(?:\.\d+)?\s*mt\b/i.test(val);
  const durationKeywords = ["delay", "weather", "rain", "suspension", "stoppage", "disruption", "shift", "survey", "inspection", "sampling"];

  const normalized = [];
  const summary = {};

  for (const ev of rawEvents) {
    const warnings = Array.isArray(ev.warnings) ? [...ev.warnings] : [];
    const labelRaw = (ev.event || ev.deduction_name || "").toString();
    const label = labelRaw.replace(/\s+/g, " ").trim();
    const lower = label.toLowerCase();

    // Header harvest
    if (lower.startsWith("port:")) {
      summary.port_name = label.replace(/^port:\s*/i, "").trim() || summary.port_name;
    }
    if (!summary.port_name) {
      const m = label.match(/port\s+of\s+(.+)/i);
      if (m) summary.port_name = m[1].trim();
    }
    if (lower.includes("terminal")) {
      const m = label.match(/terminal[:\-]?\s*(.*)/i);
      if (m) summary.terminal = m[1].trim() || summary.terminal;
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
    if (lower.includes("laycan")) {
      const range = label.match(/laycan[:\s]*([0-9A-Za-z/\\-]+)\s*(?:to|-|→)\s*([0-9A-Za-z/\\-]+)/i);
      if (range) {
        const start = parseDate(range[1]);
        const end = parseDate(range[2]);
        if (start) summary.laycan_start = start;
        if (end) summary.laycan_end = end;
      }
    }
    if (!summary.laycan_start || !summary.laycan_end) {
      const rangeParsed = parseDateRange(label);
      if (rangeParsed.start && !summary.laycan_start) summary.laycan_start = rangeParsed.start;
      if (rangeParsed.end && !summary.laycan_end) summary.laycan_end = rangeParsed.end;
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

    if (!timeInText && !ev.from_datetime && !ev.to_datetime) {
      continue;
    }

    const cleanedLabel = stripDateTimePrefix(label);
    const alphaOnly = cleanedLabel.replace(/[^a-zA-Z]/g, "");
    const singleWord = cleanedLabel.split(/\s+/).filter(Boolean);
    const monthOnly =
      singleWord.length === 1 &&
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\d{0,4}$/i.test(singleWord[0]);
    if (!cleanedLabel || cleanedLabel.length < 3 || alphaOnly.length === 0 || monthOnly || isPureDateTime(label)) {
      continue;
    }

    ev.warnings = Array.from(new Set(warnings));
    ev.event = ev.event || ev.deduction_name || cleanedLabel || "Event";
    ev.event = stripDateTimePrefix(ev.event);

    const hasDuration = ev.from_datetime && ev.to_datetime && ev.from_datetime !== ev.to_datetime;
    const keywordDuration = durationKeywords.some((kw) => cleanedLabel.toLowerCase().includes(kw));
    ev.event_type = hasDuration || keywordDuration ? "duration" : "instant";

    normalized.push(ev);
  }

  return { events: normalized, summary };
}

function filteredEvents(events, confidenceFloor = 0.35) {
  const filtered = [];
  const filteredOut = [];
  for (const ev of events) {
    const warnings = Array.isArray(ev.warnings) ? ev.warnings : [];
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
  return { filtered, filteredOut };
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 180000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return res;
}

async function extractFile(filePath, endpoint, confidenceFloor) {
  const buf = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buf]), path.basename(filePath));

  const res = await fetchWithTimeout(endpoint, { method: "POST", body: form });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from OCR: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(json?.error || text || `HTTP ${res.status}`);
  }
  if (!json || !Array.isArray(json.events)) {
    throw new Error("Invalid response from OCR service (missing events)");
  }
  const { events: normalizedEvents, summary: extractedSummary } = normalizeSofEvents(json.events);
  const { filtered, filteredOut } = filteredEvents(normalizedEvents, confidenceFloor);
  const summary = json.summary || json.header || (extractedSummary && Object.keys(extractedSummary).length > 0 ? extractedSummary : null);
  return {
    events: filtered,
    filtered_out: filteredOut,
    meta: { filteredOutCount: filteredOut.length, confidenceFloor },
    summary,
    raw: json,
  };
}

async function main() {
  const root = process.cwd();
  const sampleDir = path.join(root, "Sample_SOF");
  const outDir = path.join(sampleDir, "outputs");
  if (!fs.existsSync(sampleDir)) {
    console.error("Sample_SOF folder not found.");
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const endpointBase = process.env.SOF_OCR_ENDPOINT || process.env.NEXT_PUBLIC_SOF_OCR_ENDPOINT;
  if (!endpointBase) {
    console.error("SOF_OCR_ENDPOINT not set");
    process.exit(1);
  }
  const endpoint = endpointBase.includes("/extract") ? endpointBase : `${endpointBase.replace(/\/+$/, "")}/extract`;
  const confidenceFloor = Number(process.env.SOF_CONFIDENCE_FLOOR ?? 0.35);

  const files = fs.readdirSync(sampleDir).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.error("No PDFs found in Sample_SOF.");
    process.exit(1);
  }

  console.log(`Running ${files.length} SOF samples against ${endpoint}`);
  for (const file of files) {
    const full = path.join(sampleDir, file);
    try {
      const result = await extractFile(full, endpoint, confidenceFloor);
      const outPath = path.join(outDir, `${path.parse(file).name}.json`);
      await fs.promises.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");
      console.log(`✔ ${file}: events=${result.events.length}, filtered=${result.filtered_out.length}, summary=${result.summary ? "yes" : "no"}`);
    } catch (err) {
      console.error(`✖ ${file}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
