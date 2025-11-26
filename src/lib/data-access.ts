import { createServerClient } from "@/lib/supabase";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Session } from "next-auth";

export function getSupabaseClient(session: Session): SupabaseClient {
  if (session.user.role === 'super_admin') {
    return createServerClient();
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${session.supabaseAccessToken}`,
        },
      },
    }
  );
}

export async function getLookupData(session: Session) {
  const supabase = getSupabaseClient(session);

  const [partiesRes, vesselsRes, portsRes, cargoNamesRes, charterPartiesRes, termsRes, tenantsRes] = await Promise.all([
    supabase.from("parties").select('*'),
    supabase.from("vessels").select('*'),
    supabase.from("ports").select('*'),
    supabase.from("cargo_names").select('*'),
    supabase.from("charter_parties").select('*'),
    supabase.from("terms").select('*'),
    session.user.role === 'super_admin' ? supabase.from('tenants').select('*') : Promise.resolve({ data: [] }),
  ]);

  if (partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error || termsRes.error || tenantsRes.error) {
    console.error("Error fetching lookup data:", partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error || termsRes.error || tenantsRes.error);
    return { parties: [], vessels: [], ports: [], cargoNames: [], charterParties: [], terms: [], tenants: [] };
  }

  const tenantMap = new Map<string, string>();
  (tenantsRes.data || []).forEach((t: any) => tenantMap.set(t.id, t.name));

  const attachTenantName = (rows: any[]) =>
    (rows || []).map((row) => ({
      ...row,
      tenantName: row.tenant_id ? tenantMap.get(row.tenant_id) || null : null,
    }));

  return {
    parties: attachTenantName(partiesRes.data || []),
    vessels: attachTenantName(vesselsRes.data || []),
    ports: attachTenantName(portsRes.data || []),
    cargoNames: attachTenantName(cargoNamesRes.data || []),
    charterParties: attachTenantName(charterPartiesRes.data || []),
    terms: attachTenantName(termsRes.data || []),
    tenants: tenantsRes.data || [],
  };
}

export async function getVoyages(session: Session, search: string, page: number, pageSize: number) {
  const supabase = getSupabaseClient(session);

  let query = supabase
    .from("voyages")
    .select(`
      id, voyage_reference, vessel_id, voyage_number, created_at,
      vessels(name),
      owner:owner_id(name),
      charterer:charterer_id(name),
      cargo_names(name)
    `)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  
  if (search) {
    query = query.ilike("voyage_reference", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching voyages:", error);
    return [];
  }

  return data;
}
