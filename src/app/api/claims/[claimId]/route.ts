import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const updatableFields = [
  "claim_status",
  "operation_type",
  "port_name",
  "country",
  "load_discharge_rate",
  "load_discharge_rate_unit",
  "fixed_rate_duration_hours",
  "reversible",
  "reversible_pool_ids",
  "demurrage_rate",
  "demurrage_currency",
  "demurrage_after_hours",
  "demurrage_rate_after",
  "despatch_type",
  "despatch_rate_value",
  "despatch_currency",
  "laycan_start",
  "laycan_end",
  "nor_tendered_at",
  "loading_start_at",
  "loading_end_at",
  "laytime_start",
  "laytime_end",
  "turn_time_method",
  "term_id",
];

export async function DELETE(
  _req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("claims")
    .select("id, tenant_id, voyage_id")
    .eq("id", params.claimId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== existing.tenant_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: delError } = await supabase
    .from("claims")
    .delete()
    .eq("id", params.claimId);

  if (delError) {
    console.error("Error deleting claim", delError);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: { claimId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("claims")
    .select("id, tenant_id, voyage_id")
    .eq("id", params.claimId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (
    session.user.role !== "super_admin" &&
    session.user.tenantId !== existing.tenant_id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const payload: Record<string, any> = {};
    let pooledArray: string[] | null = null;
    updatableFields.forEach((field) => {
      if (field in body) payload[field] = body[field];
    });

    // Handle reversible pooling persistence and symmetry within voyage
    if ("reversible_pool_ids" in body) {
      const requestedIds: string[] = Array.isArray(body.reversible_pool_ids)
        ? body.reversible_pool_ids.filter((id: any) => typeof id === "string")
        : [];

      const { data: voyageClaims } = await supabase
        .from("claims")
        .select("id, reversible_pool_ids")
        .eq("voyage_id", existing.voyage_id);

      const allowedIds = new Set((voyageClaims || []).map((c) => c.id));

      // Only keep IDs from same voyage and always include the current claim
      const invalidIds = requestedIds.filter((id) => !allowedIds.has(id));
      pooledArray = Array.from(new Set([existing.id, ...requestedIds.filter((id) => allowedIds.has(id))]));

      // Persist pooled set on all pooled claims
      if (pooledArray.length > 0) {
        const { error: poolUpdateError } = await supabase
          .from("claims")
          .update({ reversible_pool_ids: pooledArray })
          .in("id", pooledArray);
        if (poolUpdateError) {
          console.error("Error updating pooled claims", poolUpdateError);
          return NextResponse.json({ error: poolUpdateError.message }, { status: 500 });
        }
      }

      // Remove current claim from pools it no longer belongs to within this voyage
      const stale = (voyageClaims || []).filter(
        (c) =>
          !pooledArray.includes(c.id) &&
          Array.isArray(c.reversible_pool_ids) &&
          c.reversible_pool_ids.includes(existing.id)
      );
      for (const staleClaim of stale) {
        const updated = (staleClaim.reversible_pool_ids || []).filter((x: string) => x !== existing.id);
        const { error: cleanupError } = await supabase
          .from("claims")
          .update({ reversible_pool_ids: updated })
          .eq("id", staleClaim.id);
        if (cleanupError) {
          console.error("Error cleaning stale pooled claims", cleanupError);
        }
      }

      // Verify persistence for current claim
      const { data: verify, error: verifyError } = await supabase
        .from("claims")
        .select("reversible_pool_ids")
        .eq("id", existing.id)
        .maybeSingle();
      if (verifyError) {
        console.error("Error verifying pooled claims", verifyError);
        return NextResponse.json({ error: verifyError.message }, { status: 500 });
      }
      payload.reversible_pool_ids = verify?.reversible_pool_ids || pooledArray;
    }

    const { data: updatedRow, error } = await supabase
      .from("claims")
      .update(payload)
      .eq("id", params.claimId)
      .select("id, reversible_pool_ids")
      .maybeSingle();

    if (error) {
      console.error("Error updating claim", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!updatedRow) {
      return NextResponse.json({ error: "Claim not updated" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      reversible_pool_ids:
        (Array.isArray(updatedRow.reversible_pool_ids) && updatedRow.reversible_pool_ids.length > 0
          ? updatedRow.reversible_pool_ids
          : Array.isArray(pooledArray)
          ? pooledArray
          : Array.isArray(payload.reversible_pool_ids)
          ? payload.reversible_pool_ids
          : []) || [],
      invalid_ids: body.reversible_pool_ids?.filter(
        (id: string) => id && !updatedRow.reversible_pool_ids?.includes(id)
      ),
    });
  } catch (e: any) {
    console.error("PUT /api/claims/[claimId] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
