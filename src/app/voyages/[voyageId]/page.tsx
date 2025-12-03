import { createServerClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PortCallTimeline } from "@/components/voyages/PortCallTimeline";

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

  // Normalize single relations (Supabase can return arrays for joins)
  const normalizedVoyage: any = {
    ...voyage,
    vessels: Array.isArray(voyage.vessels) ? voyage.vessels[0] : voyage.vessels || null,
    cargo_names: Array.isArray(voyage.cargo_names) ? voyage.cargo_names[0] : voyage.cargo_names || null,
    owner: Array.isArray(voyage.owner) ? voyage.owner[0] : voyage.owner || null,
    charterer: Array.isArray(voyage.charterer) ? voyage.charterer[0] : voyage.charterer || null,
  };

  const claimsQuery = supabase
    .from("claims")
    .select("id, claim_reference, claim_status, port_call_id, qc_reviewer_id, qc_reviewer:users!qc_reviewer_id(full_name)")
    .eq("voyage_id", voyageId);
  const { data: claims } = await claimsQuery;

  return { voyage: normalizedVoyage, claims: claims || [] };
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

  const orderedPorts = (voyage.port_calls || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const upcoming = orderedPorts.filter((p: any) => p.status !== "completed");

  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Voyage</p>
          <h1 className="text-3xl font-extrabold text-slate-900">{voyage.voyage_reference}</h1>
          <p className="text-sm text-slate-600">Vessel: {voyage.vessels?.name || "—"} · Cargo: {voyage.cargo_names?.name || "—"} ({voyage.cargo_quantity || "—"})</p>
          <p className="text-xs text-slate-500">Owner: {voyage.owner?.name || "—"} · Charterer: {voyage.charterer?.name || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="text-sm font-semibold text-[#1f5da8]" href={`/claims?voyageId=${voyage.id}&openCreate=1`}>Create Claim</Link>
          <Link className="text-sm font-semibold text-[#1f5da8]" href="/voyages">Back</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Port Calls</h2>
            {orderedPorts.length > 0 && (
              <Link className="text-sm font-semibold text-[#1f5da8]" href={`/port-calls/${orderedPorts[0].id}`}>Open first</Link>
            )}
          </div>
          {orderedPorts.length === 0 ? (
            <p className="text-sm text-slate-500">No port calls yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-5">
              <div className="md:col-span-2">
                <PortCallTimeline ports={orderedPorts} />
              </div>
              <div className="md:col-span-3 space-y-3">
                {orderedPorts.map((pc: any) => (
                  <div key={pc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900">{pc.sequence || ""} {pc.port_name} ({pc.activity})</p>
                        <p className="text-xs text-slate-500">ETA {pc.eta || "—"} · ETD {pc.etd || "—"} · {pc.status || "planned"}</p>
                        {pc.notes && <p className="text-xs text-slate-500">{pc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link className="text-[#1f5da8] text-sm" href={`/port-calls/${pc.id}`}>Open</Link>
                        <Link className="text-[#1f5da8] text-sm" href={`/claims?voyageId=${voyage.id}&portCallId=${pc.id}&openCreate=1`}>Create Claim</Link>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">Claims</div>
                    {claimsByPort[pc.id]?.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {claimsByPort[pc.id].map((c) => (
                          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{c.claim_reference}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 capitalize">{c.claim_status?.replace("_", " ")}</span>
                                {c.qc_reviewer_id && (
                                  <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">{(c as any).qc_reviewer?.full_name || "Reviewer"}</span>
                                )}
                              </div>
                            </div>
                            <Link className="text-[#1f5da8] text-xs font-semibold" href={`/claims/${c.id}/calculation`}>Open</Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No claims for this port call.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Unassigned Claims</h2>
            <Link className="text-xs font-semibold text-[#1f5da8]" href={`/claims?voyageId=${voyage.id}&openCreate=1`}>Create</Link>
          </div>
          {claimsByPort["unassigned"]?.length ? (
            <ul className="space-y-2">
              {claimsByPort["unassigned"].map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.claim_reference}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 capitalize">{c.claim_status?.replace("_", " ")}</span>
                      {c.qc_reviewer_id && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700">{(c as any).qc_reviewer?.full_name || "Reviewer"}</span>
                      )}
                    </div>
                  </div>
                  <Link className="text-[#1f5da8] text-xs font-semibold" href={`/claims/${c.id}/calculation`}>Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No unassigned claims.</p>
          )}

          <div className="pt-3 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Upcoming legs</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming legs.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 3).map((pc: any) => (
                  <div key={pc.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="text-slate-800">{pc.port_name}</span>
                    <span className="text-xs text-slate-500">ETA {pc.eta || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
