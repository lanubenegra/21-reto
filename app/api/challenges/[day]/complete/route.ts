import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseServer } from '@/lib/supabase/server'

const schema = z.object({ payload: z.any().optional(), note: z.string().max(5000).optional() })

export async function POST(req: Request, { params }: { params: { day: string } }) {
  const day = Number(params.day)
  if (Number.isNaN(day) || day < 1 || day > 21) {
    return NextResponse.json({ error: 'bad day' }, { status: 400 })
  }

  const supabase = supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { payload, note } = schema.parse(await req.json())
  const { error } = await supabase.from('challenge_entries').upsert(
    {
      user_id: user.id,
      day,
      payload: payload ?? null,
      note: note ?? null,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

