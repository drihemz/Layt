import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const TEST_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LAYTIME_TEST === "true";

async function loadCalc(supabase: ReturnType<typeof createServerClient>, calcId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("laytime_calculations")
    .select("id, tenant_id")
    .eq("id", calcId)
    .eq("tenant_id", tenantId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function GET(_req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const calc = await loadCalc(supabase, params.calcId, session.user.tenantId);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("port_deductions_additions")
    .select("*")
    .eq("laytime_calculation_id", params.calcId)
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const calc = await loadCalc(supabase, params.calcId, session.user.tenantId);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { port_call_id, type, flat_duration_minutes } = body;
  if (!port_call_id || !type) {
    return NextResponse.json({ error: "port_call_id and type required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("port_deductions_additions")
    .insert({
      tenant_id: session.user.tenantId,
      laytime_calculation_id: params.calcId,
      port_call_id,
      type,
      reason_code: body.reason_code || null,
      description: body.description || null,
      flat_duration_minutes: flat_duration_minutes !== undefined ? Number(flat_duration_minutes) : null,
      applies_to_cargo_ids: Array.isArray(body.applies_to_cargo_ids) ? body.applies_to_cargo_ids : [],
      from_datetime: body.from_datetime || null,
      to_datetime: body.to_datetime || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const calc = await loadCalc(supabase, params.calcId, session.user.tenantId);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("port_deductions_additions")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .eq("laytime_calculation_id", params.calcId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
