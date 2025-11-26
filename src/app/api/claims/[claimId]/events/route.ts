import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

function hoursBetween(from: string, to: string, rate: number) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  const hours = (end - start) / (1000 * 60 * 60);
  const multiplier = Number.isFinite(rate) ? rate / 100 : 1;
  return +(hours * multiplier).toFixed(2);
}

async function loadClaim(supabase: ReturnType<typeof createServerClient>, claimId: string) {
  // Minimal column selection to avoid schema cache issues; fetch voyage separately.
  const { data: claim, error } = await supabase
    .from("claims")
    .select(
      [
        "id",
        "tenant_id",
        "voyage_id",
        "claim_reference",
        "demurrage_rate",
        "demurrage_currency",
        "demurrage_after_hours",
        "demurrage_rate_after",
        "despatch_rate_value",
        "despatch_type",
        "despatch_currency",
        "operation_type",
        "port_name",
        "laycan_start",
        "laycan_end",
        "load_discharge_rate",
        "load_discharge_rate_unit",
        "fixed_rate_duration_hours",
        "reversible",
        "laytime_start",
        "laytime_end",
        "nor_tendered_at",
        "loading_start_at",
        "loading_end_at",
        "turn_time_method",
        "term_id",
      ].join(",")
    )
    .eq("id", claimId)
    .single();

  if (error) {
    console.error("loadClaim error", error);
    return { error: error.message || "Claim not found" };
  }
  if (!claim) {
    return { error: "Claim not found" };
  }

  let voyageData = null;
  if (claim.voyage_id) {
    const { data: voyage, error: voyageError } = await supabase
      .from("voyages")
      .select("id, cargo_quantity, cargo_names(name), charter_parties(name)")
      .eq("id", claim.voyage_id)
      .single();
    if (voyageError) {
      console.warn("loadClaim voyage fetch warning", voyageError);
    } else {
      voyageData = voyage;
    }
  }

  return { claim: { ...claim, voyages: voyageData } };
}

export async function GET(
  _req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { claim, error } = await loadClaim(supabase, params.claimId);
  if (error || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== claim.tenant_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: events, error: eventsError } = await supabase
    .from("calculation_events")
    .select("*")
    .eq("claim_id", params.claimId)
    .order("row_order", { ascending: true });

  if (eventsError) {
    console.error("Error fetching events", eventsError);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }

  // Also return available terms for this tenant (or public) so the calculator has a guaranteed list.
  const termsFilter = claim.tenant_id
    ? `tenant_id.eq.${claim.tenant_id},is_public.eq.true`
    : "is_public.eq.true";
  const { data: terms } = await supabase
    .from("terms")
    .select("id,name")
    .or(termsFilter)
    .order("name", { ascending: true });

  return NextResponse.json({ claim, events, terms: terms || [] });
}

export async function POST(
  req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { claim, error } = await loadClaim(supabase, params.claimId);
  if (error || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== claim.tenant_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      deduction_name,
      from_datetime,
      to_datetime,
      rate_of_calculation = 100,
    } = body || {};

    if (!deduction_name || !from_datetime || !to_datetime) {
      return NextResponse.json(
        { error: "deduction_name, from_datetime, and to_datetime are required" },
        { status: 400 }
      );
    }

    const time_used = hoursBetween(from_datetime, to_datetime, rate_of_calculation);
    const row_order = Math.floor(Date.now() / 1000); // fit in int4, stable ordering by creation time

    const insertPayload = {
      claim_id: params.claimId,
      tenant_id: claim.tenant_id,
      deduction_name,
      from_datetime,
      to_datetime,
      rate_of_calculation,
      time_used,
      row_order,
    } as Record<string, any>;

    const { data, error: insertError } = await supabase
      .from("calculation_events")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting calculation event", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ event: data }, { status: 201 });
  } catch (e: any) {
    console.error("POST /events error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
