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

interface Port {
  id?: string;
  name?: string;
  un_locode?: string;
  country?: string;
  latitude?: number | string;
  longitude?: number | string;
  is_public?: boolean;
  tenant_id?: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface PortDialogProps {
  port?: Port | null;
  children: React.ReactNode;
  session: Session;
}

export function PortDialog({ port, children, session }: PortDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Port>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);

  const isEditMode = !!port?.id;
  const isSuperAdmin = session.user.role === 'super_admin';

  useEffect(() => {
    if (isEditMode) {
      setFormData(port);
      setIsPublic(port?.is_public || false);
      if (isSuperAdmin && port?.tenant_id) {
        setSelectedTenantId(port.tenant_id);
      }
    } else {
      setFormData({ name: '', un_locode: '', country: '', latitude: '', longitude: '' });
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
  }, [port, isEditMode, open, isSuperAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
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
      table: "ports",
      id: port?.id,
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
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} port`);
      }

      alert(`Port ${isEditMode ? "updated" : "added"} successfully!`);
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
            <DialogTitle>{isEditMode ? "Edit Port" : "Add New Port"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit the details of the port." : "Fill in the details for the new port."}
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
                <Label htmlFor="un_locode">UN/LOCODE</Label>
                <Input id="un_locode" value={formData.un_locode || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
               <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" step="any" value={formData.latitude || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="any" value={formData.longitude || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Add Port")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
