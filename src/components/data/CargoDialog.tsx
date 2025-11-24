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

interface Cargo {
  id?: string;
  name?: string;
  is_public?: boolean;
  tenant_id?: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface CargoDialogProps {
  cargo?: Cargo | null;
  children: React.ReactNode;
  session: Session;
}

export function CargoDialog({ cargo, children, session }: CargoDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isPublic, setIsPublic] = useState(false);

  const isEditMode = !!cargo?.id;
  const isSuperAdmin = session.user.role === 'super_admin';

  useEffect(() => {
    if (isEditMode) {
      setName(cargo.name || "");
      setIsPublic(cargo?.is_public || false);
      if (isSuperAdmin && cargo?.tenant_id) {
        setSelectedTenantId(cargo.tenant_id);
      }
    } else {
      setName("");
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
  }, [cargo, isEditMode, open, isSuperAdmin]);

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
    
    if (!name) {
      setError("Name is required.");
      setLoading(false);
      return;
    }

    const payload: any = {
      table: "cargo_names",
      id: cargo?.id,
      name,
      is_public: isPublic,
    };

    if (isSuperAdmin) {
      payload.tenant_id = tenantId;
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
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} cargo`);
      }

      alert(`Cargo ${isEditMode ? "updated" : "added"} successfully!`);
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
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Cargo Name" : "Add New Cargo Name"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Cargo")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
