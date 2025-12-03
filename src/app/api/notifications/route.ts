import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const supabase = createServerClient();
  let { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, level, read_at, created_at, claim_id")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Fallback if claim_id column is missing (older DB)
  if (error && (error as any).code === "42703") {
    const alt = await supabase
      .from("notifications")
      .select("id, title, body, level, read_at, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    data = (alt.data || []).map((n: any) => ({ ...n, claim_id: null }));
    error = alt.error;
  }

  if (error) {
    console.error("GET /api/notifications error", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  const supabase = createServerClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.user.id)
    .is("read_at", null);

  if (ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error } = await query;

  if (error) {
    console.error("PATCH /api/notifications error", error);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
