import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateTenantDialog } from "@/components/admin/CreateTenantDialog";
import TenantsManager from "@/components/admin/TenantsManager";
import { getTenantPlanUsage } from "@/lib/tenant-plan";

export const revalidate = 0;

async function getAllTenants() {
  const supabase = createServerClient();
  const { data: tenants, error } = await supabase.from("tenants").select("*");
  if (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
  return tenants;
}

async function getPlans() {
  const supabase = createServerClient();
  const { data: plans, error } = await supabase.from("plans").select("id,name").eq("status", "active");
  if (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
  return plans;
}

async function getTenantPlans() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("tenant_plans").select("*");
  if (error) {
    console.error("Error fetching tenant plans:", error);
    return [];
  }
  return data;
}

export default async function TenantsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const [tenants, plans, tenantPlans] = await Promise.all([getAllTenants(), getPlans(), getTenantPlans()]);
  const usageEntries = await Promise.all(tenants.map((t) => getTenantPlanUsage(t.id)));
  const usageMap = usageEntries.reduce((acc, u) => {
    acc[u.tenant_id] = {
      usage: u.usage,
      seats_admins: u.seats_admins,
      seats_operators: u.seats_operators,
      max_voyages: u.max_voyages,
      max_claims: u.max_claims,
      max_claims_per_month: u.max_claims_per_month,
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Tenants</h2>
        <CreateTenantDialog />
      </div>
      <TenantsManager tenants={tenants} plans={plans} tenantPlans={tenantPlans} usageMap={usageMap} />
    </div>
  );
}
