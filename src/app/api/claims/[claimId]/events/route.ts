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

type LoadedClaim =
  | { claim: any; error?: undefined }
  | { claim?: undefined; error: string };

async function loadClaim(
  supabase: ReturnType<typeof createServerClient>,
  claimId: string
): Promise<LoadedClaim> {
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
        "port_call_id",
        "reversible_scope",
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

  if (error || !claim) return { error: error?.message || "Claim not found" };

  let voyageData = null;
  let portCallData = null;
  let voyagePortCalls: any[] = [];
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
    const { data: pcs } = await supabase
      .from("port_calls")
      .select("id, port_name, activity, sequence, eta, etd, status, allowed_hours")
      .eq("voyage_id", claim.voyage_id)
      .order("sequence", { ascending: true });
    voyagePortCalls = pcs || [];
  }
  if (claim.port_call_id) {
    const { data: pc } = await supabase
      .from("port_calls")
      .select("id, port_name, activity, sequence, eta, etd, status, allowed_hours")
      .eq("id", claim.port_call_id)
      .maybeSingle();
    if (pc) portCallData = pc;
  }

  const combinedPortCalls = [...voyagePortCalls];
  if (portCallData && !combinedPortCalls.find((p) => p.id === portCallData.id)) {
    combinedPortCalls.push(portCallData);
  }

  return { claim: { ...claim, voyages: voyageData, port_calls: combinedPortCalls } };
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

  const claimAny: any = claim;

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== claimAny.tenant_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: events, error: eventsError } = await supabase
    .from("calculation_events")
    .select("*, port_calls(id, port_name, activity)")
    .eq("claim_id", params.claimId)
    .order("row_order", { ascending: true });

  if (eventsError) {
    console.error("Error fetching events", eventsError);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }

  // Ensure time_used is always populated for downstream calculations
  const hydratedEvents =
    events?.map((ev: any) => ({
      ...ev,
      time_used:
        ev.time_used ??
        hoursBetween(ev.from_datetime, ev.to_datetime, ev.rate_of_calculation),
    })) ?? [];

  // Also return available terms for this tenant (or public) so the calculator has a guaranteed list.
  const termsFilter = claimAny.tenant_id
    ? `tenant_id.eq.${claimAny.tenant_id},is_public.eq.true`
    : "is_public.eq.true";
  const { data: terms } = await supabase
    .from("terms")
    .select("id,name")
    .or(termsFilter)
    .order("name", { ascending: true });

  const { data: audit } = await supabase
    .from("calculation_events_audit")
    .select("*")
    .eq("claim_id", params.claimId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ claim, events: hydratedEvents, terms: terms || [], audit: audit || [] });
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
  const claimAny: any = claim;

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== claimAny.tenant_id
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
      port_call_id,
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
      tenant_id: claimAny.tenant_id,
      deduction_name,
      from_datetime,
      to_datetime,
      rate_of_calculation,
      port_call_id: port_call_id || null,
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

export async function PUT(
  req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { claim, error } = await loadClaim(supabase, params.claimId);
  if (error || !claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  const claimAny: any = claim;
  if (session.user.role !== "super_admin" && session.user.tenantId !== claimAny.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, deduction_name, from_datetime, to_datetime, rate_of_calculation = 100, port_call_id } = body || {};
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const { data: existing, error: fetchError } = await supabase.from("calculation_events").select("*").eq("id", id).single();
    if (fetchError || !existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const time_used = hoursBetween(from_datetime || existing.from_datetime, to_datetime || existing.to_datetime, rate_of_calculation);
    const { data, error: updateError } = await supabase
      .from("calculation_events")
      .update({
        deduction_name: deduction_name ?? existing.deduction_name,
        from_datetime: from_datetime ?? existing.from_datetime,
        to_datetime: to_datetime ?? existing.to_datetime,
        rate_of_calculation,
        port_call_id: port_call_id ?? existing.port_call_id,
        time_used,
      })
      .eq("id", id)
      .select()
      .single();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (e: any) {
    console.error("PUT /events error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const { claim, error } = await loadClaim(supabase, params.claimId);
  if (error || !claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  const claimAny: any = claim;
  if (session.user.role !== "super_admin" && session.user.tenantId !== claimAny.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error: delError } = await supabase.from("calculation_events").delete().eq("id", id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /events error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
