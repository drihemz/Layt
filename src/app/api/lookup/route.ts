import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const TABLE_MAP: Record<string, string> = {
  vessels: 'vessels',
  owners: 'owner_names',
  charterers: 'charterer_names',
  cargo: 'cargo_names',
  charterParties: 'charter_parties',
  counterparties: 'counterparties',
  ports: 'ports',
  terms: 'terms',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { table, name, tenant_id } = body
    if (!table || !name) return NextResponse.json({ error: 'table and name required' }, { status: 400 })
    const mapped = (TABLE_MAP as any)[table]
    if (!mapped) return NextResponse.json({ error: 'invalid table' }, { status: 400 })

    const supabase = createServerClient()
    const { data, error } = await supabase.from(mapped).insert({ name, tenant_id }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { table, id, name, tenant_id } = body
    if (!table || !id || !name) return NextResponse.json({ error: 'table, id and name required' }, { status: 400 })
    const mapped = (TABLE_MAP as any)[table]
    if (!mapped) return NextResponse.json({ error: 'invalid table' }, { status: 400 })

    const supabase = createServerClient()
    const { error } = await supabase.from(mapped).update({ name }).eq('id', id).eq('tenant_id', tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { table, id, tenant_id } = body
    if (!table || !id) return NextResponse.json({ error: 'table and id required' }, { status: 400 })
    const mapped = (TABLE_MAP as any)[table]
    if (!mapped) return NextResponse.json({ error: 'invalid table' }, { status: 400 })

    const supabase = createServerClient()
    const { error } = await supabase.from(mapped).delete().eq('id', id).eq('tenant_id', tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
