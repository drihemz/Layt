import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";

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
