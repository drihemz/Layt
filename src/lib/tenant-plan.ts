import { createServerClient } from "@/lib/supabase";

export type TenantPlanUsage = {
  tenant_id: string;
  plan_id: string | null;
  plan_name?: string | null;
  allow_data_management?: boolean;
  data_tabs?: Record<string, boolean>;
  max_voyages?: number | null;
  max_claims?: number | null;
  max_claims_per_month?: number | null;
  seats_admins?: number | null;
  seats_operators?: number | null;
  usage: {
    admins: number;
    operators: number;
    voyages: number;
    claims: number;
    claims_month: number;
  };
};

export async function getTenantPlanUsage(tenantId: string): Promise<TenantPlanUsage> {
  const supabase = createServerClient();

  const [{ data: tp }] = await Promise.all([
    supabase
      .from("tenant_plans")
      .select("tenant_id, plan_id, status, seats_admins, seats_operators, plans(name, allow_data_management, data_tabs, max_voyages, max_claims, max_claims_per_month)")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const plan = Array.isArray(tp?.plans) ? tp?.plans[0] : tp?.plans;

  // usage counts
  const [adminsCount, operatorsCount, voyagesCount, claimsCount, claimsMonthCount] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "customer_admin").eq("is_active", true),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role", "operator").eq("is_active", true),
    supabase.from("voyages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("claims").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    (async () => {
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0,0,0,0);
      const end = new Date(start); end.setUTCMonth(start.getUTCMonth() + 1);
      const { count } = await supabase
        .from("claims")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      return { count };
    })(),
  ]);

  return {
    tenant_id: tenantId,
    plan_id: tp?.plan_id || null,
    plan_name: plan?.name || null,
    allow_data_management: plan?.allow_data_management ?? true,
    data_tabs: (plan?.data_tabs as any) || {},
    max_voyages: plan?.max_voyages ?? null,
    max_claims: plan?.max_claims ?? null,
    max_claims_per_month: plan?.max_claims_per_month ?? null,
    seats_admins: tp?.seats_admins ?? null,
    seats_operators: tp?.seats_operators ?? null,
    usage: {
      admins: adminsCount.count || 0,
      operators: operatorsCount.count || 0,
      voyages: voyagesCount.count || 0,
      claims: claimsCount.count || 0,
      claims_month: claimsMonthCount.count || 0,
    },
  };
}
