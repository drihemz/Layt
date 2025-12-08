import { SofExtractResponse, SofEvent, SofSummary } from "@/types/sof";

// Backwards-compatible aliases for existing imports.
export type SofExtractEvent = SofEvent;
export type SofExtractSummary = SofSummary;
export type SofExtractResult = SofExtractResponse;

/**
 * Calls the configured OCR/extraction service.
 * Expects form-data with a `file` field.
 */
export async function extractSof(file: File): Promise<SofExtractResult> {
  const endpoint = process.env.NEXT_PUBLIC_SOF_OCR_ENDPOINT || process.env.SOF_OCR_ENDPOINT;
  if (!endpoint) {
    return { events: [], warnings: ["SOF_OCR_ENDPOINT is not configured"], error: "Service not configured" };
  }

  const form = new FormData();
  form.append("file", file);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { events: [], error: `Service error (${res.status}): ${text || res.statusText}` };
    }

    const json = (await res.json().catch(() => null)) as SofExtractResult | null;
    if (!json || !Array.isArray(json.events)) {
      return { events: [], error: "Invalid response from SOF OCR service" };
    }
    return json;
  } catch (err: any) {
    return { events: [], error: err?.message || "Extraction failed" };
  }
}
