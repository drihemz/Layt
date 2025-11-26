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
    .select("id, tenant_id")
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
    .select("id, tenant_id")
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
    updatableFields.forEach((field) => {
      if (field in body) payload[field] = body[field];
    });

    const { error } = await supabase
      .from("claims")
      .update(payload)
      .eq("id", params.claimId);

    if (error) {
      console.error("Error updating claim", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/claims/[claimId] error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
