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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import { Textarea } from "../ui/textarea";

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
  const [vesselText, setVesselText] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [ownerText, setOwnerText] = useState("");
  const [chartererId, setChartererId] = useState("");
  const [chartererText, setChartererText] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [cargoText, setCargoText] = useState("");
  const [charterPartyId, setCharterPartyId] = useState("");
  const [charterPartyText, setCharterPartyText] = useState("");
  const [cargoQuantity, setCargoQuantity] = useState<number | string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [localLookups, setLocalLookups] = useState<Lookups>(lookups);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(defaultTenantId || '');
  const [activeField, setActiveField] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = session.user.role === 'super_admin';

  const requestNew = async (request_type: string, name: string) => {
    if (!name) return;
    const mappedType = request_type.startsWith("parties_") ? "parties" : request_type;
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_type: mappedType, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      alert("Request submitted to admin for approval.");
    } catch (e: any) {
      alert(e.message || "Request failed");
    }
  };

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
      setVesselText("");
      setOwnerText("");
      setChartererText("");
      setCargoText("");
      setCharterPartyText("");
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
              <div className="col-span-3 relative">
                <Input
                  value={vesselText}
                  onChange={(e) => {
                    setVesselText(e.target.value);
                    const match = localLookups.vessels.find(v => v.name.toLowerCase() === e.target.value.toLowerCase());
                    setVesselId(match ? match.id : "");
                  }}
                  onFocus={() => setActiveField("vessel")}
                  onBlur={() => setTimeout(() => setActiveField(""), 150)}
                  placeholder="Type or select a vessel"
                />
                {activeField === "vessel" && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm text-sm text-gray-700 max-h-40 overflow-auto">
                    {localLookups.vessels
                      .filter((v) => !vesselText || v.name.toLowerCase().includes(vesselText.toLowerCase()))
                      .slice(0, 5)
                      .map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-slate-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setVesselText(v.name);
                            setVesselId(v.id);
                          }}
                        >
                          {v.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        requestNew("vessels", vesselText || "New vessel");
                      }}
                    >
                      Request “{vesselText || "new vessel"}”
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voyage-number" className="text-right">Voyage Number</Label>
              <Input id="voyage-number" className="col-span-3" value={voyageNumber} onChange={e => setVoyageNumber(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo" className="text-right">Cargo</Label>
              <div className="col-span-3 relative">
                <Input
                  value={cargoText}
                  onChange={(e) => {
                    setCargoText(e.target.value);
                    const match = localLookups.cargoNames.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                    setCargoId(match ? match.id : "");
                  }}
                  onFocus={() => setActiveField("cargo")}
                  onBlur={() => setTimeout(() => setActiveField(""), 150)}
                  placeholder="Type or select cargo"
                />
                {activeField === "cargo" && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm text-sm text-gray-700 max-h-40 overflow-auto">
                    {localLookups.cargoNames
                      .filter((c) => !cargoText || c.name.toLowerCase().includes(cargoText.toLowerCase()))
                      .slice(0, 5)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-slate-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCargoText(c.name);
                            setCargoId(c.id);
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        requestNew("cargo_names", cargoText || "New cargo");
                      }}
                    >
                      Request “{cargoText || "new cargo"}”
                    </button>
                  </div>
                )}
              </div>
            </div>
            
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo-quantity" className="text-right">Cargo Quantity</Label>
              <Input id="cargo-quantity" type="number" className="col-span-3" value={cargoQuantity} onChange={e => setCargoQuantity(e.target.value)} />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">Owner</Label>
              <div className="col-span-3 relative">
                <Input
                  value={ownerText}
                  onChange={(e) => {
                    setOwnerText(e.target.value);
                    const match = localLookups.parties.filter(p => p.party_type === 'Vessel Owner').find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                    setOwnerId(match ? match.id : "");
                  }}
                  onFocus={() => setActiveField("owner")}
                  onBlur={() => setTimeout(() => setActiveField(""), 150)}
                  placeholder="Type or select owner"
                />
                {activeField === "owner" && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm text-sm text-gray-700 max-h-40 overflow-auto">
                    {localLookups.parties
                      .filter(p => p.party_type === 'Vessel Owner')
                      .filter((p) => !ownerText || p.name.toLowerCase().includes(ownerText.toLowerCase()))
                      .slice(0, 5)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-slate-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setOwnerText(p.name);
                            setOwnerId(p.id);
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        requestNew("parties_owner", ownerText || "New owner");
                      }}
                    >
                      Request “{ownerText || "new owner"}”
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charterer" className="text-right">Charterer</Label>
              <div className="col-span-3 relative">
                <Input
                  value={chartererText}
                  onChange={(e) => {
                    setChartererText(e.target.value);
                    const match = localLookups.parties.filter(p => p.party_type === 'Charterer').find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                    setChartererId(match ? match.id : "");
                  }}
                  onFocus={() => setActiveField("charterer")}
                  onBlur={() => setTimeout(() => setActiveField(""), 150)}
                  placeholder="Type or select charterer"
                />
                {activeField === "charterer" && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm text-sm text-gray-700 max-h-40 overflow-auto">
                    {localLookups.parties
                      .filter(p => p.party_type === 'Charterer')
                      .filter((p) => !chartererText || p.name.toLowerCase().includes(chartererText.toLowerCase()))
                      .slice(0, 5)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-slate-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setChartererText(p.name);
                            setChartererId(p.id);
                          }}
                        >
                          {p.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        requestNew("parties_charterer", chartererText || "New charterer");
                      }}
                    >
                      Request “{chartererText || "new charterer"}”
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="charter-party" className="text-right">Charter Party</Label>
              <div className="col-span-3 relative">
                <Input
                  value={charterPartyText}
                  onChange={(e) => {
                    setCharterPartyText(e.target.value);
                    const match = localLookups.charterParties.find(cp => cp.name.toLowerCase() === e.target.value.toLowerCase());
                    setCharterPartyId(match ? match.id : "");
                  }}
                  onFocus={() => setActiveField("charterparty")}
                  onBlur={() => setTimeout(() => setActiveField(""), 150)}
                  placeholder="Type or select charter party"
                />
                {activeField === "charterparty" && (
                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow-sm text-sm text-gray-700 max-h-40 overflow-auto">
                    {localLookups.charterParties
                      .filter((cp) => !charterPartyText || cp.name.toLowerCase().includes(charterPartyText.toLowerCase()))
                      .slice(0, 5)
                      .map((cp) => (
                        <button
                          key={cp.id}
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-slate-100"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCharterPartyText(cp.name);
                            setCharterPartyId(cp.id);
                          }}
                        >
                          {cp.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="w-full text-left px-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        requestNew("charter_parties", charterPartyText || "New charter party");
                      }}
                    >
                      Request “{charterPartyText || "new charter party"}”
                    </button>
                  </div>
                )}
              </div>
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
