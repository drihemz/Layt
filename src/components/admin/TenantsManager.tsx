"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Tenant = { id: string; name: string; slug?: string | null; subscription_tier?: string | null; is_active?: boolean };
type Plan = { id: string; name: string };
type TenantPlan = {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  seats_admins?: number | null;
  seats_operators?: number | null;
};

export default function TenantsManager({
  tenants,
  plans,
  tenantPlans,
  usageMap,
}: {
  tenants: Tenant[];
  plans: Plan[];
  tenantPlans: TenantPlan[];
  usageMap: Record<
    string,
    {
      usage: { admins: number; operators: number; voyages: number; claims: number; claims_month: number };
      seats_admins?: number | null;
      seats_operators?: number | null;
      max_voyages?: number | null;
      max_claims?: number | null;
      max_claims_per_month?: number | null;
    }
  >;
}) {
  const [rows, setRows] = useState<Record<string, TenantPlan>>(
    tenantPlans.reduce((acc, tp) => ({ ...acc, [tp.tenant_id]: tp }), {} as Record<string, TenantPlan>)
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  const saveRow = async (tenantId: string) => {
    const payload = rows[tenantId];
    if (!payload?.plan_id) {
      alert("Select a plan first.");
      return;
    }
    setSavingId(tenantId);
    try {
      const res = await fetch("/api/admin/tenant-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          plan_id: payload.plan_id,
          status: payload.status || "active",
          seats_admins: payload.seats_admins ?? null,
          seats_operators: payload.seats_operators ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setRows((prev) => ({ ...prev, [tenantId]: json.tenantPlan }));
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setSavingId(null);
    }
  };

  const updateField = (tenantId: string, field: keyof TenantPlan, value: any) => {
    setRows((prev) => ({
      ...prev,
      [tenantId]: {
        ...prev[tenantId],
        tenant_id: tenantId,
        [field]: value,
      } as TenantPlan,
    }));
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/40 overflow-x-auto">
      <table className="min-w-full text-sm text-white">
        <thead className="bg-gray-800/70">
          <tr>
            <th className="px-3 py-2 text-left">Tenant</th>
            <th className="px-3 py-2 text-left">Plan</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Admins</th>
            <th className="px-3 py-2 text-left">Operators</th>
            <th className="px-3 py-2 text-left">Usage</th>
            <th className="px-3 py-2 text-left">Save</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => {
            const row = rows[t.id] || { tenant_id: t.id, plan_id: "", status: "active" };
            const usage = usageMap[t.id];
            const fmt = (val?: number | null) => (val === null || val === undefined ? "∞" : val);
            return (
              <tr key={t.id} className="border-t border-gray-700">
                <td className="px-3 py-2 font-semibold">{t.name}</td>
                <td className="px-3 py-2">
                  <Select value={row.plan_id || ""} onValueChange={(v) => updateField(t.id, "plan_id", v)}>
                    <SelectTrigger className="w-44 bg-gray-900 border-gray-700">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white">
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Select value={row.status || "active"} onValueChange={(v) => updateField(t.id, "status", v)}>
                    <SelectTrigger className="w-32 bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    className="w-24 bg-gray-900 border-gray-700"
                    value={row.seats_admins ?? ""}
                    onChange={(e) => updateField(t.id, "seats_admins", e.target.value ? Number(e.target.value) : null)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    className="w-24 bg-gray-900 border-gray-700"
                    value={row.seats_operators ?? ""}
                    onChange={(e) => updateField(t.id, "seats_operators", e.target.value ? Number(e.target.value) : null)}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-gray-200">
                  {usage ? (
                    <>
                      <div>Admins {usage.usage.admins}/{fmt(usage.seats_admins)}</div>
                      <div>Operators {usage.usage.operators}/{fmt(usage.seats_operators)}</div>
                      <div>Voyages {usage.usage.voyages}/{fmt(usage.max_voyages)}</div>
                      <div>Claims {usage.usage.claims}/{fmt(usage.max_claims)}</div>
                      <div>Claims/mo {usage.usage.claims_month}/{fmt(usage.max_claims_per_month)}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" onClick={() => saveRow(t.id)} disabled={savingId === t.id}>
                    {savingId === t.id ? "Saving..." : "Save"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
