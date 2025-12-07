import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLookupData } from "@/lib/data-access";
import { redirect } from "next/navigation";
import { getTenantPlanUsage } from "@/lib/tenant-plan";
import PartiesTabContent from "@/components/data/PartiesTabContent";
import VesselsTabContent from "@/components/data/VesselsTabContent";
import PortsTabContent from "@/components/data/PortsTabContent";
import CargoTabContent from "@/components/data/CargoTabContent";
import CharterPartiesTabContent from "@/components/data/CharterPartiesTabContent";
import TermsTabContent from "@/components/data/TermsTabContent";
import RequestsTabContent from "@/components/data/RequestsTabContent";
import SofBatchUpload from "@/components/data/SofBatchUpload";

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

  let planUsage = null as any;
  if (session.user.tenantId) {
    planUsage = await getTenantPlanUsage(session.user.tenantId);
  }

  const { parties, vessels, ports, cargoNames, charterParties, terms } = await getLookupData(session);

  const allowedTabs = planUsage?.allow_data_management !== false;
  const tabFlags = planUsage?.data_tabs || {};
  const tabOrder = ["parties","vessels","ports","cargo","charterParties","terms","requests", "sofBatch"];
  const enabledTabs = tabOrder.filter((k) => tabFlags[k] !== false);
  const firstEnabled = enabledTabs[0];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Data Management</h1>
      </div>

      {!allowedTabs && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 border border-red-200">
          Data Management is not included in this tenant's plan.
        </div>
      )}

      <Tabs defaultValue={firstEnabled || "parties"} value={firstEnabled ? undefined : "none"} className="w-full">
        <TabsList className={`grid w-full ${session.user.role === "super_admin" ? "grid-cols-8" : "grid-cols-7"}`}>
          <TabsTrigger value="parties" disabled={!allowedTabs || tabFlags.parties === false}>Parties</TabsTrigger>
          <TabsTrigger value="vessels" disabled={!allowedTabs || tabFlags.vessels === false}>Vessels</TabsTrigger>
          <TabsTrigger value="ports" disabled={!allowedTabs || tabFlags.ports === false}>Ports</TabsTrigger>
          <TabsTrigger value="cargo" disabled={!allowedTabs || tabFlags.cargo === false}>Cargo</TabsTrigger>
          <TabsTrigger value="charterParties" disabled={!allowedTabs || tabFlags.charterParties === false}>Charter Parties</TabsTrigger>
          <TabsTrigger value="terms" disabled={!allowedTabs || tabFlags.terms === false}>Terms</TabsTrigger>
          {(session.user.role === "customer_admin" || session.user.role === "super_admin") && (
            <TabsTrigger value="requests" disabled={!allowedTabs || tabFlags.requests === false}>Requests</TabsTrigger>
          )}
          {session.user.role === "super_admin" && (
            <TabsTrigger value="sofBatch" disabled={!allowedTabs}>SOF Batch</TabsTrigger>
          )}
        </TabsList>

        {!allowedTabs ? (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
            Data Management is disabled by the current plan.
          </div>
        ) : !firstEnabled ? (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
            All data tabs are disabled for this plan.
          </div>
        ) : (
          <>
            <TabsContent value="parties">
              <PartiesTabContent parties={parties} session={session} />
            </TabsContent>

            <TabsContent value="vessels">
              <VesselsTabContent vessels={vessels} parties={parties} session={session} />
            </TabsContent>

            <TabsContent value="ports">
              <PortsTabContent ports={ports} session={session} />
            </TabsContent>
            
            <TabsContent value="cargo">
              <CargoTabContent cargoNames={cargoNames} session={session} />
            </TabsContent>

            <TabsContent value="charterParties">
              <CharterPartiesTabContent charterParties={charterParties} session={session} />
            </TabsContent>

            <TabsContent value="terms">
              <TermsTabContent terms={terms} session={session} />
            </TabsContent>

            {(session.user.role === "customer_admin" || session.user.role === "super_admin") && (
              <TabsContent value="requests">
                <RequestsTabContent session={session} />
              </TabsContent>
            )}

            {session.user.role === "super_admin" && (
              <TabsContent value="sofBatch">
                <SofBatchUpload />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
