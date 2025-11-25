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

  const [partiesRes, vesselsRes, portsRes, cargoNamesRes, charterPartiesRes, tenantsRes] = await Promise.all([
    supabase.from("parties").select('*, tenants(name)'),
    supabase.from("vessels").select('*, tenants(name)'),
    supabase.from("ports").select('*, tenants(name)'),
    supabase.from("cargo_names").select('*, tenants(name)'),
    supabase.from("charter_parties").select('*, tenants(name)'),
    session.user.role === 'super_admin' ? supabase.from('tenants').select('*') : Promise.resolve({ data: [] }),
  ]);

  if (partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error || tenantsRes.error) {
    console.error("Error fetching lookup data:", partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error || tenantsRes.error);
    return { parties: [], vessels: [], ports: [], cargoNames: [], charterParties: [], tenants: [] };
  }

  return {
    parties: partiesRes.data || [],
    vessels: vesselsRes.data || [],
    ports: portsRes.data || [],
    cargoNames: cargoNamesRes.data || [],
    charterParties: charterPartiesRes.data || [],
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
