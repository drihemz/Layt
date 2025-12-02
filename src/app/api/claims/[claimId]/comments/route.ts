import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: { claimId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("claim_comments")
    .select("id, body, user_id, created_at, users(full_name)")
    .eq("claim_id", params.claimId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

export async function POST(req: Request, { params }: { params: { claimId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const text = body?.body;
  if (!text) return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("claim_comments")
    .insert({ claim_id: params.claimId, user_id: session.user.id, body: text })
    .select("id, body, user_id, created_at, users(full_name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
