import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function loadVoyage(supabase: ReturnType<typeof createServerClient>, voyageId: string) {
  const { data, error } = await supabase.from("voyages").select("id, tenant_id").eq("id", voyageId).single();
  if (error || !data) return null;
  return data;
}

export async function GET(_req: Request, { params }: { params: { voyageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const voyage = await loadVoyage(supabase, params.voyageId);
  if (!voyage) return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== voyage.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("claims")
    .select("id, claim_reference, port_call_id, operation_type, reversible, reversible_scope, reversible_pool_ids, port_calls(id, port_name, activity, sequence)")
    .eq("voyage_id", params.voyageId)
    .order("claim_reference", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claims: data || [] });
}

