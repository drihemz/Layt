import { normalizeSofPayload, RawSofOcrResponse } from "@/lib/sof-parser";

const LOCAL_OCR_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOCAL_OCR === "true";
const LOCAL_OCR_RASTER = process.env.NEXT_PUBLIC_ENABLE_TESSERACT_RASTER === "true";

type Line = { text: string; page: number; line: number; confidence?: number | null };

async function extractTextWithPdfJs(file: File | Blob): Promise<Line[]> {
  if (typeof window === "undefined") return [];
  try {
    // @ts-ignore - runtime-only import from public asset
    const pdfjs = await import(/* webpackIgnore: true */ "/pdfjs-dist/build/pdf.min.mjs").catch(() => null);
    if (!pdfjs) return [];
    (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdfjs-dist/build/pdf.worker.min.js";
    const data = await file.arrayBuffer();
    const doc = await (pdfjs as any).getDocument({ data }).promise;
    const lines: Line[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      content.items.forEach((item: any, idx: number) => {
        const str = (item.str || "").trim();
        if (str) {
          lines.push({ text: str, page: p, line: idx + 1, confidence: null });
        }
      });
    }
    return lines;
  } catch (e) {
    console.error("pdf.js local text extraction failed", e);
    return [];
  }
}

async function extractWithTesseract(file: File | Blob, dpi = 250): Promise<Line[]> {
  if (typeof window === "undefined" || !LOCAL_OCR_RASTER) return [];
  try {
    // @ts-ignore - runtime-only import from public asset
    const pdfjs = await import(/* webpackIgnore: true */ "/pdfjs-dist/build/pdf.min.mjs").catch(() => null);
    if (!pdfjs) return [];
    (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdfjs-dist/build/pdf.worker.min.js";
    // @ts-ignore - runtime CDN import
    const tesseract = await import(
      /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"
    ).catch(() => null);
    if (!tesseract || !(tesseract as any).createWorker) return [];
    const { createWorker } = tesseract as any;

    const data = await file.arrayBuffer();
    const doc = await (pdfjs as any).getDocument({ data }).promise;
    const scale = dpi / 72;

    const worker = await createWorker("eng");
    const lines: Line[] = [];

    const pageLimit = Math.min(doc.numPages, 3); // keep lightweight
    for (let p = 1; p <= pageLimit; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data: result } = await worker.recognize(canvas);
      const textLines = (result?.data?.lines || []).filter((l: any) => l?.text?.trim());
      textLines.forEach((l: any, idx: number) => {
        lines.push({
          text: l.text.trim(),
          page: p,
          line: idx + 1,
          confidence: typeof l.confidence === "number" ? l.confidence / 100 : null,
        });
      });
      canvas.width = 0;
      canvas.height = 0;
    }
    await worker.terminate();
    return lines;
  } catch (e) {
    console.error("tesseract.js raster extraction failed", e);
    return [];
  }
}

export async function localOcrFallback(
  file: File | Blob,
  opts?: { enableRaster?: boolean; dpi?: number; confidenceFloor?: number }
) {
  if (!LOCAL_OCR_ENABLED) {
    return {
      events: [],
      filtered_out: [],
      summary: {},
      warnings: ["Local OCR fallback disabled"],
      meta: { sourcePages: 0, durationMs: 0, filteredOutCount: 0, confidenceFloor: opts?.confidenceFloor ?? 0.35 },
      raw: null,
    };
  }

  const start = performance.now();
  let lines = await extractTextWithPdfJs(file);
  const warnings: string[] = [];

  if (lines.length === 0 && (opts?.enableRaster || LOCAL_OCR_RASTER)) {
    warnings.push("pdf.js text empty; attempting tesseract.js raster");
    lines = await extractWithTesseract(file, opts?.dpi || 250);
  }

  const payload: RawSofOcrResponse = {
    events: lines.map((l) => ({
      event: l.text,
      page: l.page,
      line: l.line,
      confidence: l.confidence || undefined,
    })),
  };

  const normalized = normalizeSofPayload(payload, { confidenceFloor: opts?.confidenceFloor });
  normalized.warnings = [...(normalized.warnings || []), ...warnings];
  normalized.meta = {
    ...normalized.meta,
    durationMs: performance.now() - start,
  };
  return normalized;
}
