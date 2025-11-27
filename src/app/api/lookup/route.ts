import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const TABLE_MAP: Record<string, string> = {
  parties: 'parties',
  vessels: 'vessels',
  ports: 'ports',
  cargo: 'cargo_names', // Renamed from cargo_names for consistency, but table name is cargo_names
  charterParties: 'charter_parties',
  terms: 'terms',
}

async function authorizeRequest(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { role, tenantId } = session.user

  // Operators cannot modify lookup data
  if (role === 'operator') {
    return NextResponse.json({ error: 'Forbidden: Operators cannot modify lookup data' }, { status: 403 })
  }

  return { session, role, tenantId }
}

export async function POST(req: Request) {
  try {
    const authResult = await authorizeRequest(req)
    if (authResult instanceof NextResponse) return authResult
    const { session, role, tenantId } = authResult

    const body = await req.json()
    const { table, holidays, ...dataToInsert } = body // Extract table, holidays (for terms), and the rest of the data
    const targetTable = (TABLE_MAP as any)[table]
    if (!targetTable) return NextResponse.json({ error: 'invalid table' }, { status: 400 })

    // Ensure is_public (visible to all) can only be set by super_admin
    if (dataToInsert.is_public && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Only super_admin can mark items as public' }, { status: 403 })
    }

    // Ensure tenant_id is correctly set for the operation; if the item is public, tenant_id should be null
    const finalDataToInsert = { ...dataToInsert } as any;
    if (finalDataToInsert.is_public) {
      finalDataToInsert.tenant_id = null;
    } else {
      finalDataToInsert.tenant_id = tenantId;
    }

    // Customer admin can only modify their own tenant's lookup data
    if (role === 'customer_admin' && !finalDataToInsert.is_public && finalDataToInsert.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden: Customer admins can only modify their own tenant data' }, { status: 403 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase.from(targetTable).insert(finalDataToInsert).select().single()
    if (error) {
      console.error(`Error inserting into ${targetTable}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Handle term holidays if provided
    if (targetTable === 'terms' && holidays && Array.isArray(holidays) && data?.id) {
      const cleaned = holidays
        .filter((h: any) => h && h.holiday_name && h.holiday_start && h.holiday_end)
        .map((h: any) => ({
          term_id: data.id,
          holiday_name: h.holiday_name,
          holiday_start: h.holiday_start,
          holiday_end: h.holiday_end,
        }));
      if (cleaned.length > 0) {
        await supabase.from("term_holidays").insert(cleaned);
      }
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error("API POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    // Allow all authenticated users (including operators) to read lookup data;
    // writes are still restricted in POST/PUT/DELETE.
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { role, tenantId } = session.user;

    const url = new URL(req.url);
    const qTenantId = url.searchParams.get('tenant_id');

    let targetTenantId: string | null = tenantId || null;
    if (role === 'super_admin') {
      // super_admin can provide a tenantId to filter, or see all if not provided
      targetTenantId = qTenantId || null;
    }

    // If targetTenantId is provided, include tenant-specific rows + public
    const supabase = createServerClient();
    const tables = ['parties', 'vessels', 'ports', 'cargo_names', 'charter_parties', 'terms'];
    const results: Record<string, any[]> = {};

    for (const t of tables) {
      const filter = targetTenantId ? `tenant_id.eq.${targetTenantId},is_public.eq.true` : "is_public.eq.true";
      const query =
        role === "super_admin" && !targetTenantId
          ? supabase.from(t).select("*")
          : supabase.from(t).select("*").or(filter);

      const { data, error } = await query;
      if (error) {
        console.error(`Error fetching ${t}:`, error);
        results[t] = [];
      } else {
        results[t] = data || [];
      }
    }

    return NextResponse.json({ data: results });
  } catch (err: any) {
    console.error("API GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await authorizeRequest(req)
    if (authResult instanceof NextResponse) return authResult
    const { session, role, tenantId } = authResult

    const body = await req.json()
    const { table, id, holidays, ...dataToUpdate } = body // Extract table, id, holidays, and the rest of the data
    const targetTable = (TABLE_MAP as any)[table]
    if (!targetTable) return NextResponse.json({ error: 'invalid table' }, { status: 400 })
    if (!id) return NextResponse.json({ error: 'id required for update' }, { status: 400 })


    // Customer admin can only modify their own tenant's lookup data
    // The check for tenantId equality should happen with the existing record's tenant_id,
    // but for simplicity and security, we'll enforce the incoming request's tenant_id matches the session's.
    // If a customer admin tries to update an item from another tenant by providing that tenant's ID,
    // the RLS will prevent it anyway, but this is an extra layer of protection.
    if (role === 'customer_admin') {
      // For PUT, we need to ensure the item belongs to the customer admin's tenant
      const { data: existingItem, error: fetchError } = await createServerClient()
        .from(targetTable)
        .select('tenant_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingItem || existingItem.tenant_id !== tenantId) {
        return NextResponse.json({ error: 'Forbidden: Item not found or does not belong to your tenant' }, { status: 403 });
      }
    }

    // For PUT, enforce is_public -> tenant_id = null, and restrict who can set it
    if (dataToUpdate.is_public && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Only super_admin can mark items as public' }, { status: 403 })
    }
    const finalDataToUpdate = { ...dataToUpdate } as any;
    if (finalDataToUpdate.is_public) {
      finalDataToUpdate.tenant_id = null;
    }

    const supabase = createServerClient()
    let query = supabase.from(targetTable).update(finalDataToUpdate).eq('id', id);
    if (role !== 'super_admin') {
      query = query.eq('tenant_id', tenantId);
    }
    const { error } = await query;
    if (error) {
      console.error(`Error updating ${targetTable}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Handle term holidays replace
    if (targetTable === 'terms' && holidays && Array.isArray(holidays)) {
      await supabase.from("term_holidays").delete().eq("term_id", id);
      const cleaned = holidays
        .filter((h: any) => h && h.holiday_name && h.holiday_start && h.holiday_end)
        .map((h: any) => ({
          term_id: id,
          holiday_name: h.holiday_name,
          holiday_start: h.holiday_start,
          holiday_end: h.holiday_end,
        }));
      if (cleaned.length > 0) {
        await supabase.from("term_holidays").insert(cleaned);
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("API PUT error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const authResult = await authorizeRequest(req)
    if (authResult instanceof NextResponse) return authResult
    const { session, role, tenantId } = authResult

    const body = await req.json()
    const { table, id, tenant_id } = body // tenant_id might not be necessary here if session.tenantId is always used
    const targetTable = (TABLE_MAP as any)[table]
    if (!targetTable) return NextResponse.json({ error: 'invalid table' }, { status: 400 })
    if (!id) return NextResponse.json({ error: 'id required for delete' }, { status: 400 })

    // Customer admin can only modify their own tenant's lookup data
    if (role === 'customer_admin' && tenantId !== tenant_id) {
      return NextResponse.json({ error: 'Forbidden: Customer admins can only modify their own tenant data' }, { status: 403 })
    }

    const supabase = createServerClient()
    let delQuery = supabase.from(targetTable).delete().eq('id', id);
    if (role !== 'super_admin') {
      delQuery = delQuery.eq('tenant_id', tenantId);
    }
    const { error } = await delQuery;
    if (error) {
      console.error(`Error deleting from ${targetTable}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("API DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
