import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Super Admin Dashboard</h1>
          <p className="text-sm text-slate-600">High-level business and operations insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Tenants" value={metrics.tenants} />
        <Card title="Users" value={metrics.users} />
        <Card title="Voyages" value={metrics.voyages} />
        <Card title="Claims" value={metrics.claims} />
        <Card title="Invoices Due/Overdue" value={formatMoney(metrics.totalDue)} highlight />
        <Card title="Invoices Paid" value={formatMoney(metrics.totalPaid)} />
      </div>
    </div>
  );
}

function Card({ title, value, highlight }: { title: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border shadow-sm ${highlight ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
