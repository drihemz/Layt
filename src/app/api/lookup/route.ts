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
    const { table, ...dataToInsert } = body // Extract table and the rest of the data
    const targetTable = (TABLE_MAP as any)[table]
    if (!targetTable) return NextResponse.json({ error: 'invalid table' }, { status: 400 })

    // Ensure tenant_id is correctly set for the operation
    const finalDataToInsert = { ...dataToInsert, tenant_id: tenantId };

    // Customer admin can only modify their own tenant's lookup data
    if (role === 'customer_admin' && finalDataToInsert.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden: Customer admins can only modify their own tenant data' }, { status: 403 })
    }

    const supabase = createServerClient()
    const { data, error } = await supabase.from(targetTable).insert(finalDataToInsert).select().single()
    if (error) {
      console.error(`Error inserting into ${targetTable}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error("API POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await authorizeRequest(req)
    if (authResult instanceof NextResponse) return authResult
    const { session, role, tenantId } = authResult

    const body = await req.json()
    const { table, id, ...dataToUpdate } = body // Extract table, id, and the rest of the data
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

    const supabase = createServerClient()
    const { error } = await supabase.from(targetTable).update(dataToUpdate).eq('id', id).eq('tenant_id', tenantId)
    if (error) {
      console.error(`Error updating ${targetTable}:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
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
    const { error } = await supabase.from(targetTable).delete().eq('id', id).eq('tenant_id', tenantId)
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
