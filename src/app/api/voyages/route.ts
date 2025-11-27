import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

async function getTenantPlan(supabase: ReturnType<typeof createServerClient>, tenantId: string) {
  const { data, error } = await supabase
    .from("tenant_plans")
    .select("plan_id, seats_admins, seats_operators, plans(max_voyages)")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();
  if (error) return null;
  return data;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, tenantId: sessionTenantId } = session.user;

  try {
    const body = await req.json();
    let tenantId = sessionTenantId;

    // If super_admin is creating a voyage, they can specify the tenant_id
    if (role === 'super_admin') {
      if (body.tenant_id) {
        tenantId = body.tenant_id;
      } else {
        return NextResponse.json({ error: "Tenant ID is required for super admin" }, { status: 400 });
      }
    } else {
      // For other roles, if they try to pass a tenant_id, it must match their session tenantId
      if (body.tenant_id && body.tenant_id !== sessionTenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is missing" }, { status: 400 });
    }

    // Remove tenant_id from body if it exists, to avoid duplication in voyageData
    const { tenant_id, ...restOfBody } = body;

    const voyageData = {
      ...restOfBody,
      tenant_id: tenantId,
      created_by: userId,
    };
    
    const supabase = createServerClient();

    // Enforce voyage limit if plan set
    const tenantPlan = await getTenantPlan(supabase, tenantId);
    const plan = Array.isArray(tenantPlan?.plans) ? tenantPlan.plans[0] : tenantPlan?.plans;
    if (plan?.max_voyages) {
      const { count } = await supabase
        .from("voyages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if ((count || 0) >= plan.max_voyages) {
        return NextResponse.json({ error: "Voyage limit reached for this tenant plan." }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from("voyages")
      .insert(voyageData)
      .select()
      .single();

    if (error) {
      console.error("Error creating voyage:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, role, tenantId: sessionTenantId } = session.user;

  try {
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ error: "Voyage id is required" }, { status: 400 });

    const supabase = createServerClient();
    // Fetch voyage to validate tenant
    const { data: voyage, error: fetchError } = await supabase
      .from("voyages")
      .select("id, tenant_id")
      .eq("id", id)
      .single();

    if (fetchError || !voyage) {
      return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
    }

    if (role !== "super_admin" && sessionTenantId !== voyage.tenant_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("voyages").update(updates).eq("id", id);
    if (error) {
      console.error("Error updating voyage:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Voyage id required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: voyage, error: fetchError } = await supabase
      .from("voyages")
      .select("id, tenant_id")
      .eq("id", id)
      .single();

    if (fetchError || !voyage) {
      return NextResponse.json({ error: "Voyage not found" }, { status: 404 });
    }

    if (
      session.user.role !== "super_admin" &&
      session.user.tenantId !== voyage.tenant_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: delError } = await supabase
      .from("voyages")
      .delete()
      .eq("id", id);

    if (delError) {
      console.error("Error deleting voyage:", delError);
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
