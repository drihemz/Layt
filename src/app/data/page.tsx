import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLookupData } from "@/lib/data-access";
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

export default async function DataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { parties, vessels, ports, cargoNames, charterParties } = await getLookupData(session);

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
