"use client";

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
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { useTenant } from "@/lib/tenant-context";
import { getTenantClient } from "@/lib/db-helpers";

type Props = {
  onCreated?: (voyage: any) => void;
};

export function CreateVoyageDialog({ onCreated }: Props) {
  const { data: session } = useSession();
  const { tenantId } = useTenant();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [voyageReference, setVoyageReference] = useState("");
  const [voyageNumber, setVoyageNumber] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [vesselId, setVesselId] = useState<string | undefined>(undefined);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [chartererId, setChartererId] = useState<string | undefined>(undefined);
  const [cargoId, setCargoId] = useState<string | undefined>(undefined);
  const [charterPartyId, setCharterPartyId] = useState<string | undefined>(undefined);

  const [vessels, setVessels] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [charterers, setCharterers] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [charterParties, setCharterParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e?: any) {
    e?.preventDefault();
    setError(null);
    if (!tenantId) return setError("No tenant context available");
    if (!session?.user?.id) return setError("Not authenticated");
    if (!voyageReference && !voyageNumber && !externalReference) {
      return setError("Please provide at least a voyage reference, number, or external reference.");
    }

    setLoading(true);
    try {
      const voyage_reference = voyageReference || externalReference || `VOY-${Date.now() % 100000}`;
      const payload: any = {
        voyage_reference,
        voyage_number: voyageNumber || null,
        vessel_id: vesselId || null,
        cargo_name_id: cargoId || null,
        owner_name_id: ownerId || null,
        charterer_name_id: chartererId || null,
        charter_party_id: charterPartyId || null,
        external_reference: externalReference || null,
        tenant_id: tenantId,
        created_by: session.user.id,
      };
      if (date) {
        payload.cp_date = date.toISOString().split("T")[0];
      }

      const { data, error: insertError } = await supabase.from("voyages").insert(payload).select().single();
      if (insertError) throw insertError;
      setOpen(false);
      setVoyageReference("");
      setVoyageNumber("");
      setExternalReference("");
      if (onCreated) onCreated(data);
    } catch (err: any) {
      console.error("Create voyage error", err);
      setError(err.message || "Failed to create voyage");
    } finally {
      setLoading(false);
    }
  }

  // Fetch lookup lists when dialog opens
  async function loadLookups() {
    if (!session) return;
    try {
      const client = getTenantClient(session as any);
      const [vesselsData, ownersData, charterersData, cargosData, cpsData] = await Promise.all([
        client.lookup.vessels(),
        client.lookup.ownerNames(),
        client.lookup.chartererNames(),
        client.lookup.cargoNames(),
        client.lookup.charterParties(),
      ]);
      setVessels(vesselsData || []);
      setOwners(ownersData || []);
      setCharterers(charterersData || []);
      setCargos(cargosData || []);
      setCharterParties(cpsData || []);
    } catch (err) {
      console.error("Failed loading lookups", err);
    }
  }

  useEffect(() => {
    if (open) loadLookups();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Voyage</Button>
      </DialogTrigger>
      <form onSubmit={handleCreate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Voyage</DialogTitle>
            <DialogDescription>Enter the details of the new voyage.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voyage-reference" className="text-right">
                Voyage Reference
              </Label>
              <Input id="voyage-reference" className="col-span-3" value={voyageReference} onChange={e => setVoyageReference(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vessel" className="text-right">Vessel</Label>
              <Select value={vesselId} onValueChange={(v: string) => setVesselId(v)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a vessel" /></SelectTrigger>
                <SelectContent>
                  {vessels.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voyage-number" className="text-right">Voyage Number</Label>
              <Input id="voyage-number" className="col-span-3" value={voyageNumber} onChange={e => setVoyageNumber(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo" className="text-right">Cargo</Label>
              <Select value={cargoId} onValueChange={(v: string) => setCargoId(v)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select cargo" /></SelectTrigger>
                <SelectContent>
                  {cargos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">Owner</Label>
              <Select value={ownerId} onValueChange={(v: string) => setOwnerId(v)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charterer" className="text-right">Charterer</Label>
              <Select value={chartererId} onValueChange={(v: string) => setChartererId(v)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select charterer" /></SelectTrigger>
                <SelectContent>
                  {charterers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charter-party" className="text-right">Charter Party</Label>
              <Select value={charterPartyId} onValueChange={(v: string) => setCharterPartyId(v)}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select charter party" /></SelectTrigger>
                <SelectContent>
                  {charterParties.map((cp) => <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-date" className="text-right">CP Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="external-reference" className="text-right">External Reference</Label>
              <Input id="external-reference" className="col-span-3" value={externalReference} onChange={e => setExternalReference(e.target.value)} />
            </div>
            {error && <div className="col-span-4 text-sm text-red-600">{error}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

