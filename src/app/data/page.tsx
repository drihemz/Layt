import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase"; // Use the server client directly
import { redirect } from "next/navigation";
import PartiesTabContent from "@/components/data/PartiesTabContent";
import VesselsTabContent from "@/components/data/VesselsTabContent";
import PortsTabContent from "@/components/data/PortsTabContent";
import CargoTabContent from "@/components/data/CargoTabContent";
import CharterPartiesTabContent from "@/components/data/CharterPartiesTabContent";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export const revalidate = 0; // Prevent caching

async function getData(tenantId: string, isSuperAdmin: boolean) {
  const supabase = createServerClient();

  const buildQuery = (table: string) => {
    let query = supabase.from(table).select('*');
    if (isSuperAdmin) {
      // Super admin can see all data
    } else {
      query = query.or(`tenant_id.eq.${tenantId},is_public.eq.true`);
    }
    return query.order('name');
  };

  const [partiesRes, vesselsRes, portsRes, cargoNamesRes, charterPartiesRes] = await Promise.all([
    buildQuery('parties'),
    buildQuery('vessels'),
    buildQuery('ports'),
    buildQuery('cargo_names'),
    buildQuery('charter_parties'),
  ]);
  
  if (partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error) {
    console.error("Error fetching data:", partiesRes.error || vesselsRes.error || portsRes.error || cargoNamesRes.error || charterPartiesRes.error);
    return { parties: [], vessels: [], ports: [], cargoNames: [], charterParties: [] };
  }

  return {
    parties: partiesRes.data || [],
    vessels: vesselsRes.data || [],
    ports: portsRes.data || [],
    cargoNames: cargoNamesRes.data || [],
    charterParties: charterPartiesRes.data || [],
  };
}

export default async function DataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { tenantId, role } = session.user;
  const isSuperAdmin = role === 'super_admin';

  if (!tenantId && !isSuperAdmin) {
    redirect("/auth/login");
  }

  const { parties, vessels, ports, cargoNames, charterParties } = await getData(tenantId!, isSuperAdmin);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Data Management</h1>
      </div>

      <Tabs defaultValue="parties" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="vessels">Vessels</TabsTrigger>
          <TabsTrigger value="ports">Ports</TabsTrigger>
          <TabsTrigger value="cargo">Cargo</TabsTrigger>
          <TabsTrigger value="charterParties">Charter Parties</TabsTrigger>
        </TabsList>

        {/* Parties Tab */}
        <TabsContent value="parties">
          <PartiesTabContent parties={parties} session={session} />
        </TabsContent>

        {/* Vessels Tab */}
        <TabsContent value="vessels">
          <VesselsTabContent vessels={vessels} parties={parties} session={session} />
        </TabsContent>

        {/* Ports Tab */}
        <TabsContent value="ports">
          <PortsTabContent ports={ports} session={session} />
        </TabsContent>
        
        {/* Cargo Tab */}
        <TabsContent value="cargo">
          <CargoTabContent cargoNames={cargoNames} session={session} />
        </TabsContent>

        {/* Charter Parties Tab */}
        <TabsContent value="charterParties">
          <CharterPartiesTabContent charterParties={charterParties} session={session} />
        </TabsContent>

      </Tabs>
    </div>
  );
}
