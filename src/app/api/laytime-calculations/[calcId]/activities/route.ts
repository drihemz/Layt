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
    .from("port_activities")
    .select("*")
    .eq("laytime_calculation_id", params.calcId)
    .eq("tenant_id", session.user.tenantId)
    .order("from_datetime", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data || [] });
}

export async function POST(req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const calc = await loadCalc(supabase, params.calcId, session.user.tenantId);
  if (!calc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { port_call_id, event_type, duration_minutes, count_behavior } = body;
  if (!port_call_id || !event_type || duration_minutes === undefined) {
    return NextResponse.json({ error: "port_call_id, event_type, duration_minutes required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("port_activities")
    .insert({
      tenant_id: session.user.tenantId,
      laytime_calculation_id: params.calcId,
      port_call_id,
      event_type,
      duration_minutes: Number(duration_minutes) || 0,
      count_behavior: count_behavior || "FULL",
      from_datetime: body.from_datetime || null,
      to_datetime: body.to_datetime || null,
      source: "MANUAL",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data });
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
    .from("port_activities")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .eq("laytime_calculation_id", params.calcId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
