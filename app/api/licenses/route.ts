import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const filters = [`user_id.eq.${user.id}`]
  const email = user.email?.toLowerCase() ?? null
  if (email) filters.push(`email.eq.${email}`)

  const { data, error } = await supabase
    .from('entitlements')
    .select('product,active,email,user_id')
    .eq('active', true)
    .or(filters.join(','))

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ products: (data ?? []).map(entry => entry.product) })
}
