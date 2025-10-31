"use client";

import Link from "next/link";
import { Mail, MessageCircle, LifeBuoy, Facebook } from "lucide-react";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
  process.env.SUPPORT_EMAIL ??
  "info@ministeriomana.org";

const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ??
  "+57 315 000 0000";

const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL ??
  "https://wa.me/573150000000";

const COMMUNITY_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_URL ??
  "https://www.facebook.com/groups/devocionalmana";

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#08112e] via-[#0d1738] to-[#08112e] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-4 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">Devocional Maná</p>
          <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Estamos aquí para ayudarte
          </h1>
          <p className="text-base leading-relaxed text-white/75 md:text-lg">
            Si tienes dudas sobre tu acceso, pagos o necesitas acompañamiento para tus 21 retos,
            usa cualquiera de estos canales. Respondemos personalmente cada solicitud.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_28px_60px_-36px_rgba(5,12,45,0.85)] backdrop-blur-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Escríbenos un correo</h2>
              <p className="text-sm leading-relaxed text-white/70">
                Resolvemos temas de facturación, contraseñas y soporte técnico. Te contestaremos en menos de 24 h hábiles.
              </p>
            </div>
            <Link
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-auto inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {SUPPORT_EMAIL}
            </Link>
          </article>

          <article className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_28px_60px_-36px_rgba(5,12,45,0.85)] backdrop-blur-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Chat por WhatsApp</h2>
              <p className="text-sm leading-relaxed text-white/70">
                Ideal para gestiones rápidas. Cuéntanos tu caso y te guiamos paso a paso.
              </p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              {SUPPORT_WHATSAPP}
            </a>
          </article>

          <article className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_28px_60px_-36px_rgba(5,12,45,0.85)] backdrop-blur-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Centro de ayuda</h2>
              <p className="text-sm leading-relaxed text-white/70">
                Explora guías y preguntas frecuentes sobre inscripciones, licencias y seguimiento espiritual.
              </p>
            </div>
            <Link
              href="/notificaciones"
              className="mt-auto inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Ver recursos
            </Link>
          </article>
        </section>

        <section className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-6 text-sm leading-relaxed text-white/80 shadow-[0_18px_42px_-30px_rgba(5,12,45,0.85)]">
          <h2 className="text-xl font-semibold text-white">Horarios y tiempos de respuesta</h2>
          <p>
            Nuestro equipo responde mensajes de lunes a viernes entre las 8:00 a. m. y las 6:00 p. m. (GMT-5).
            Si escribes fuera de ese horario, recibirás confirmación automática y retomaremos tu caso al iniciar la jornada.
          </p>
          <p>
            ¿Tu cuenta fue bloqueada o necesitas ayuda urgente con un pago? Usa el asunto <strong>“Atención prioritaria”</strong> en tu correo para
            que sea identificado primero.
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/10 p-6 text-sm text-white/75 shadow-[0_18px_42px_-30px_rgba(5,12,45,0.85)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mana-primary/20 text-mana-primary">
              <Facebook className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-white">Únete a la comunidad</p>
              <p className="text-sm text-white/70">
                Comparte testimonios, preguntas y recursos con otros participantes.
              </p>
            </div>
          </div>
          <a
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Ir al grupo
          </a>
        </section>
      </div>
    </main>
  );
}
