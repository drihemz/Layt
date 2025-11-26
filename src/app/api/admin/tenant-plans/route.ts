import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase: createServerClient() };
}

export async function GET() {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const { data, error: err } = await supabase
    .from("tenant_plans")
    .select("*, tenants(name), plans(name)")
    .order("created_at", { ascending: false });
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ tenantPlans: data || [] });
}

export async function POST(req: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const body = await req.json();
  const { tenant_id, plan_id, status = "active", seats_admins, seats_operators, starts_at, ends_at } = body || {};
  if (!tenant_id || !plan_id) return NextResponse.json({ error: "tenant_id and plan_id required" }, { status: 400 });
  // upsert by tenant_id (unique constraint)
  const { data, error: err } = await supabase
    .from("tenant_plans")
    .upsert(
      {
        tenant_id,
        plan_id,
        status,
        seats_admins,
        seats_operators,
        starts_at,
        ends_at,
      },
      { onConflict: "tenant_id" }
    )
    .select()
    .single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ tenantPlan: data }, { status: 201 });
}
