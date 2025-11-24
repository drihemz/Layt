"use client";

import { useState } from "react";
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

export function CreateTenantDialog() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate slug from name
    setSlug(newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, adminName, adminEmail, adminPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tenant');
      }

      setOpen(false);
      router.refresh();
      alert('Tenant created successfully!');
      
      // Reset form
      setName("");
      setSlug("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Tenant</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl bg-gray-900 border-gray-700 text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new tenant and their first admin user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Tenant Name
              </Label>
              <Input id="name" value={name} onChange={handleNameChange} className="col-span-3 bg-gray-800 border-gray-600" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="slug" className="text-right">
                Slug
              </Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600" />
            </div>
            <hr className="col-span-4 border-gray-600 my-2" />
            <h3 className="col-span-4 text-md font-semibold text-center text-gray-300">Customer Admin</h3>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminName" className="text-right">
                Full Name
              </Label>
              <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminEmail" className="text-right">
                Email
              </Label>
              <Input id="adminEmail" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adminPassword" className="text-right">
                Password
              </Label>
              <Input id="adminPassword" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="col-span-3 bg-gray-800 border-gray-600" />
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
