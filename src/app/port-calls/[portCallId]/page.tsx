import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PortCallTimeline } from "@/components/voyages/PortCallTimeline";

async function loadPortCall(portCallId: string, sessionTenantId?: string, role?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("port_calls")
    .select("*, voyages(voyage_reference, id, tenant_id), claims:claims(*)")
    .eq("id", portCallId)
    .single();
  const { data, error } = await query;
  if (error || !data) return null;
  if (role !== "super_admin" && sessionTenantId && data.voyages?.tenant_id !== sessionTenantId) return null;
  const { data: siblings } = await supabase
    .from("port_calls")
    .select("id, port_name, activity, sequence, eta, etd, status")
    .eq("voyage_id", data.voyage_id)
    .order("sequence", { ascending: true });
  return { ...data, sibling_port_calls: siblings || [] };
}

export default async function PortCallPage({ params }: { params: { portCallId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/login");
  }
  const data = await loadPortCall(params.portCallId, session.user.tenantId, session.user.role);
  if (!data) {
    return <div className="p-6"><p className="text-sm text-red-600">Port call not found or forbidden.</p></div>;
  }

  const claims = data.claims || [];
  const timelinePorts = (data as any).sibling_port_calls || [];

  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur rounded-2xl border border-slate-200 shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Port Call</p>
          <h1 className="text-3xl font-extrabold text-slate-900">{data.port_name} ({data.activity})</h1>
          <p className="text-sm text-slate-600">Voyage: {data.voyages?.voyage_reference}</p>
          <p className="text-xs text-slate-500">ETA {data.eta || "—"} · ETD {data.etd || "—"} · Seq {data.sequence || "—"}</p>
          <p className="text-xs text-slate-500">Status: {data.status || "planned"}</p>
        </div>
        <div className="flex gap-2">
          <Link className="text-sm font-semibold text-[#1f5da8]" href={`/claims?voyageId=${data.voyage_id}&portCallId=${data.id}`}>Create Claim</Link>
          <Link className="text-sm font-semibold text-[#1f5da8]" href={`/voyages/${data.voyage_id}`}>Back to Voyage</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border rounded-2xl p-5 bg-white shadow space-y-3 border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Claims for this Port Call</h2>
          {claims.length === 0 ? (
            <p className="text-sm text-slate-500">No claims yet.</p>
          ) : (
            <ul className="space-y-2">
              {claims.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{c.claim_reference}</p>
                    <p className="text-xs text-slate-500">{c.claim_status}</p>
                  </div>
                  <Link className="text-[#1f5da8] text-sm font-semibold" href={`/claims/${c.id}/calculation`}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border rounded-2xl p-5 bg-white shadow border-slate-200 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Details</h3>
          <div className="text-sm text-slate-600 space-y-1">
            <p><span className="font-semibold text-slate-800">ETA:</span> {data.eta || "—"}</p>
            <p><span className="font-semibold text-slate-800">ETD:</span> {data.etd || "—"}</p>
            <p><span className="font-semibold text-slate-800">Allowed Hours:</span> {data.allowed_hours ?? "—"}</p>
            <p><span className="font-semibold text-slate-800">Notes:</span> {data.notes || "—"}</p>
          </div>
          <div className="pt-3 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Voyage Timeline</h4>
            <PortCallTimeline ports={timelinePorts} activeId={data.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
