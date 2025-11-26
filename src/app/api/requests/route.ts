import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

const ALLOWED_TYPES = ["parties", "vessels", "ports", "cargo_names", "charter_parties", "terms"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServerClient();
  const isSuper = session.user.role === "super_admin";
  let query = supabase.from("requests").select("*").order("created_at", { ascending: false });
  if (!isSuper) {
    query = query.eq("tenant_id", session.user.tenantId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching requests", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
  return NextResponse.json({ requests: data || [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { request_type, name, payload } = body || {};
    if (!request_type || !name) {
      return NextResponse.json({ error: "request_type and name are required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(request_type)) {
      return NextResponse.json({ error: "Invalid request_type" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("requests")
      .insert({
        tenant_id: session.user.tenantId,
        user_id: session.user.id,
        request_type,
        name,
        payload: payload || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating request", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/requests error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuper = session.user.role === "super_admin";
  const isAdmin = session.user.role === "customer_admin" || isSuper;

  try {
    const body = await req.json();
    const { id, status } = body || {};
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createServerClient();
    // fetch request for tenant check
    const { data: reqRow, error: fetchError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError || !reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (!isSuper && reqRow.tenant_id !== session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // On approve, create minimal lookup entry
    if (status === "approved" && ALLOWED_TYPES.includes(reqRow.request_type)) {
      const table = reqRow.request_type;
      const insertPayload: any = { name: reqRow.name, tenant_id: reqRow.tenant_id };
      await supabase.from(table).insert(insertPayload);
    }

    const { error: updateError } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);
    if (updateError) {
      console.error("Error updating request", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/requests error", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
