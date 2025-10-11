import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseServer } from '@/lib/supabase/server'

const schema = z.object({
  kind: z.enum(['initial', 'current', 'final']),
  values: z.object({
    spiritual: z.number().int().min(0).max(10),
    mental: z.number().int().min(0).max(10),
    emotional: z.number().int().min(0).max(10),
    physical: z.number().int().min(0).max(10),
    financial: z.number().int().min(0).max(10),
    work: z.number().int().min(0).max(10),
    relational: z.number().int().min(0).max(10),
  }),
})

export async function POST(req: Request) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = schema.parse(await req.json())

  const { error } = await supabase
    .from('assessments')
    .upsert({ user_id: user.id, kind: body.kind, values: body.values }, { onConflict: 'user_id,kind' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
