import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  // 1. Authorization: Only super_admin can manage all users
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, isActive, role } = await req.json();

    // 2. Validation
    if (!userId || typeof isActive !== 'boolean' || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 3. Update User
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: isActive, role: role })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // 4. Success
    return NextResponse.json({ message: "User updated successfully" }, { status: 200 });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
