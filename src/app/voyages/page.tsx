import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import VoyagesClientPage from "@/components/voyages/VoyagesClientPage";

const PAGE_SIZE = 10;

async function getVoyagesData(tenantId: string, search: string, page: number) {
  const supabase = createServerClient();

  // Fetch voyages
  let voyagesQuery = supabase
    .from("voyages")
    .select(`
      id, voyage_reference, vessel_id, voyage_number, created_at,
      vessels(name),
      owner:owner_id(name),
      charterer:charterer_id(name),
      cargo_names(name)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  
  if (search) {
    voyagesQuery = voyagesQuery.ilike("voyage_reference", `%${search}%`);
  }

  // Fetch lookups in parallel
  const [voyagesRes, partiesRes, vesselsRes, cargoNamesRes, charterPartiesRes] = await Promise.all([
    voyagesQuery,
    supabase.from("parties").select("*").eq("tenant_id", tenantId),
    supabase.from("vessels").select("*").eq("tenant_id", tenantId),
    supabase.from("cargo_names").select("*").eq("tenant_id", tenantId),
    supabase.from("charter_parties").select("*").eq("tenant_id", tenantId),
  ]);

  if (voyagesRes.error) {
    console.error("Error fetching voyages:", voyagesRes.error);
  }

  const lookups = {
    parties: partiesRes.data || [],
    vessels: vesselsRes.data || [],
    cargoNames: cargoNamesRes.data || [],
    charterParties: charterPartiesRes.data || [],
  };

  return { voyages: voyagesRes.data || [], lookups };
}

export default async function VoyagesPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/auth/login");
  }

  const search = typeof searchParams?.q === 'string' ? searchParams.q : '';
  const page = typeof searchParams?.page === 'string' ? parseInt(searchParams.page, 10) : 1;

  const { voyages, lookups } = await getVoyagesData(session.user.tenantId, search, page);

  return (
    <VoyagesClientPage
      voyages={voyages}
      lookups={lookups}
      page={page}
      pageSize={PAGE_SIZE}
      search={search}
      session={session}
    />
  );
}
