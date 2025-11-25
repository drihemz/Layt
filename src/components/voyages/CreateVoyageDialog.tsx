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
import { useRouter } from "next/navigation";
import { Session } from "next-auth";

type Lookups = {
  parties: any[];
  vessels: any[];
  cargoNames: any[];
  charterParties: any[];
};

type Tenant = {
  id: string;
  name: string;
};

type Props = {
  lookups: Lookups;
  session: Session;
  defaultTenantId?: string;
};

export function CreateVoyageDialog({ lookups, session, defaultTenantId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [voyageReference, setVoyageReference] = useState("");
  const [voyageNumber, setVoyageNumber] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [chartererId, setChartererId] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [charterPartyId, setCharterPartyId] = useState("");
  const [cargoQuantity, setCargoQuantity] = useState<number | string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [localLookups, setLocalLookups] = useState<Lookups>(lookups);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(defaultTenantId || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = session.user.role === 'super_admin';

  useEffect(() => {
    async function fetchTenants() {
      if (isSuperAdmin) {
        try {
          const response = await fetch('/api/admin/tenants');
          if (response.ok) {
            const data = await response.json();
            setTenants(data.tenants);
          } else {
            console.error("Failed to fetch tenants");
          }
        } catch (error) {
          console.error("Error fetching tenants:", error);
        }
      }
    }

    if (open) {
      fetchTenants();
    }
  }, [isSuperAdmin, open]);

    useEffect(() => {
      async function fetchLookupForTenant() {
        if (!selectedTenantId) return;
        try {
          const url = `/api/lookup?tenant_id=${selectedTenantId}`;
          const res = await fetch(url);
          if (!res.ok) return;
          const json = await res.json();
          const data = json.data;
          setLocalLookups({
            parties: data.parties || [],
            vessels: data.vessels || [],
            cargoNames: data.cargo_names || [],
            charterParties: data.charter_parties || [],
          });
        } catch (err) {
          console.error('Failed to fetch tenant lookups', err);
        }
      }

      if (open && selectedTenantId) fetchLookupForTenant();
      // If no selected tenant and not super admin, keep passed-in lookups
      if (!selectedTenantId) setLocalLookups(lookups);
    }, [selectedTenantId, open]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!voyageReference && !voyageNumber && !externalReference) {
      return setError("Please provide at least a voyage reference, number, or external reference.");
    }
    if (isSuperAdmin && !selectedTenantId) {
      return setError("Please select a tenant.");
    }

    setLoading(true);
    try {
      const voyage_reference = voyageReference || externalReference || `VOY-${Date.now() % 100000}`;
      const payload: any = {
        voyage_reference,
        voyage_number: voyageNumber || null,
        vessel_id: vesselId || null,
        cargo_name_id: cargoId || null,
        owner_id: ownerId || null,
        charterer_id: chartererId || null,
        charter_party_id: charterPartyId || null,
        external_reference: externalReference || null,
        cargo_quantity: cargoQuantity ? parseFloat(cargoQuantity as string) : null,
      };
      if (date) {
        payload.cp_date = date.toISOString().split("T")[0];
      }
      if (isSuperAdmin) {
        payload.tenant_id = selectedTenantId;
      }

      const response = await fetch('/api/voyages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create voyage");
      }

      setOpen(false);
      // Reset form state
      setVoyageReference("");
      setVoyageNumber("");
      setExternalReference("");
      setVesselId("");
      setOwnerId("");
      setChartererId("");
      setCargoId("");
      setCharterPartyId("");
      setCargoQuantity('');
      setDate(undefined);
      setSelectedTenantId('');
      
      router.refresh();
      alert("Voyage created successfully!");

    } catch (err: any) {
      console.error("Create voyage error", err);
      setError(err.message || "Failed to create voyage");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Voyage</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Voyage</DialogTitle>
            <DialogDescription>Enter the details of the new voyage.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
            {error && <div className="col-span-4 text-sm text-red-600 bg-red-900/20 border border-red-500/50 rounded-md p-3">{error}</div>}
            
            {isSuperAdmin && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tenant" className="text-right">Tenant</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger id="tenant" className="col-span-3"><SelectValue placeholder="Select a tenant" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voyage-reference" className="text-right">
                Voyage Reference
              </Label>
              <Input id="voyage-reference" className="col-span-3" value={voyageReference} onChange={e => setVoyageReference(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vessel" className="text-right">Vessel</Label>
              <Select value={vesselId} onValueChange={(v: string) => setVesselId(v)}>
                <SelectTrigger id="vessel" className="col-span-3"><SelectValue placeholder="Select a vessel" /></SelectTrigger>
                <SelectContent>
                  {localLookups.vessels.map((v) => (
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
                <SelectTrigger id="cargo" className="col-span-3"><SelectValue placeholder="Select cargo" /></SelectTrigger>
                <SelectContent>
                  {localLookups.cargoNames.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo-quantity" className="text-right">Cargo Quantity</Label>
              <Input id="cargo-quantity" type="number" className="col-span-3" value={cargoQuantity} onChange={e => setCargoQuantity(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">Owner</Label>
              <Select value={ownerId} onValueChange={(v: string) => setOwnerId(v)}>
                <SelectTrigger id="owner" className="col-span-3"><SelectValue placeholder="Select owner" /></SelectTrigger>
                <SelectContent>
                  {localLookups.parties.filter(p => p.party_type === 'Vessel Owner').map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charterer" className="text-right">Charterer</Label>
              <Select value={chartererId} onValueChange={(v: string) => setChartererId(v)}>
                <SelectTrigger id="charterer" className="col-span-3"><SelectValue placeholder="Select charterer" /></SelectTrigger>
                <SelectContent>
                  {localLookups.parties.filter(p => p.party_type === 'Charterer').map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charter-party" className="text-right">Charter Party</Label>
              <Select value={charterPartyId} onValueChange={(v: string) => setCharterPartyId(v)}>
                <SelectTrigger id="charter-party" className="col-span-3"><SelectValue placeholder="Select charter party" /></SelectTrigger>
                <SelectContent>
                  {localLookups.charterParties.map((cp) => <SelectItem key={cp.id} value={cp.id}>{cp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-date" className="text-right">CP Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="cp-date"
                    type="button"
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
            
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
