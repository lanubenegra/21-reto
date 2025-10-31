'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { HeartHandshake, Loader2 } from 'lucide-react'

type SKU = 'retos' | 'agenda' | 'combo'

type FormState = {
  name: string
  email: string
  password: string
  phone: string
  country: string
  city: string
  documentType: string
  documentNumber: string
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  phone: '',
  country: '',
  city: '',
  documentType: '',
  documentNumber: '',
}

const OPTION_COPY: Record<SKU, { title: string; description: string }> = {
  retos: {
    title: 'Donar 21 Retos',
    description: 'Activa la ruta completa de los 21 Retos en esta plataforma.',
  },
  agenda: {
    title: 'Donar Agenda Devocional',
    description: 'Recibe acceso a la Agenda Devocional del Ministerio Maná.',
  },
  combo: {
    title: 'Donar Combo (Retos + Agenda)',
    description: 'Activa los 21 Retos y la Agenda Devocional al mismo tiempo.',
  },
}

const DOCUMENT_TYPES = [
  { value: '', label: 'Selecciona un documento' },
  { value: 'CC', label: 'Cédula de ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de extranjería (CE)' },
  { value: 'TI', label: 'Tarjeta de identidad (TI)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'DNI', label: 'Documento nacional (DNI)' },
]

export default function Pago() {
  const { data: session } = useSession()
  const isLoggedIn = Boolean(session?.user)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [loading, setLoading] = useState<SKU | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const profilePrefilledRef = useRef(false)
  const localPrefillEmailRef = useRef<string | null>(null)
  const cookieCountry = useMemo(() => {
    if (typeof document === 'undefined') return ''
    const match = document.cookie.split(';').map(entry => entry.trim()).find(entry => entry.startsWith('country='))
    if (!match) return ''
    const value = match.split('=').slice(1).join('=').toUpperCase()
    return value.length === 2 ? value : ''
  }, [])

  const normalizeCountry = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return cookieCountry || 'US'
    const upper = trimmed.toUpperCase()
    if (upper.length === 2) return upper

    const normalized = upper
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')

    const map: Record<string, string> = {
      COLOMBIA: 'CO',
      'REPUBLICA DE COLOMBIA': 'CO',
      MEXICO: 'MX',
      'ESTADOS UNIDOS': 'US',
      ESTADOSUNIDOS: 'US',
      USA: 'US',
      PERU: 'PE',
      CHILE: 'CL',
      ARGENTINA: 'AR',
      ECUADOR: 'EC',
      PANAMA: 'PA',
      'COSTA RICA': 'CR',
      COSTARICA: 'CR',
      ESPANA: 'ES',
      ESPAÑA: 'ES',
    }

    return map[normalized] || cookieCountry || 'US'
  }

  useEffect(() => {
    if (session?.user?.email) {
      setForm(prev => ({ ...prev, email: session.user?.email ?? prev.email }))
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (session?.user?.name) {
      setForm(prev => ({ ...prev, name: session.user?.name ?? prev.name }))
    }
  }, [session?.user?.name])

  useEffect(() => {
    if (!isLoggedIn || profilePrefilledRef.current) return
    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch('/api/me/profile', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        if (cancelled || !data?.profile) return
        const profile = data.profile as {
          display_name?: string | null
          country?: string | null
          whatsapp?: string | null
        }
        setForm(prev => {
          const next: FormState = { ...prev }
          let changed = false
          if (!prev.name.trim() && profile.display_name) {
            next.name = profile.display_name
            changed = true
          }
          if (!prev.phone.trim() && profile.whatsapp) {
            next.phone = profile.whatsapp
            changed = true
          }
          if (!prev.country.trim() && profile.country) {
            next.country = profile.country
            changed = true
          }
          return changed ? next : prev
        })
        profilePrefilledRef.current = true
      } catch (error) {
        console.error('[pago] profile prefill failed', error)
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (cookieCountry && !form.country) {
      setForm(prev => ({ ...prev, country: cookieCountry }))
    }
  }, [cookieCountry, form.country])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const emailKey = form.email.trim().toLowerCase()
    if (!emailKey) {
      localPrefillEmailRef.current = null
      return
    }
    if (localPrefillEmailRef.current === emailKey) return

    const raw = window.localStorage.getItem(`donation-profile:${emailKey}`)
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Partial<FormState>
        setForm(prev => {
          const next: FormState = { ...prev }
          let changed = false
          if (!prev.name.trim() && saved.name) {
            next.name = saved.name
            changed = true
          }
          if (!prev.phone.trim() && saved.phone) {
            next.phone = saved.phone
            changed = true
          }
          if (!prev.country.trim() && saved.country) {
            next.country = saved.country
            changed = true
          }
          if (!prev.city.trim() && saved.city) {
            next.city = saved.city
            changed = true
          }
          if (!prev.documentType.trim() && saved.documentType) {
            next.documentType = saved.documentType
            changed = true
          }
          if (!prev.documentNumber.trim() && saved.documentNumber) {
            next.documentNumber = saved.documentNumber
            changed = true
          }
          return changed ? next : prev
        })
      } catch (error) {
        console.error('[pago] failed to parse stored donor profile', error)
      }
    }

    localPrefillEmailRef.current = emailKey
  }, [form.email])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const emailKey = form.email.trim().toLowerCase()
    if (!emailKey) return
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      documentType: form.documentType.trim(),
      documentNumber: form.documentNumber.trim(),
    }
    window.localStorage.setItem(`donation-profile:${emailKey}`, JSON.stringify(payload))
  }, [form.name, form.phone, form.country, form.city, form.documentType, form.documentNumber, form.email])

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const handleSelect = (field: keyof FormState) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const validateForm = () => {
    const required: Array<keyof FormState> = ['name', 'email', 'phone', 'country', 'city']
    const countryCode = normalizeCountry(form.country)
    if (countryCode === 'CO') {
      required.push('documentType', 'documentNumber')
    }
    for (const key of required) {
      if (!form[key].trim()) {
        const labels: Record<keyof FormState, string> = {
          name: 'Nombre completo',
          email: 'Correo electrónico',
          password: 'Contraseña',
          phone: 'Teléfono',
          country: 'País',
          city: 'Ciudad',
          documentType: 'Tipo de documento',
          documentNumber: 'Número de documento',
        }
        setFeedback(`Por favor completa el campo “${labels[key]}”.`)
        return false
      }
    }

    if (!isLoggedIn && form.password.trim().length < 8) {
      setFeedback('Crea una contraseña con al menos 8 caracteres.')
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

    const payload = (await registerResponse.json().catch(() => ({}))) as { message?: string }

    if (registerResponse.status === 201 || registerResponse.status === 202) {
      setFeedback(
        payload?.message ??
          'Te enviamos un correo para confirmar tu cuenta. Revísalo antes de continuar con la donación.'
      )
      return false
    }

    if (!registerResponse.ok) {
      const message =
        payload?.message ?? 'No fue posible crear tu cuenta. Si ya tienes una, inicia sesión primero.'
      // Si la cuenta ya existe intentamos iniciar sesión con la contraseña ingresada.
      if (registerResponse.status === 409 || message.toLowerCase().includes('existe')) {
        const loginResult = await signIn('credentials', { email, password: form.password, redirect: false })
        if (loginResult?.error) {
          setFeedback(
            'El correo ya tiene una cuenta. Confirma tu correo o inicia sesión desde la sección Acceso.'
          )
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

    const email = form.email.trim().toLowerCase()
    const countryCode = normalizeCountry(form.country)

    setLoading(sku)
    try {
      const accountReady = await ensureAccount(email)
      if (!accountReady) return

      const pricingResponse = await fetch(`/api/prices?sku=${sku}&country=${countryCode}`, {
        cache: 'no-store',
        credentials: 'include',
      })

      if (!pricingResponse.ok) {
        const data = await pricingResponse.json().catch(() => null)
        throw new Error(data?.message ?? 'No pudimos obtener el precio para tu país.')
      }

      const pricePayload = (await pricingResponse.json()) as { provider: 'wompi' | 'stripe'; url: string }

      if (pricePayload.provider === 'wompi') {
        window.location.href = pricePayload.url
        return
      }

      const priceId = pricePayload.url

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
            documentType: form.documentType.trim(),
            documentNumber: form.documentNumber.trim(),
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
            Tus donaciones permiten que más personas vivan los 21 Retos y accedan a la Agenda Devocional. Llena tus datos, confirma con tu correo y completa el aporte a través de nuestras pasarelas seguras (Stripe o Wompi según tu país). Si estás en Colombia necesitaremos tu tipo y número de documento para fines de facturación.
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
                  <Label htmlFor="donor-document-type" className="text-xs uppercase tracking-[0.3em] text-white/60">Tipo de documento</Label>
                  <select
                    id="donor-document-type"
                    value={form.documentType}
                    onChange={handleSelect('documentType')}
                    className="w-full rounded-md border border-transparent bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-white focus:ring-2 focus:ring-white/60"
                  >
                    {DOCUMENT_TYPES.map(option => (
                      <option key={option.value || 'empty'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="donor-document-number" className="text-xs uppercase tracking-[0.3em] text-white/60">Número de documento</Label>
                  <Input
                    id="donor-document-number"
                    value={form.documentNumber}
                    onChange={handleChange('documentNumber')}
                    placeholder="CC 1234567890"
                    className="bg-white/90 text-slate-900"
                  />
                </div>
              </div>
              <p className="text-xs text-white/70">
                Si estás en Colombia, estos datos son obligatorios para reportes tributarios. Si ya los tenemos guardados, puedes actualizarlos si cambiaron.
              </p>

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
              Si el checkout es Stripe (modo prueba), usa la tarjeta 4242 4242 4242 4242 con fecha futura y CVC 123.
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
