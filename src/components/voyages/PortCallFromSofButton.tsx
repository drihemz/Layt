"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SofExtractResult } from "@/lib/sof-extractor";
import { Button } from "@/components/ui/button";

export function PortCallFromSofButton({ voyageId, variant = "ghost", label = "Create port call from SOF" }: { voyageId: string; variant?: "ghost" | "outline" | "default"; label?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setLoading(true);
    setStatus("Extracting SOF...");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/sof-extract", { method: "POST", body: form });
      const json = (await res.json()) as SofExtractResult & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || "Extraction failed");
      if (!json.summary) throw new Error("SOF summary not returned; cannot create port call");
      setStatus("Creating port call...");
      const pcRes = await fetch(`/api/voyages/${voyageId}/port-call-from-sof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: json.summary, events: json.events }),
      });
      const pcJson = await pcRes.json();
      if (!pcRes.ok) throw new Error(pcJson.error || "Create port call failed");
      setStatus("Port call created from SOF.");
      router.refresh();
    } catch (err: any) {
      setStatus(err?.message || "Failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Working..." : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          handleFile(f);
        }}
      />
      {status && <p className="text-[11px] text-slate-600">{status}</p>}
    </div>
  );
}
