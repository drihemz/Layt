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
import { useTenant } from "@/lib/tenant-context";

interface CharterParty {
  id?: string;
  name?: string;
  charter_party_type?: string;
  signed_date?: string;
  document_url?: string;
}

interface CharterPartyDialogProps {
  charterParty?: CharterParty | null;
  children: React.ReactNode;
}

export function CharterPartyDialog({ charterParty, children }: CharterPartyDialogProps) {
  const router = useRouter();
  const { tenantId } = useTenant();
  const [formData, setFormData] = useState<CharterParty>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!charterParty?.id;

  useEffect(() => {
    if (isEditMode) {
      setFormData(charterParty);
    } else {
      setFormData({ name: '', charter_party_type: '', signed_date: '', document_url: '' });
    }
  }, [charterParty, isEditMode, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenantId) {
      setError("No tenant context available.");
      return;
    }
    if (!formData.name) {
      setError("Name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const processedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value === '' ? null : value])
    );

    const payload = {
      table: "charterParties",
      tenant_id: tenantId,
      id: charterParty?.id,
      ...processedData,
    };

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
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} charter party`);
      }

      alert(`Charter Party ${isEditMode ? "updated" : "added"} successfully!`);
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
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700 text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Charter Party" : "Add New Charter Party"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="name">Name / Code</Label>
              <Input id="name" value={formData.name || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charter_party_type">Type (e.g., Voyage, Time)</Label>
              <Input id="charter_party_type" value={formData.charter_party_type || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="signed_date">Date Signed</Label>
              <Input id="signed_date" type="date" value={formData.signed_date || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="document_url">Document URL</Label>
              <Input id="document_url" value={formData.document_url || ""} onChange={handleChange} className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Charter Party")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
