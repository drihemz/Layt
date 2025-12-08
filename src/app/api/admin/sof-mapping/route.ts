import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { canonicalMappings } from "@/lib/sof-mapper";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("sof_canonical_events").select("*");
  if (error) {
    // Fallback to static mappings if table not available
    return NextResponse.json({ mappings: canonicalMappings, source: "static", error: error.message });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ mappings: canonicalMappings, source: "static" });
  }
  return NextResponse.json({ mappings: data, source: "db" });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let payload: any[] = [];
  try {
    payload = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Expected array of mappings" }, { status: 400 });
  }

  const upserts = payload
    .map((item) => {
      const id = item.id || item.canonical;
      if (!id) return null;
      return {
        id,
        label: item.label || item.id || item.canonical,
        keywords: item.keywords || [],
        confidence: item.confidence ?? null,
        created_by: session.user.id,
      };
    })
    .filter(Boolean);

  if (upserts.length === 0) {
    return NextResponse.json({ error: "No valid mappings provided" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("sof_canonical_events").upsert(upserts, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, upserted: upserts.length });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  const supabase = createServerClient();
  const { error } = await supabase.from("sof_canonical_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, deleted: id });
}
