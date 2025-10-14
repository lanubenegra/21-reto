'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { HeartHandshake, Loader2 } from 'lucide-react'

const PRICE_RETOS = 'price_1SHG3mIyRLQMwrutNjcgG2YJ'
const PRICE_AGENDA = 'price_1SHQhsIyRLQMwrutPHPJkPHx'
const PRICE_COMBO = 'price_1SHQjNIyRLQMwrutK4idIL7x'

type SKU = 'retos' | 'agenda' | 'combo'

type FormState = {
  name: string
  email: string
  password: string
  phone: string
  country: string
  city: string
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  country: '',
  city: '',
}

const OPTION_COPY: Record<SKU, { title: string; description: string; priceId: string }> = {
  retos: {
    title: 'Donar 21 Retos',
    description: 'Activa la ruta completa de los 21 Retos en esta plataforma.',
    priceId: PRICE_RETOS,
  },
  agenda: {
    title: 'Donar Agenda Devocional',
    description: 'Recibe acceso a la Agenda Devocional del Ministerio Maná.',
    priceId: PRICE_AGENDA,
  },
  combo: {
    title: 'Donar Combo (Retos + Agenda)',
    description: 'Activa los 21 Retos y la Agenda Devocional al mismo tiempo.',
    priceId: PRICE_COMBO,
  },
}

export default function Pago() {
  const { data: session } = useSession()
  const isLoggedIn = Boolean(session?.user)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState<SKU | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      setForm(prev => ({ ...prev, email: session.user?.email ?? prev.email }))
    }
  }, [session?.user?.email])

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const validateForm = () => {
    const required: Array<keyof FormState> = ['name', 'email', 'phone', 'country', 'city']
    for (const key of required) {
      if (!form[key].trim()) {
        const labels: Record<keyof FormState, string> = {
          name: 'Nombre completo',
          email: 'Correo electrónico',
          password: 'Contraseña',
          phone: 'Teléfono',
          country: 'País',
          city: 'Ciudad',
        }
        setFeedback(`Por favor completa el campo “${labels[key]}”.`)
        return false
      }
    }

    if (!isLoggedIn && form.password.trim().length < 6) {
      setFeedback('Crea una contraseña con al menos 6 caracteres.')
      return false
    }

    if (isLoggedIn && session?.user?.email && form.email.trim().toLowerCase() !== session.user.email.toLowerCase()) {
      setFeedback('El correo de la donación debe coincidir con el que usas en tu cuenta. Actualízalo o inicia sesión con ese correo.')
      return false
    }

    setFeedback(null)
    return true
  }

  async function ensureAccount(email: string) {
    if (isLoggedIn) {
      return true
    }

    const registerResponse = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email, password: form.password }),
    })

    if (!registerResponse.ok) {
      const data = await registerResponse.json().catch(() => null)
      const message = data?.message ?? 'No fue posible crear tu cuenta. Si ya tienes una, inicia sesión primero.'
      // Si la cuenta ya existe intentamos iniciar sesión con la contraseña ingresada.
      if (registerResponse.status === 409 || message.toLowerCase().includes('existe')) {
        const loginResult = await signIn('credentials', { email, password: form.password, redirect: false })
        if (loginResult?.error) {
          setFeedback('El correo ya tiene una cuenta. Inicia sesión desde la sección Acceso o recupera tu contraseña.')
          return false
        }
        return true
      }

      setFeedback(message)
      return false
    }

    const signInResult = await signIn('credentials', {
      email,
      password: form.password,
      redirect: false,
    })

    if (signInResult?.error) {
      setFeedback('Cuenta creada. Inicia sesión con tu nueva contraseña e intenta nuevamente.')
      return false
    }

    return true
  }

  async function handleDonation(sku: SKU) {
    if (loading) return
    if (!validateForm()) return

    const priceId = OPTION_COPY[sku].priceId
    const email = form.email.trim().toLowerCase()

    setLoading(sku)
    try {
      const accountReady = await ensureAccount(email)
      if (!accountReady) return

      const response = await fetch('/api/pay/stripe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          priceId,
          email,
          profile: {
            name: form.name.trim(),
            phone: form.phone.trim(),
            country: form.country.trim(),
            city: form.city.trim(),
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? 'No se pudo iniciar el checkout.')
      }

      const payload = (await response.json()) as { url?: string }
      if (payload.url) {
        window.location.href = payload.url
      } else {
        throw new Error('No se recibió la URL del checkout. Intenta nuevamente.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar la donación.'
      setFeedback(message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0b3b7a] via-[#155e75] to-[#0ea5a3] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3 text-center">
          <span className="text-xs uppercase tracking-[0.45em] text-white/70">Ministerio Maná · Donaciones</span>
          <h1 className="text-4xl font-semibold md:text-5xl">Sostén 21 Retos — Donación en línea</h1>
          <p className="mx-auto max-w-2xl text-sm text-white/80">
            Tus donaciones permiten que más personas vivan los 21 Retos y accedan a la Agenda Devocional. Llena tus datos, confirma con tu correo y completa el aporte seguro en Stripe.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5 rounded-3xl bg-white/15 p-6 shadow-xl ring-1 ring-white/15 backdrop-blur">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Datos del donante</h2>
              <p className="text-sm text-white/80">
                Usa el mismo correo con el que iniciarás sesión. Si aún no tienes cuenta, la crearemos con estos datos antes de llevarte al checkout.
              </p>
            </div>

            <form className="space-y-4" onSubmit={(event: FormEvent) => event.preventDefault()}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="donor-name" className="text-xs uppercase tracking-[0.3em] text-white/60">Nombre completo</Label>
                  <Input id="donor-name" value={form.name} onChange={handleChange('name')} placeholder="Tu nombre" className="bg-white/90 text-slate-900" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="donor-phone" className="text-xs uppercase tracking-[0.3em] text-white/60">Teléfono</Label>
                  <Input id="donor-phone" value={form.phone} onChange={handleChange('phone')} placeholder="+57 300 000 0000" className="bg-white/90 text-slate-900" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="donor-country" className="text-xs uppercase tracking-[0.3em] text-white/60">País</Label>
                  <Input id="donor-country" value={form.country} onChange={handleChange('country')} placeholder="Colombia" className="bg-white/90 text-slate-900" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="donor-city" className="text-xs uppercase tracking-[0.3em] text-white/60">Ciudad</Label>
                  <Input id="donor-city" value={form.city} onChange={handleChange('city')} placeholder="Medellín" className="bg-white/90 text-slate-900" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="donor-email" className="text-xs uppercase tracking-[0.3em] text-white/60">Correo electrónico</Label>
                  <Input
                    id="donor-email"
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="tu@email.com"
                    className="bg-white/90 text-slate-900"
                    disabled={isLoggedIn}
                  />
                </div>
                {!isLoggedIn && (
                  <div className="space-y-1">
                    <Label htmlFor="donor-password" className="text-xs uppercase tracking-[0.3em] text-white/60">Contraseña</Label>
                    <Input
                      id="donor-password"
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-white/90 text-slate-900"
                    />
                  </div>
                )}
              </div>
            </form>

            {feedback && (
              <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/40">
                {feedback}
              </div>
            )}

            <p className="text-xs text-white/70">
              Al continuar aceptas nuestras políticas de tratamiento de datos y reconoces que esta es una donación voluntaria para Ministerio Maná.
            </p>
          </div>

          <div className="space-y-4">
            {(Object.keys(OPTION_COPY) as SKU[]).map(option => {
              const isOptionLoading = loading === option
              const { title, description } = OPTION_COPY[option]
              return (
                <article key={option} className="rounded-3xl bg-white/12 p-6 ring-1 ring-white/15 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <HeartHandshake className="h-6 w-6 text-white/80" />
                    <h3 className="text-lg font-semibold">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-white/80">{description}</p>
                  <Button
                    className="mt-4 w-full bg-white text-slate-900 hover:bg-white/90"
                    onClick={() => handleDonation(option)}
                    disabled={Boolean(loading) && !isOptionLoading}
                  >
                    {isOptionLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</span>
                    ) : (
                      'Donar ahora'
                    )}
                  </Button>
                </article>
              )
            })}

            <div className="rounded-3xl bg-white/10 p-4 text-center text-xs text-white/70 ring-1 ring-white/10">
              Usa la tarjeta de prueba 4242 4242 4242 4242, fecha futura y CVC 123 cuando estés en el checkout de Stripe (modo prueba).
            </div>

            <Link href="/" className="block text-center text-xs underline underline-offset-4 text-white/80 hover:text-white">
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
