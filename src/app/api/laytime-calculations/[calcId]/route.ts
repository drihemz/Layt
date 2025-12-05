import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const TEST_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LAYTIME_TEST === "true";

export async function GET(_req: Request, { params }: { params: { calcId: string } }) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { data: calc, error } = await supabase
    .from("laytime_calculations")
    .select("*")
    .eq("id", params.calcId)
    .eq("tenant_id", session.user.tenantId)
    .single();
  if (error || !calc) {
    return NextResponse.json({ error: "Calculation not found" }, { status: 404 });
  }

  const [{ data: portCalls }, { data: cargoes }, { data: cps }, { data: profile }] = await Promise.all([
    supabase.from("port_calls").select("*").eq("voyage_id", calc.voyage_id).order("sequence", { ascending: true }),
    supabase.from("cargoes").select("*").eq("voyage_id", calc.voyage_id).eq("tenant_id", session.user.tenantId),
    supabase.from("charter_parties").select("*").eq("voyage_id", calc.voyage_id).eq("tenant_id", session.user.tenantId),
    calc.profile_id ? supabase.from("laytime_profiles").select("*").eq("id", calc.profile_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const { data: activities } = await supabase
    .from("port_activities")
    .select("*")
    .eq("laytime_calculation_id", params.calcId)
    .eq("tenant_id", session.user.tenantId);

  const { data: deductions } = await supabase
    .from("port_deductions_additions")
    .select("*")
    .eq("laytime_calculation_id", params.calcId)
    .eq("tenant_id", session.user.tenantId);

  const { data: rows } = await supabase
    .from("cargo_port_laytime_rows")
    .select("*")
    .eq("laytime_calculation_id", params.calcId)
    .eq("tenant_id", session.user.tenantId);

  return NextResponse.json({
    calculation: calc,
    portCalls: portCalls || [],
    cargoes: cargoes || [],
    charterParties: cps || [],
    profile: profile || null,
    activities: activities || [],
    deductions: deductions || [],
    cargoPortRows: rows || [],
  });
}
