import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const supabase = createServerClient();
    const { data: tenants, error } = await supabase.from("tenants").select("*");

    if (error) {
      console.error("Error fetching tenants:", error);
      return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
    }

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // 1. Authorization: Only super_admin can create tenants
  if (!session || !session.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { name, slug, adminName, adminEmail, adminPassword } = await req.json();

    // 2. Validation
    if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 3. Create Tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert({ name, slug })
      .select()
      .single();

    if (tenantError) {
      // Check for unique constraint violation on slug
      if (tenantError.code === '23505') {
        return NextResponse.json({ error: "Tenant with this slug already exists." }, { status: 409 });
      }
      console.error("Error creating tenant:", tenantError);
      return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
    }

    // 4. Create Customer Admin User
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const { error: userError } = await supabase.from("users").insert({
      full_name: adminName,
      email: adminEmail,
      password_hash: hashedPassword,
      role: "customer_admin",
      tenant_id: tenantData.id,
      is_active: true,
    });

    if (userError) {
       // Check for unique constraint violation on email
      if (userError.code === '23505') {
        // If user creation fails, we should roll back the tenant creation
        // This is a transactional operation, but for simplicity, we'll delete the tenant.
        await supabase.from("tenants").delete().eq("id", tenantData.id);
        return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
      }
      console.error("Error creating customer admin:", userError);
      // Rollback tenant creation
      await supabase.from("tenants").delete().eq("id", tenantData.id);
      return NextResponse.json({ error: "Failed to create customer admin user" }, { status: 500 });
    }

    // 5. Success
    return NextResponse.json({ message: "Tenant and admin created successfully" }, { status: 201 });
    
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
