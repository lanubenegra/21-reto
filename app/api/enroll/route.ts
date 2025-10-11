import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseServer } from '@/lib/supabase/server'

const schema = z.object({ start_date: z.string().optional() })

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { start_date } = schema.parse(await req.json())
  const date = start_date ?? new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, program_start_date: date }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
