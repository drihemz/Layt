"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  period_start?: string | null;
  period_end?: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  due_date?: string | null;
  tenants?: { name?: string | null } | null;
  plans?: { name?: string | null } | null;
};

export default function InvoicesManager({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const formatMoney = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);

  const markPaid = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "paid" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status: "paid" } : i)));
    } catch (e: any) {
      alert(e.message || "Failed to update invoice");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2">Tenant</th>
            <th className="text-left px-3 py-2">Plan</th>
            <th className="text-left px-3 py-2">Period</th>
            <th className="text-left px-3 py-2">Amount</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Due</th>
            <th className="text-left px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-3 py-2">{inv.tenants?.name || "Tenant"}</td>
              <td className="px-3 py-2">{inv.plans?.name || "Plan"}</td>
              <td className="px-3 py-2">
                {inv.period_start || "—"} {inv.period_end ? `→ ${inv.period_end}` : ""}
              </td>
              <td className="px-3 py-2">{formatMoney(inv.amount_cents, inv.currency)}</td>
              <td className="px-3 py-2 capitalize">{inv.status}</td>
              <td className="px-3 py-2">{inv.due_date || "—"}</td>
              <td className="px-3 py-2">
                {inv.status !== "paid" && (
                  <Button size="sm" variant="outline" disabled={loadingId === inv.id} onClick={() => markPaid(inv.id)}>
                    {loadingId === inv.id ? "Updating..." : "Mark Paid"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
