import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import ClaimsClient from "@/components/claims/ClaimsClient";

export const revalidate = 0;

type SearchParams = { [key: string]: string | string[] | undefined };

async function loadClaims(tenantId?: string, search?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("claims")
    .select("id, claim_reference, claim_status, operation_type, port_name, laycan_start, laycan_end, created_at, voyages(voyage_reference), tenant_id")
    .order("created_at", { ascending: false });

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  if (search) {
    query = query.ilike("claim_reference", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching claims", error);
    return [];
  }
  return data || [];
}

async function loadVoyages(tenantId?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("voyages")
    .select("id, voyage_reference, tenant_id, cargo_quantity, cargo_names(name), charter_parties(name)")
    .order("created_at", { ascending: false });
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching voyages", error);
    return [];
  }
  return data || [];
}

async function loadTerms(tenantId?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("terms")
    .select("id, name")
    .order("name", { ascending: true });
  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},is_public.eq.true`);
  } else {
    query = query.or("is_public.eq.true");
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching terms", error);
    return [];
  }
  return data || [];
}

export default async function ClaimsPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  const search = typeof searchParams?.q === "string" ? searchParams.q : "";
  const requestedTenant = typeof searchParams?.tenantId === "string" ? searchParams.tenantId : undefined;
  const tenantFilter = session.user.role === "super_admin" ? requestedTenant : session.user.tenantId;

  if (!tenantFilter && session.user.role !== "super_admin") {
    redirect("/auth/login");
  }

  const [claims, voyages, terms] = await Promise.all([
    loadClaims(tenantFilter, search),
    loadVoyages(tenantFilter),
    loadTerms(tenantFilter),
  ]);

  return (
    <ClaimsClient
      claims={claims}
      voyages={voyages}
      search={search}
      isSuperAdmin={session.user.role === "super_admin"}
      tenantIdFilter={tenantFilter || ""}
      terms={terms}
    />
  );
}
