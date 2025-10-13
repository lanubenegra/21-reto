'use client'

import Link from 'next/link'
import { useState } from 'react'

type SKU = 'retos' | 'agenda' | 'combo'

const PRICE_RETOS = 'price_1SHd7pIyRLQMwrutFK4nhjiA'
const PRICE_AGENDA = 'price_1SHd7pIyRLQMwrutFK4nhjiA'
const PRICE_COMBO = 'price_1SHd9rIyRLQMwrutayn5WCow'

async function pagar(sku: SKU, priceId: string, setLoading: (value: SKU | null) => void) {
  try {
    setLoading(sku)
    const response = await fetch('/api/pay/stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, priceId, email: undefined }),
    })
    if (!response.ok) throw new Error('No se pudo iniciar el pago')
    const payload = (await response.json()) as { url?: string }
    if (payload.url) {
      window.location.href = payload.url
    }
  } catch (error) {
    console.error('[pago] error iniciando checkout', error)
    alert('No se pudo iniciar el pago. Intenta nuevamente.')
  } finally {
    setLoading(null)
  }
}

export default function Pago() {
  const [loading, setLoading] = useState<SKU | null>(null)

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-900 to-teal-700 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="space-y-3">
          <span className="text-xs uppercase tracking-[0.4em] text-white/70">Tienda de prueba</span>
          <h1 className="text-3xl font-semibold">21 Retos — Pagos con Stripe (Test)</h1>
          <p className="text-sm text-white/70">
            Selecciona el producto. Serás redirigido al checkout seguro de Stripe. Usa la tarjeta de prueba 4242 4242 4242 4242, fecha futura y CVC 123.
          </p>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          <button
            onClick={() => pagar('retos', PRICE_RETOS, setLoading)}
            disabled={loading !== null}
            className="rounded-xl bg-white/10 px-4 py-6 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
          >
            {loading === 'retos' ? 'Redirigiendo…' : 'Comprar RETOS'}
          </button>

          <button
            onClick={() => pagar('agenda', PRICE_AGENDA, setLoading)}
            disabled={loading !== null}
            className="rounded-xl bg-white/10 px-4 py-6 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
          >
            {loading === 'agenda' ? 'Redirigiendo…' : 'Comprar AGENDA'}
          </button>

          <button
            onClick={() => pagar('combo', PRICE_COMBO, setLoading)}
            disabled={loading !== null}
            className="rounded-xl bg-white/10 px-4 py-6 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
          >
            {loading === 'combo' ? 'Redirigiendo…' : 'Comprar COMBO'}
          </button>
        </div>

        <Link href="/" className="text-xs underline underline-offset-4 text-white/70 hover:text-white">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
