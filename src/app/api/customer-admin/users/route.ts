import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

async function getTenantPlanSeats(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
  const { data, error } = await supabase
    .from("tenant_plans")
    .select("seats_admins, seats_operators")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();
  if (error) return null;
  return data;
}

async function countByRole(supabase: ReturnType<typeof createServerClient>, tenantId: string, role: string) {
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("is_active", true);
  return count || 0;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Authorization
  const userRole = session.user.role;
  if (userRole !== "customer_admin" && userRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fullName, email, password, role } = await req.json();

    // 2. Validation
    if (!fullName || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (role !== 'operator' && role !== 'customer_admin') {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const supabase = createServerClient();
    const tenantId = session.user.tenantId;

    // 3. Enforce seat limits if plan defines them
    const seats = await getTenantPlanSeats(supabase, tenantId);
    if (role === "customer_admin" && seats?.seats_admins !== null && seats?.seats_admins !== undefined) {
      const adminCount = await countByRole(supabase, tenantId, "customer_admin");
      if (adminCount >= seats.seats_admins) {
        return NextResponse.json({ error: "Admin seat limit reached for this tenant plan." }, { status: 403 });
      }
    }
    if (role === "operator" && seats?.seats_operators !== null && seats?.seats_operators !== undefined) {
      const opCount = await countByRole(supabase, tenantId, "operator");
      if (opCount >= seats.seats_operators) {
        return NextResponse.json({ error: "Operator seat limit reached for this tenant plan." }, { status: 403 });
      }
    }

    // 4. Create User
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: userError } = await supabase.from("users").insert({
      full_name: fullName,
      email: email,
      password_hash: hashedPassword,
      role: role,
      tenant_id: tenantId, // Assign to the admin's tenant
      is_active: true,
    }).select().single();

    if (userError) {
      if (userError.code === '23505') {
        return NextResponse.json({ error: "User with this email already exists in this tenant." }, { status: 409 });
      }
      console.error("Error creating user:", userError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // 5. Success
    return NextResponse.json(newUser, { status: 201 });
    
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Authorization
  const userRole = session.user.role;
  if (userRole !== "customer_admin" && userRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, isActive } = await req.json();

    // 2. Validation
    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: "Missing required fields: userId and isActive" }, { status: 400 });
    }

    const supabase = createServerClient();
    const tenantId = session.user.tenantId;

    // 3. Deactivate User
    let query = supabase.from("users").update({ is_active: isActive }).eq("id", userId);
    if (userRole === "customer_admin") {
      query = query.eq("tenant_id", tenantId);
    }
    
    const { error: updateError } = await query;

    if (updateError) {
      console.error("Error updating user status:", updateError);
      return NextResponse.json({ error: "Failed to update user status" }, { status: 500 });
    }

    // 4. Success
    return NextResponse.json({ message: "User status updated successfully" }, { status: 200 });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const isSuper = session.user.role === "super_admin";

  let query = supabase
    .from("users")
    .select("id, full_name, email, role, tenant_id, is_active")
    .order("full_name", { ascending: true });

  if (!isSuper) {
    if (!session.user.tenantId) {
      return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
    }
    query = query.eq("tenant_id", session.user.tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("GET customer-admin/users error", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}
