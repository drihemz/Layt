"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Lookups = {
  parties: any[];
  vessels: any[];
  cargoNames: any[];
  charterParties: any[];
};

type Voyage = {
  id: string;
  voyage_reference: string;
  voyage_number?: string | null;
  external_reference?: string | null;
  vessel_id?: string | null;
  cargo_name_id?: string | null;
  owner_id?: string | null;
  charterer_id?: string | null;
  charter_party_id?: string | null;
  cargo_quantity?: number | null;
  cp_date?: string | null;
};

export function EditVoyageDialog({
  voyage,
  lookups,
  onSaved,
}: {
  voyage: Voyage;
  lookups: Lookups;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initialForm: Voyage = {
    id: voyage.id,
    voyage_reference: voyage.voyage_reference || "",
    voyage_number: voyage.voyage_number || "",
    external_reference: voyage.external_reference || "",
    vessel_id: (voyage as any).vessel_id || "",
    cargo_name_id: (voyage as any).cargo_name_id || "",
    owner_id: (voyage as any).owner_id || "",
    charterer_id: (voyage as any).charterer_id || "",
    charter_party_id: (voyage as any).charter_party_id || "",
    cargo_quantity: voyage.cargo_quantity ?? null,
    cp_date: voyage.cp_date || null,
  };
  const [form, setForm] = useState<Voyage>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof Voyage, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!form.voyage_reference) {
      setError("Voyage reference is required");
      return;
    }
    if (!form.vessel_id) {
      setError("Vessel is required");
      return;
    }
    setLoading(true);
    try {
      // Only send allowed columns
      const payload: any = {
        id: form.id,
        voyage_reference: form.voyage_reference,
        voyage_number: form.voyage_number || null,
        external_reference: form.external_reference || null,
        vessel_id: form.vessel_id || null,
        cargo_name_id: form.cargo_name_id || null,
        owner_id: form.owner_id || null,
        charterer_id: form.charterer_id || null,
        charter_party_id: form.charter_party_id || null,
        cargo_quantity: form.cargo_quantity ?? null,
        cp_date: form.cp_date || null,
      };

      const res = await fetch("/api/voyages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save voyage");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Voyage</DialogTitle>
            <DialogDescription>Update voyage details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="voy-ref" className="text-right">Reference</Label>
              <Input
                id="voy-ref"
                value={form.voyage_reference}
                onChange={(e) => handleChange("voyage_reference", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="voy-num" className="text-right">Voyage #</Label>
              <Input
                id="voy-num"
                value={form.voyage_number || ""}
                onChange={(e) => handleChange("voyage_number", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="ext-ref" className="text-right">External Ref</Label>
              <Input
                id="ext-ref"
                value={form.external_reference || ""}
                onChange={(e) => handleChange("external_reference", e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right">Vessel</Label>
              <Select
                value={form.vessel_id || ""}
                onValueChange={(v) => handleChange("vessel_id", v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lookups.vessels.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right">Cargo</Label>
              <Select
                value={form.cargo_name_id || ""}
                onValueChange={(v) => handleChange("cargo_name_id", v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lookups.cargoNames.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label htmlFor="qty" className="text-right">Cargo Qty</Label>
              <Input
                id="qty"
                type="number"
                value={form.cargo_quantity ?? ""}
                onChange={(e) => handleChange("cargo_quantity", e.target.value ? Number(e.target.value) : null)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right">Owner</Label>
              <Select
                value={form.owner_id || ""}
                onValueChange={(v) => handleChange("owner_id", v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lookups.parties.filter(p => p.party_type === "Vessel Owner").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right">Charterer</Label>
              <Select
                value={form.charterer_id || ""}
                onValueChange={(v) => handleChange("charterer_id", v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lookups.parties.filter(p => p.party_type === "Charterer").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-2">
              <Label className="text-right">Charter Party</Label>
              <Select
                value={form.charter_party_id || ""}
                onValueChange={(v) => handleChange("charter_party_id", v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lookups.charterParties.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
