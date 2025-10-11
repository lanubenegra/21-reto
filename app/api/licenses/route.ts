import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  const supabase = supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('entitlements')
    .select('product,active')
    .eq('user_id', user.id)
    .eq('active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ products: (data ?? []).map(entry => entry.product) })
}

