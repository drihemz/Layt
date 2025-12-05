import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const endpoint = process.env.SOF_OCR_ENDPOINT || process.env.NEXT_PUBLIC_SOF_OCR_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({ error: "SOF OCR endpoint not configured" }, { status: 500 });
  }

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

  try {
    const res = await fetch(endpoint, {
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
    return NextResponse.json(json);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to call SOF service" }, { status: 500 });
  }
}
