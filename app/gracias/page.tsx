'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Sku = 'retos' | 'agenda' | 'combo'
type LicenseEntry = { product?: string | null }
type LicensesResp = {
  hasRetos?: boolean;
  hasAgenda?: boolean;
  products?: string[];
  entitlements?: LicenseEntry[];
}

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

  const { status: authStatus } = useSession()
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    if (authStatus === 'loading') return
    if (authStatus !== 'authenticated') {
      if (mounted) {
        setProducts([])
        setLoading(false)
      }
      return
    }

    const fetchLicenses = async () => {
      try {
        const response = await fetch(`/api/licenses?ts=${Date.now()}`, { cache: 'no-store', credentials: 'include' })
        const payload = (await response.json()) as LicensesResp
        if (!mounted) return
        const list =
          payload.products ??
          (payload.entitlements ?? [])
            .map(entry => entry.product)
            .filter((product): product is string => Boolean(product))
        setProducts(list)
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchLicenses()
    const retry = setTimeout(() => {
      void fetchLicenses()
    }, 2500)

    return () => {
      mounted = false
      clearTimeout(retry)
    }
  }, [authStatus])

  const hasRetos = useMemo(() => products.includes('retos') || products.includes('combo'), [products])
  const hasAgenda = useMemo(() => products.includes('agenda') || products.includes('combo'), [products])

  const title = (() => {
    if (status !== 'success') return 'Pago cancelado'
    if (sku === 'agenda') return '¡Gracias por tu donación! Acceso a Agenda activado'
    if (sku === 'combo') return '¡Gracias por tu donación! Acceso a 21 Retos y Agenda activados'
    return '¡Gracias por tu donación! Tu acceso a 21 Retos está activado'
  })()

  const subtitle =
    status === 'success'
      ? 'Si no ves acceso aún, espera unos segundos mientras sincronizamos tu compra.'
      : 'No se realizó ningún cobro. Puedes volver a intentarlo desde la tienda.'

  return (
    <main className="min-h-[100svh] grid place-items-center bg-gradient-to-br from-[#0b3b7a] via-[#155e75] to-[#0ea5a3] px-6 py-16 text-white">
      <div className="w-full max-w-4xl space-y-10">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="text-sm opacity-90">{subtitle}</p>
          {status === 'success' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasRetos && <Pill ok>Retos activado</Pill>}
              {hasAgenda && <Pill ok>Agenda activada</Pill>}
              {loading && <Pill>verificando…</Pill>}
            </div>
          )}
        </header>

        {status === 'success' ? (
          <section className="grid justify-items-center gap-6 md:grid-cols-2">
            {(sku === 'retos' || sku === 'combo') && (
              <article className="w-full max-w-lg space-y-3 rounded-3xl bg-white/10 p-6 ring-1 ring-white/20">
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
                      hasRetos ? 'bg-white/90 text-slate-900 hover:bg-white' : 'bg-white/20 text-white/60'
                    } ${hasRetos ? '' : 'pointer-events-none'}`}
                  >
                    Comenzar mi primer reto
                  </Link>
                  <Link
                    href="/"
                    className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                      hasRetos ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/20 text-white/60 pointer-events-none'
                    }`}
                  >
                    Ingresar a 21 Retos
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
              <article className="w-full max-w-lg space-y-3 rounded-3xl bg-white/10 p-6 ring-1 ring-white/20">
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

        <section className="space-y-2 text-center text-sm text-white/80">
          <p>
            Si tienes algún inconveniente, escríbenos a{' '}
            <a href="mailto:info@ministeriomana.org" className="underline underline-offset-4 hover:text-white">
              info@ministeriomana.org
            </a>
          </p>
          <Link href="/" className="inline-flex items-center justify-center rounded-full bg-white/90 px-4 py-1.5 text-sm font-medium text-slate-900 hover:bg-white">
            Volver al inicio
          </Link>
        </section>
      </div>
    </main>
  )
}
