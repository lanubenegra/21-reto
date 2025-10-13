'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Sku = 'retos' | 'agenda' | 'combo'
type LicensesResp = { products?: string[] }

const AGENDA_URL =
  process.env.NEXT_PUBLIC_AGENDA_APP_URL || 'https://agenda-devocional.example.com'

function Pill({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs transition ${
        ok
          ? 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40'
          : 'bg-white/10 text-white/70 ring-1 ring-white/20'
      }`}
    >
      {ok ? '✓' : '•'} {children}
    </span>
  )
}

export default function GraciasPage() {
  const qs = useSearchParams()
  const sku = (qs.get('sku') ?? 'retos').toLowerCase() as Sku
  const status = (qs.get('status') ?? 'success').toLowerCase()

  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchLicenses = async () => {
      try {
        const response = await fetch('/api/licenses', { cache: 'no-store' })
        const payload = (await response.json()) as LicensesResp
        if (!mounted) return
        setProducts(payload.products ?? [])
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchLicenses()
    const retry = setTimeout(fetchLicenses, 2500)

    return () => {
      mounted = false
      clearTimeout(retry)
    }
  }, [])

  const hasRetos = useMemo(() => products.includes('retos'), [products])
  const hasAgenda = useMemo(() => products.includes('agenda'), [products])

  const title = (() => {
    if (status !== 'success') return 'Pago cancelado'
    if (sku === 'retos') return '¡Listo! Tu acceso a 21 Retos está activo'
    if (sku === 'agenda') return '¡Listo! Acceso a Agenda Devocional'
    return '¡Listo! Acceso al Combo (Agenda + 21 Retos)'
  })()

  const subtitle =
    status === 'success'
      ? 'Si no ves acceso aún, espera unos segundos mientras sincronizamos tu compra.'
      : 'No se realizó ningún cobro. Puedes volver a intentarlo desde la tienda.'

  return (
    <main className="min-h-[100svh] bg-gradient-to-br from-[#0b3b7a] via-[#155e75] to-[#0ea5a3] px-6 py-16 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="text-sm opacity-90">{subtitle}</p>
          {status === 'success' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Pill ok={hasRetos}>Retos {hasRetos ? 'activado' : 'pendiente'}</Pill>
              <Pill ok={hasAgenda}>Agenda {hasAgenda ? 'activado' : 'pendiente'}</Pill>
              {loading && <Pill>verificando…</Pill>}
            </div>
          )}
        </header>

        {status === 'success' ? (
          <section className="grid gap-4 md:grid-cols-2">
            {(sku === 'retos' || sku === 'combo') && (
              <article className="space-y-3 rounded-3xl bg-white/10 p-6 ring-1 ring-white/20">
                <h2 className="text-xl font-medium">
                  Acceso a <span className="font-semibold">21 Retos</span>
                </h2>
                <p className="text-sm opacity-90">
                  Aquí encontrarás el reto diario, calendario, metas y seguimiento personalizado.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/hoy"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      hasRetos
                        ? 'bg-white/90 text-slate-900 hover:bg-white'
                        : 'pointer-events-none bg-white/20 text-white/60'
                    }`}
                  >
                    Ir al reto de hoy
                  </Link>
                  <Link
                    href="/retos"
                    className="rounded-full px-5 py-2 text-sm font-medium bg-white/10 hover:bg-white/20"
                  >
                    Ver lista de retos
                  </Link>
                </div>
                {!hasRetos && (
                  <p className="text-xs opacity-80">
                    Puede tardar un momento. Asegúrate de iniciar sesión con el mismo correo usado en el pago.
                  </p>
                )}
              </article>
            )}

            {(sku === 'agenda' || sku === 'combo') && (
              <article className="space-y-3 rounded-3xl bg-white/10 p-6 ring-1 ring-white/20">
                <h2 className="text-xl font-medium">
                  Acceso a <span className="font-semibold">Agenda Devocional</span>
                </h2>
                <p className="text-sm opacity-90">
                  La Agenda vive en la app del ministerio. Ingresa con el mismo correo del pago para ver tu licencia.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={AGENDA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-5 py-2 text-sm font-medium bg-white/90 text-slate-900 hover:bg-white"
                  >
                    Abrir Agenda
                  </a>
                  <a
                    href={`${AGENDA_URL}/login`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-5 py-2 text-sm font-medium bg-white/10 hover:bg-white/20"
                  >
                    Iniciar sesión / registrarme
                  </a>
                </div>
                {!hasAgenda && (
                  <p className="text-xs opacity-80">
                    Si no aparece de inmediato, actualiza esta página en unos segundos. Usamos el mismo correo para activar tu acceso.
                  </p>
                )}
              </article>
            )}
          </section>
        ) : (
          <div className="text-center">
            <Link
              href="/pago"
              className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-slate-900 hover:bg-white"
            >
              Volver a la tienda
            </Link>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
          <Link href="/" className="underline underline-offset-4">Volver al inicio</Link>
          <button
            onClick={() => location.reload()}
            className="underline underline-offset-4 hover:text-white"
          >
            Actualizar estado
          </button>
        </footer>
      </div>
    </main>
  )
}

