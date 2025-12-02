import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoicesManager from "@/components/admin/InvoicesManager";

export const revalidate = 0;

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const supabase = createServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, tenants(name), plans(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-600">View and update invoice statuses.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <InvoicesManager initialInvoices={invoices || []} />
      </div>
    </div>
  );
}
