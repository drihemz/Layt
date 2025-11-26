import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, tenantId: sessionTenantId, id: userId } = session.user;

  try {
    const body = await req.json();
    const {
      voyage_id,
      claim_reference,
      claim_status = "draft",
      tenant_id: requestedTenantId,
      operation_type,
      port_name,
      country,
      load_discharge_rate,
      load_discharge_rate_unit,
      fixed_rate_duration_hours,
      reversible = false,
      demurrage_rate,
      demurrage_currency,
      demurrage_after_hours,
      demurrage_rate_after,
      despatch_type,
      despatch_rate_value,
      despatch_currency,
      laycan_start,
      laycan_end,
      nor_tendered_at,
      loading_start_at,
      loading_end_at,
      laytime_start,
      laytime_end,
      turn_time_method,
      term_id,
    } = body || {};

    if (!voyage_id) {
      return NextResponse.json({ error: "voyage_id is required" }, { status: 400 });
    }

    let tenantIdToUse = sessionTenantId;
    if (role === "super_admin") {
      if (!requestedTenantId) {
        return NextResponse.json({ error: "tenant_id is required for super_admin" }, { status: 400 });
      }
      tenantIdToUse = requestedTenantId;
    } else if (requestedTenantId && requestedTenantId !== sessionTenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!tenantIdToUse) {
      return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify voyage belongs to tenant
    const { data: voyage, error: voyageError } = await supabase
      .from("voyages")
      .select("id, tenant_id, voyage_reference")
      .eq("id", voyage_id)
      .single();

    if (voyageError || !voyage) {
      return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
    }

    if (voyage.tenant_id !== tenantIdToUse && role !== "super_admin") {
      return NextResponse.json({ error: "Voyage does not belong to tenant" }, { status: 403 });
    }

    const generatedRef = claim_reference || `CLM-${Date.now() % 100000}`;

    const insertPayload = {
      claim_reference: generatedRef,
      tenant_id: tenantIdToUse,
      voyage_id,
      claim_status,
      created_by: userId,
      operation_type,
      port_name,
      country,
      load_discharge_rate,
      load_discharge_rate_unit,
      fixed_rate_duration_hours,
      reversible,
      demurrage_rate,
      demurrage_currency,
      demurrage_after_hours,
      demurrage_rate_after,
      despatch_type,
      despatch_rate_value,
      despatch_currency,
      laycan_start,
      laycan_end,
      nor_tendered_at,
      loading_start_at,
      loading_end_at,
      laytime_start,
      laytime_end,
      turn_time_method,
      term_id,
    };

    const { data, error } = await supabase
      .from("claims")
      .insert(insertPayload)
      .select("*, voyages(voyage_reference)")
      .single();

    if (error) {
      console.error("Error creating claim", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/claims error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
