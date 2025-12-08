import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sof_unmapped_labels")
    .select("*")
    .order("count", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ unmapped: data });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Array<{ label: string; count?: number; sample_file?: string }> = [];
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: "Expected non-empty array" }, { status: 400 });
  }
  const rows = body
    .map((b) => {
      const label = b.label?.trim();
      if (!label) return null;
      return {
        label,
        count: b.count ?? 1,
        sample_file: b.sample_file || null,
        last_seen_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid labels provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("sof_unmapped_labels").upsert(rows, { onConflict: "label" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, upserted: rows.length });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const label = searchParams.get("label");
  const supabase = createServerClient();
  const query = supabase.from("sof_unmapped_labels");
  const exec = label ? query.delete().eq("label", label) : query.delete();
  const { error } = await exec;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, cleared: label || "all" });
}
