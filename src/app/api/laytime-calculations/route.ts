import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const TEST_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LAYTIME_TEST === "true";

export async function GET(req: Request) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const voyageId = searchParams.get("voyageId");
  let query = supabase
    .from("laytime_calculations")
    .select("id, voyage_id, cp_ids, cargo_ids, status, calculation_method, created_at")
    .eq("tenant_id", session.user.tenantId)
    .order("created_at", { ascending: false });
  if (voyageId) {
    query = query.eq("voyage_id", voyageId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("GET /api/laytime-calculations", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ calculations: data || [] });
}

export async function POST(req: Request) {
  if (!TEST_ENABLED) return NextResponse.json({ error: "Laytime test API disabled" }, { status: 404 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { voyageId, cpIds = [], cargoIds = [], method = "STANDARD", status = "draft" } = body;
  if (!voyageId) {
    return NextResponse.json({ error: "voyageId is required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("laytime_calculations")
    .insert({
      tenant_id: session.user.tenantId,
      voyage_id: voyageId,
      cp_ids: Array.isArray(cpIds) ? cpIds : [],
      cargo_ids: Array.isArray(cargoIds) ? cargoIds : [],
      calculation_method: method,
      status,
      currency: body.currency || "USD",
      notes: body.notes || null,
    })
    .select()
    .single();
  if (error) {
    console.error("POST /api/laytime-calculations", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ calculation: data });
}
