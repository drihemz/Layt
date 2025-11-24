import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { redirect } from "next/navigation";

async function getStats(tenantId: string) {
  const supabase = createServerClient();

  const [
    voyagesCount,
    claimsCount,
    activeClaimsCount,
    claimsData,
    recentVoyages,
    recentClaims,
  ] = await Promise.all([
    supabase
      .from("voyages")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("claims")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("claim_status", "in_progress"),
    supabase
      .from("claims")
      .select("amount_in_discussion")
      .eq("tenant_id", tenantId),
    supabase
      .from("voyages")
      .select("voyage_reference, vessel_id, created_at, vessels(name)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("claims")
      .select("claim_reference, claim_status, amount_in_discussion, amount_type, created_at, voyages(voyage_reference)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalAmount = claimsData.data?.reduce(
    (sum, claim) => sum + (claim.amount_in_discussion || 0),
    0
  ) || 0;

  return {
    totalVoyages: voyagesCount.count || 0,
    totalClaims: claimsCount.count || 0,
    activeClaims: activeClaimsCount.count || 0,
    totalAmount,
    recentVoyages: recentVoyages.data || [],
    recentClaims: recentClaims.data || [],
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }
  
  // Super admin gets redirected to their own dashboard
  if (session.user.role === 'super_admin') {
    redirect('/admin');
  }

  // Regular users need a tenantId
  if (!session.user.tenantId) {
    // This can happen if a user exists but has no tenant.
    // Redirect them to login to be safe and clear state.
    redirect("/auth/login");
  }

  const stats = await getStats(session.user.tenantId);

  return <DashboardClient initialStats={stats} session={session} />;
}
