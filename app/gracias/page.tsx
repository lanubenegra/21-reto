import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Gracias por tu compra · 21 Retos',
}

type Props = {
  searchParams: { sku?: string | string[]; status?: string | string[] }
}

const PRODUCT_NAMES: Record<string, string> = {
  retos: '21 Retos',
  agenda: 'Agenda Devocional',
  combo: 'Combo 21 Retos + Agenda',
}

export default function GraciasPage({ searchParams }: Props) {
  const status = Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status
  const sku = Array.isArray(searchParams.sku) ? searchParams.sku[0] : searchParams.sku
  const productName = (sku ? PRODUCT_NAMES[sku] : null) ?? 'tu compra'

  const success = status === 'success'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-mana-gradient px-6 text-center text-white">
      <div className="max-w-xl space-y-4">
        <span className="text-xs uppercase tracking-[0.4em] text-white/70">
          {success ? 'Pago confirmado' : 'Estado de tu pedido'}
        </span>
        <h1 className="text-3xl font-semibold">
          {success
            ? `¡Gracias! Ya activamos ${productName}`
            : 'Estamos verificando tu pago'}
        </h1>
        <p className="text-sm text-white/80">
          {success
            ? 'Puedes regresar a 21 Retos y comenzar a disfrutar del contenido premium. Si no ves la licencia activa, refresca la página o contáctanos con tu correo.'
            : 'Si cerraste el checkout antes de finalizar, vuelve a intentarlo desde la tienda. Ante cualquier duda escríbenos y te ayudamos.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-white/10 px-6 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          Volver a 21 Retos
        </Link>
        <Link
          href="/pago"
          className="rounded-full border border-white/30 px-6 py-2 text-sm font-medium text-white/80 transition hover:border-white hover:text-white"
        >
          Ir a la tienda
        </Link>
      </div>
    </main>
  )
}

