import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function loadVoyage(voyageId: string, tenantId?: string, role?: string) {
  const supabase = createServerClient();
  let voyageQuery = supabase
    .from("voyages")
    .select(
      `
        id, voyage_reference, tenant_id, voyage_number, cargo_quantity,
        vessels(name),
        owner:owner_id(name),
        charterer:charterer_id(name),
        cargo_names(name),
        port_calls(id, port_name, activity, sequence, eta, etd, status, notes)
      `
    )
    .eq("id", voyageId)
    .single();
  const { data: voyage, error } = await voyageQuery;
  if (error || !voyage) return null;
  if (role !== "super_admin" && tenantId && voyage.tenant_id !== tenantId) return null;

  const claimsQuery = supabase
    .from("claims")
    .select("id, claim_reference, claim_status, port_call_id")
    .eq("voyage_id", voyageId);
  const { data: claims } = await claimsQuery;

  return { voyage, claims: claims || [] };
}

export default async function VoyageDetailPage({ params }: { params: { voyageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const data = await loadVoyage(params.voyageId, session.user.tenantId, session.user.role);
  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Voyage not found or access denied.</p>
      </div>
    );
  }

  const { voyage, claims } = data;
  const claimsByPort: Record<string, any[]> = {};
  claims.forEach((c) => {
    const key = c.port_call_id || "unassigned";
    claimsByPort[key] = claimsByPort[key] || [];
    claimsByPort[key].push(c);
  });

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Voyage</p>
          <h1 className="text-3xl font-bold text-slate-900">{voyage.voyage_reference}</h1>
          <p className="text-sm text-slate-600">
            Vessel: {voyage.vessels?.name || "—"} · Cargo: {voyage.cargo_names?.name || "—"} ({voyage.cargo_quantity || "—"})
          </p>
        </div>
        <Link className="text-blue-700" href="/voyages">Back to Voyages</Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Port Calls</h2>
          <Link className="text-blue-700 text-sm" href={`/port-calls/${voyage.port_calls?.[0]?.id || ""}`}>
            View first port call
          </Link>
        </div>
        {(!voyage.port_calls || voyage.port_calls.length === 0) ? (
          <p className="text-sm text-slate-500">No port calls yet.</p>
        ) : (
          <div className="space-y-3">
            {voyage.port_calls
              .slice()
              .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
              .map((pc: any) => (
                <div key={pc.id} className="p-3 border rounded-lg bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {pc.sequence || ""} {pc.port_name} ({pc.activity})
                      </p>
                      <p className="text-xs text-slate-500">
                        ETA {pc.eta || "—"} · ETD {pc.etd || "—"} · {pc.status || "planned"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link className="text-blue-700 text-sm" href={`/port-calls/${pc.id}`}>Open</Link>
                      <Link className="text-blue-700 text-sm" href={`/claims?voyageId=${voyage.id}&portCallId=${pc.id}&openCreate=1`}>Create Claim</Link>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-slate-600">Claims</p>
                    {claimsByPort[pc.id]?.length ? (
                      <ul className="text-sm text-slate-800 space-y-1">
                        {claimsByPort[pc.id].map((c) => (
                          <li key={c.id} className="flex items-center justify-between">
                            <span>{c.claim_reference} ({c.claim_status})</span>
                            <Link className="text-blue-700 text-xs" href={`/claims/${c.id}/calculation`}>Open</Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No claims for this port call.</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-slate-800">Claims (unassigned to port call)</h2>
        {claimsByPort["unassigned"]?.length ? (
          <ul className="text-sm text-slate-800 space-y-1">
            {claimsByPort["unassigned"].map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{c.claim_reference} ({c.claim_status})</span>
                <Link className="text-blue-700 text-xs" href={`/claims/${c.id}/calculation`}>Open</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No unassigned claims.</p>
        )}
      </div>
    </div>
  );
}
