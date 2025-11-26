"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Session } from "next-auth";

interface Term {
  id?: string;
  name?: string;
  window_start_day?: string | null;
  window_start_time?: string | null;
  window_end_day?: string | null;
  window_end_time?: string | null;
  notes?: string | null;
  is_public?: boolean;
  tenant_id?: string | null;
  include_holidays?: boolean | null;
}

interface Tenant {
  id: string;
  name: string;
}

export function TermDialog({ term, children, session }: { term?: Term | null; children: React.ReactNode; session: Session }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Term>({});
  const [isPublic, setIsPublic] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [includeHolidays, setIncludeHolidays] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!term?.id;
  const isSuperAdmin = session.user.role === "super_admin";

  useEffect(() => {
    if (isEditMode) {
      setFormData(term || {});
      setIsPublic(term?.is_public || false);
      setIncludeHolidays(!!term?.include_holidays);
      if (isSuperAdmin && term?.tenant_id) setSelectedTenantId(term.tenant_id);
    } else {
      setFormData({ name: "", notes: "" });
      setIsPublic(false);
      setIncludeHolidays(false);
      setSelectedTenantId("");
    }

    async function fetchTenants() {
      if (isSuperAdmin) {
        try {
          const response = await fetch('/api/admin/tenants');
          if (response.ok) {
            const data = await response.json();
            setTenants(data.tenants);
          }
        } catch (e) {
          console.error("Error fetching tenants", e);
        }
      }
    }
    if (open) fetchTenants();
  }, [term, isEditMode, open, isSuperAdmin]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.name) {
      setError("Name is required.");
      setLoading(false);
      return;
    }

    const payload: any = {
      table: "terms",
      id: term?.id,
      name: formData.name,
      window_start_day: formData.window_start_day || null,
      window_start_time: formData.window_start_time || null,
      window_end_day: formData.window_end_day || null,
      window_end_time: formData.window_end_time || null,
      notes: formData.notes || null,
      is_public: isPublic,
      include_holidays: includeHolidays,
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
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "add"} term`);
      }

      alert(`Term ${isEditMode ? "updated" : "added"} successfully!`);
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
            <DialogTitle>{isEditMode ? "Edit Term" : "Add New Term"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit the details of the term." : "Fill in the details for the new term."}
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

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name || ""} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="bg-gray-800 border-gray-600" />
            </div>

            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Window Start Day</Label>
              <Select
                value={formData.window_start_day || ""}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, window_start_day: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white">
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Window Start Time</Label>
              <Input type="time" value={formData.window_start_time || ""} onChange={(e) => setFormData((prev) => ({ ...prev, window_start_time: e.target.value }))} className="bg-gray-800 border-gray-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Window End Day</Label>
              <Select
                value={formData.window_end_day || ""}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, window_end_day: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white">
                  {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Window End Time</Label>
              <Input type="time" value={formData.window_end_time || ""} onChange={(e) => setFormData((prev) => ({ ...prev, window_end_time: e.target.value }))} className="bg-gray-800 border-gray-600" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={formData.notes || ""} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} className="bg-gray-800 border-gray-600" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="holidays" checked={includeHolidays} onCheckedChange={(c) => setIncludeHolidays(!!c)} />
              <Label htmlFor="holidays">Include holiday deductions?</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => { setOpen(false); }} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Term")}</Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
