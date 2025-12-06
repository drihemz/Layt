export type SofExtractEvent = {
  id?: string;
  event?: string;
  start?: string;
  end?: string;
  ratePercent?: number | null;
  behavior?: string | null;
  portCallName?: string | null;
  notes?: string | null;
  page?: number | null;
  line?: number | null;
  confidence?: number | null;
};

export type SofExtractSummary = {
  port_name?: string | null;
  terminal?: string | null;
  vessel_name?: string | null;
  imo?: string | null;
  cargo_name?: string | null;
  cargo_quantity?: string | number | null;
  laycan_start?: string | null;
  laycan_end?: string | null;
  operation_type?: string | null;
  raw?: any;
};

export type SofExtractResult = {
  events: SofExtractEvent[];
  filtered_out?: SofExtractEvent[];
  warnings?: string[];
  error?: string;
  meta?: {
    sourcePages?: number;
    durationMs?: number;
    filteredOutCount?: number;
    confidenceFloor?: number;
  };
  summary?: SofExtractSummary | null;
  raw?: any;
};

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
