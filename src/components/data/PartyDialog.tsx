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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Session } from "next-auth";

interface Party {
  id?: string;
  name?: string;
  party_type?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  kyc_status?: string;
  notes?: string;
  is_public?: boolean;
}

interface Tenant {
  id: string;
  name: string;
}

interface PartyDialogProps {
  party?: Party | null;
  children: React.ReactNode;
  session: Session;
}

const partyTypes = [
  "Vessel Owner",
  "Charterer",
  "Shipper",
  "Receiver",
  "Seller",
  "Buyer",
  "Port Agent",
];

const kycStatuses = ["Pending", "Verified", "Rejected"];

export function PartyDialog({ party, children, session }: PartyDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Party>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);

  const isEditMode = !!party?.id;
  const isSuperAdmin = session.user.role === 'super_admin';

  useEffect(() => {
    if (isEditMode) {
      const { tenantName, ...rest } = party as any;
      setFormData(rest);
      setIsPublic(party?.is_public || false);
      if (isSuperAdmin && party?.tenant_id) {
        setSelectedTenantId(party.tenant_id);
      }
    } else {
      setFormData({
        name: '', party_type: '', address: '', city: '', country: '',
        phone: '', email: '', website: '', tax_id: '', kyc_status: 'Pending', notes: ''
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
  }, [party, isEditMode, open, isSuperAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, party_type: value }));
  };

  const handleKycStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, kyc_status: value }));
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

    const name = formData.name?.trim() || "";
    if (!name) {
      setError("Name is required.");
      setLoading(false);
      return;
    }
    
    // Convert empty strings to null for the DB
    const processedData = Object.fromEntries(
      Object.entries(formData)
        .filter(([key]) => key !== 'tenantName')
        .map(([key, value]) => [key, value === '' ? null : value])
    );
    processedData.name = name;
    
    const payload: any = {
      table: "parties",
      id: party?.id,
      ...processedData,
      is_public: isPublic,
    };

    // If the item is public, ensure tenant_id is null to make it available to all tenants
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
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} party`);
      }

      alert(`Party ${isEditMode ? "updated" : "added"} successfully!`);
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
            <DialogTitle>{isEditMode ? "Edit Party" : "Add New Party"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit the details of the party." : "Fill in the details for the new party."}
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
                  {isSuperAdmin && (
                    <div className="flex items-center space-x-2 mt-6">
                      <Checkbox id="isPublic" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked as boolean)} />
                      <Label htmlFor="isPublic">Visible to all tenants</Label>
                    </div>
                  )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party_type">Party Type</Label>
                <Select
                  value={formData.party_type || ""}
                  onValueChange={handleSelectChange}
                >
                  <SelectTrigger id="party_type" className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white">
                    {partyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={formData.address || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={formData.city || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formData.phone || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formData.website || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">Tax ID / Fiscal Number</Label>
                <Input id="tax_id" value={formData.tax_id || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="kyc_status">KYC Status</Label>
                <Select
                  value={formData.kyc_status || "Pending"}
                  onValueChange={handleKycStatusChange}
                >
                  <SelectTrigger id="kyc_status" className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white">
                    {kycStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={formData.notes || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Party")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
