"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  billing_cycle: string;
  max_admins?: number | null;
  max_operators?: number | null;
  allow_data_management?: boolean;
  max_voyages?: number | null;
  max_claims?: number | null;
  max_claims_per_month?: number | null;
  status: string;
};

export default function PlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [form, setForm] = useState<Partial<Plan>>({ billing_cycle: "monthly", currency: "USD", status: "active" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!form.id;

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form, price_cents: form.price_cents || 0 };
      const res = await fetch("/api/admin/plans", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save plan");
      if (isEditing) {
        setPlans((prev) => prev.map((p) => (p.id === json.plan.id ? json.plan : p)));
      } else {
        setPlans((prev) => [json.plan, ...prev]);
      }
      setForm({ billing_cycle: "monthly", currency: "USD", status: "active" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const money = (cents: number) => `$${((cents || 0) / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="border p-4 rounded-xl bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-3">{isEditing ? "Edit Plan" : "Create Plan"}</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid md:grid-cols-3 gap-3">
          {isEditing && (
            <div className="space-y-1">
              <Label>ID</Label>
              <Input value={form.id || ""} disabled />
            </div>
          )}
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Price (USD)</Label>
            <Input
              type="number"
              value={form.price_cents ? form.price_cents / 100 : ""}
              onChange={(e) => setForm((p) => ({ ...p, price_cents: Math.round(Number(e.target.value || 0) * 100) }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Billing Cycle</Label>
            <Select value={form.billing_cycle as any} onValueChange={(v) => setForm((p) => ({ ...p, billing_cycle: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Max Admins</Label>
            <Input type="number" value={form.max_admins ?? ""} onChange={(e) => setForm((p) => ({ ...p, max_admins: e.target.value ? Number(e.target.value) : null }))} />
          </div>
          <div className="space-y-1">
            <Label>Max Operators</Label>
            <Input type="number" value={form.max_operators ?? ""} onChange={(e) => setForm((p) => ({ ...p, max_operators: e.target.value ? Number(e.target.value) : null }))} />
          </div>
          <div className="space-y-1">
            <Label>Max Claims / Month</Label>
            <Input type="number" value={form.max_claims_per_month ?? ""} onChange={(e) => setForm((p) => ({ ...p, max_claims_per_month: e.target.value ? Number(e.target.value) : null }))} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status as any} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-1 md:col-span-3">
            <Label>Data Management</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.allow_data_management !== false} onChange={(e) => setForm((p) => ({ ...p, allow_data_management: e.target.checked }))} />
                Enable Data Management
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {["parties","vessels","ports","cargo","charterParties","terms","requests"].map((key) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.data_tabs ? (form.data_tabs as any)[key] !== false : true}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        data_tabs: { ...(p.data_tabs as any), [key]: e.target.checked },
                      }))
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Plan" : "Save Plan"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Price</th>
              <th className="text-left px-3 py-2">Cycle</th>
              <th className="text-left px-3 py-2">Admins</th>
              <th className="text-left px-3 py-2">Operators</th>
              <th className="text-left px-3 py-2">Claims/Month</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2 font-semibold">{p.name}</td>
                <td className="px-3 py-2">{money(p.price_cents)}</td>
                <td className="px-3 py-2 capitalize">{p.billing_cycle}</td>
                <td className="px-3 py-2">{p.max_admins ?? "—"}</td>
                <td className="px-3 py-2">{p.max_operators ?? "—"}</td>
                <td className="px-3 py-2">{p.max_claims_per_month ?? "—"}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...p })}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
