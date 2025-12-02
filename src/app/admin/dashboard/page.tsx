import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

async function loadMetrics() {
  const supabase = createServerClient();
  const [
    tenantsCount,
    usersCount,
    voyagesCount,
    claimsCount,
    invoices,
  ] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("voyages").select("id", { count: "exact", head: true }),
    supabase.from("claims").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("amount_cents,status"),
  ]);

  const invoiceData = invoices.data || [];
  const totalDue = invoiceData
    .filter((i) => i.status === "due" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0);
  const totalPaid = invoiceData
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.amount_cents || 0), 0);

  return {
    tenants: tenantsCount.count || 0,
    users: usersCount.count || 0,
    voyages: voyagesCount.count || 0,
    claims: claimsCount.count || 0,
    totalDue,
    totalPaid,
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const metrics = await loadMetrics();
  const formatMoney = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-[#0b1c3a] via-[#123b7a] to-[#0fa3c8] text-white rounded-3xl p-6 shadow-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide opacity-80">Super Admin</p>
            <h1 className="text-3xl font-bold">Business Overview</h1>
            <p className="text-sm opacity-80">Health of tenants, usage, and billing at a glance.</p>
          </div>
          <ArrowUpRight className="w-8 h-8 opacity-80" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Tenants" value={metrics.tenants} accent="from-[#1f5da8] to-[#0fa3c8]" />
        <Card title="Users" value={metrics.users} accent="from-[#0f6d82] to-[#1294a6]" />
        <Card title="Voyages" value={metrics.voyages} accent="from-[#17694c] to-[#1a8c64]" />
        <Card title="Claims" value={metrics.claims} accent="from-[#b45c1d] to-[#d8742b]" />
        <Card title="Invoices Due/Overdue" value={formatMoney(metrics.totalDue)} accent="from-[#c13232] to-[#d8742b]" highlight />
        <Card title="Invoices Paid" value={formatMoney(metrics.totalPaid)} accent="from-slate-500 to-slate-600" />
      </div>
    </div>
  );
}

function Card({ title, value, accent, highlight }: { title: string; value: string | number; accent: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border shadow-sm bg-white relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-10`} />
      <div className="relative">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${highlight ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      </div>
    </div>
  );
}
