import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { normalizeEmail } from '@/lib/email'
import { defaultEmailContext } from '@/lib/email/context'
import {
  sendAgendaActivationEmail,
  sendExternalGrantEmail,
  sendWelcomeRetosEmail,
} from '@/lib/email/notifications'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })

  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = jwt.verify(token, process.env.SHARED_SECRET!, {
      issuer: process.env.JWT_ISSUER || 'agenda',
      audience: process.env.JWT_AUDIENCE || 'grant',
    }) as { email?: string; product?: 'agenda' | 'retos' | 'combo' }

    const email = payload.email
    const sku = payload.product
    if (!email || !sku) return NextResponse.json({ error: 'bad payload' }, { status: 400 })

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return NextResponse.json({ error: 'bad_email' }, { status: 400 })

    const products = sku === 'combo' ? ['agenda', 'retos'] : [sku]
    const { error } = await supabaseAdmin
      .from('entitlements')
      .upsert(
        products.map(product => ({ email: normalizedEmail, product, active: true })),
        { onConflict: 'email,product' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const context = defaultEmailContext(req)
    const payloadData = {
      email: normalizedEmail,
      sku,
      source: 'external.grant',
      supportEmail: context.supportEmail,
    }

    if (products.includes('retos')) {
      await sendWelcomeRetosEmail(normalizedEmail, payloadData)
    }
    if (products.includes('agenda')) {
      await sendAgendaActivationEmail(normalizedEmail, payloadData)
    }
    await sendExternalGrantEmail(normalizedEmail, payloadData)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
}
