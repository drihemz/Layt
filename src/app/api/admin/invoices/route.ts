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
    .from("invoices")
    .select("*, tenants(name), plans(name)")
    .order("created_at", { ascending: false });
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ invoices: data || [] });
}

export async function PUT(req: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const body = await req.json();
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  const { data, error: err } = await supabase.from("invoices").update({ status }).eq("id", id).select().single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}

// Generate invoices for active tenant plans for the current month (idempotent per tenant/period)
export async function POST() {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;

  const today = new Date();
  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  const { data: activeTenantPlans, error: tpErr } = await supabase
    .from("tenant_plans")
    .select("tenant_id, plan_id, plans(price_cents, currency)")
    .eq("status", "active");
  if (tpErr) return NextResponse.json({ error: tpErr.message }, { status: 500 });

  const inserts = [];
  for (const tp of activeTenantPlans || []) {
    // skip if invoice already exists for tenant/period
    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("tenant_id", tp.tenant_id)
      .eq("period_start", periodStartStr)
      .eq("period_end", periodEndStr)
      .maybeSingle();
    if (existing) continue;
    inserts.push({
      tenant_id: tp.tenant_id,
      plan_id: tp.plan_id,
      period_start: periodStartStr,
      period_end: periodEndStr,
      amount_cents: tp.plans?.price_cents || 0,
      currency: tp.plans?.currency || "USD",
      status: "due",
      due_date: periodEndStr,
      notes: "Auto-generated invoice",
    });
  }

  if (inserts.length > 0) {
    const { error: insErr } = await supabase.from("invoices").insert(inserts);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ created: inserts.length, period_start: periodStartStr, period_end: periodEndStr });
}
