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
    .from("port_calls")
    .select("*")
    .eq("voyage_id", params.voyageId)
    .order("sequence", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portCalls: data || [] });
}

export async function POST(req: Request, { params }: { params: { voyageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const voyage = await loadVoyage(supabase, params.voyageId);
  if (!voyage) return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== voyage.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { port_name, port_id, activity = "other", eta, etd, sequence = 1, status = "planned", notes } = body || {};
  if (!port_name) return NextResponse.json({ error: "port_name is required" }, { status: 400 });
  const { data, error } = await supabase
    .from("port_calls")
    .insert({
      voyage_id: params.voyageId,
      tenant_id: voyage.tenant_id,
      port_name,
      port_id: port_id || null,
      activity,
      eta: eta || null,
      etd: etd || null,
      sequence,
      status,
      notes: notes || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portCall: data }, { status: 201 });
}

export async function PUT(req: Request, { params }: { params: { voyageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const voyage = await loadVoyage(supabase, params.voyageId);
  if (!voyage) return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== voyage.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...updates } = body || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: existing, error: fetchError } = await supabase.from("port_calls").select("id, tenant_id").eq("id", id).single();
  if (fetchError || !existing) return NextResponse.json({ error: "Port call not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== existing.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data, error } = await supabase.from("port_calls").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portCall: data });
}

export async function DELETE(req: Request, { params }: { params: { voyageId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const voyage = await loadVoyage(supabase, params.voyageId);
  if (!voyage) return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== voyage.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { id } = body || {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: existing, error: fetchError } = await supabase.from("port_calls").select("id, tenant_id").eq("id", id).single();
  if (fetchError || !existing) return NextResponse.json({ error: "Port call not found" }, { status: 404 });
  if (session.user.role !== "super_admin" && session.user.tenantId !== existing.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { error } = await supabase.from("port_calls").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
