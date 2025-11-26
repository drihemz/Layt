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
  const { data, error: err } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ plans: data || [] });
}

export async function POST(req: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const body = await req.json();
  const { data, error: err } = await supabase.from("plans").insert(body).select().single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ plan: data }, { status: 201 });
}

export async function PUT(req: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data, error: err } = await supabase.from("plans").update(rest).eq("id", id).select().single();
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

export async function DELETE(req: Request) {
  const { error, supabase } = await requireSuperAdmin();
  if (error) return error;
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error: err } = await supabase.from("plans").delete().eq("id", id);
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
