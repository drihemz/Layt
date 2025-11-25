"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Session } from "next-auth";

interface Vessel {
  id?: string;
  name?: string;
  imo_number?: number | string;
  call_sign?: string;
  mmsi?: number | string;
  flag?: string;
  year_built?: number | string;
  dwt?: number | string;
  gross_tonnage?: number | string;
  net_tonnage?: number | string;
  vessel_type?: string;
  technical_owner_id?: string;
  commercial_owner_id?: string;
  is_public?: boolean;
  tenant_id?: string;
}

interface Party {
  id: string;
  name: string;
  party_type: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface VesselDialogProps {
  vessel?: Vessel | null;
  parties: Party[];
  children: React.ReactNode;
  session: Session;
}

export function VesselDialog({ vessel, parties, children, session }: VesselDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Vessel>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);

  const isEditMode = !!vessel?.id;
  const isSuperAdmin = session.user.role === 'super_admin';

  useEffect(() => {
    if (isEditMode) {
      setFormData(vessel);
      setIsPublic(vessel?.is_public || false);
      if (isSuperAdmin && vessel?.tenant_id) {
        setSelectedTenantId(vessel.tenant_id);
      }
    } else {
      setFormData({
        name: '', imo_number: '', call_sign: '', mmsi: '', flag: '',
        year_built: '', dwt: '', gross_tonnage: '', net_tonnage: '',
        vessel_type: '', technical_owner_id: '', commercial_owner_id: '',
      });
      setIsPublic(false);
      setSelectedTenantId('');
    }

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
  }, [vessel, isEditMode, open, isSuperAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tenantId = isSuperAdmin ? selectedTenantId : session.user.tenantId;

    if (!tenantId && !isPublic) {
      setError("No tenant context available.");
      setLoading(false);
      return;
    }
    
    const processedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value === '' ? null : value])
    );

    const payload: any = {
      table: "vessels",
      id: vessel?.id,
      ...processedData,
      is_public: isPublic,
    };

    if (isPublic) {
      payload.tenant_id = null;
    } else if (isSuperAdmin && selectedTenantId) {
      payload.tenant_id = selectedTenantId;
    } else {
      payload.tenant_id = session.user.tenantId;
    }

    try {
      const url = "/api/lookup";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} vessel`);
      }

      alert(`Vessel ${isEditMode ? "updated" : "added"} successfully!`);
      setOpen(false);
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-gray-900 border-gray-700 text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Vessel" : "Add New Vessel"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit the details of the vessel." : "Fill in the details for the new vessel."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] overflow-y-auto gap-4 p-4">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant">Tenant</Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId} disabled={isPublic}>
                    <SelectTrigger id="tenant" className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white">
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked as boolean)} />
                  <Label htmlFor="isPublic">Visible to all tenants</Label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imo_number">IMO Number</Label>
                <Input id="imo_number" type="number" value={formData.imo_number || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="call_sign">Call Sign</Label>
                <Input id="call_sign" value={formData.call_sign || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mmsi">MMSI</Label>
                <Input id="mmsi" type="number" value={formData.mmsi || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flag">Flag</Label>
                <Input id="flag" value={formData.flag || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_built">Year Built</Label>
                <Input id="year_built" type="number" value={formData.year_built || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dwt">DWT</Label>
                <Input id="dwt" type="number" value={formData.dwt || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gross_tonnage">Gross Tonnage</Label>
                <Input id="gross_tonnage" type="number" value={formData.gross_tonnage || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net_tonnage">Net Tonnage</Label>
                <Input id="net_tonnage" type="number" value={formData.net_tonnage || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vessel_type">Vessel Type</Label>
              <Input id="vessel_type" value={formData.vessel_type || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technical_owner_id">Technical Owner</Label>
                <Select
                  value={formData.technical_owner_id || ""}
                  onValueChange={(value) => handleSelectChange("technical_owner_id", value)}
                >
                  <SelectTrigger id="technical_owner_id" className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select a Technical Owner" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white">
                    {parties.filter(p => p.party_type === 'Vessel Owner').map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commercial_owner_id">Commercial Owner</Label>
                <Select
                  value={formData.commercial_owner_id || ""}
                  onValueChange={(value) => handleSelectChange("commercial_owner_id", value)}
                >
                  <SelectTrigger id="commercial_owner_id" className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select a Commercial Owner" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white">
                    {parties.filter(p => p.party_type === 'Vessel Owner').map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Add Vessel")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
