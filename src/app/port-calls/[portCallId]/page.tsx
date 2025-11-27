import { createServerClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  return data;
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Port Call</p>
          <h1 className="text-3xl font-bold text-gray-900">{data.port_name} ({data.activity})</h1>
          <p className="text-sm text-gray-600">Voyage: {data.voyages?.voyage_reference}</p>
          <p className="text-xs text-gray-500">ETA {data.eta || "—"} · ETD {data.etd || "—"} · Seq {data.sequence || "—"}</p>
        </div>
        <div className="flex gap-2">
          <Link className="text-blue-700" href={`/claims?voyageId=${data.voyage_id}&portCallId=${data.id}`}>Create Claim</Link>
          <Link className="text-blue-700" href={`/voyages?voyageId=${data.voyage_id}`}>Back to Voyages</Link>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Claims for this Port Call</h2>
        {claims.length === 0 ? (
          <p className="text-sm text-gray-500">No claims yet.</p>
        ) : (
          <ul className="space-y-2">
            {claims.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-semibold">{c.claim_reference}</p>
                  <p className="text-xs text-gray-500">{c.claim_status}</p>
                </div>
                <Link className="text-blue-700 text-sm" href={`/claims/${c.id}/calculation`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
