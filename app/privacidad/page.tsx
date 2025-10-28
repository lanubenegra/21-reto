"use client";

import Link from "next/link";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
  process.env.SUPPORT_EMAIL ??
  "info@ministeriomana.org";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-8 px-6 py-16 text-slate-800">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Devocional Maná</p>
        <h1 className="text-4xl font-semibold">Aviso de privacidad</h1>
        <p className="text-base text-slate-600">
          Queremos que te sientas seguro mientras avanzas en 21 Retos. Aquí te contamos cómo
          tratamos tu información personal y qué medidas implementamos para protegerla.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Qué datos guardamos</h2>
        <p className="text-slate-600">
          Registramos tu nombre, correo electrónico, fecha de inicio de plan, evaluaciones y progreso
          en los retos para personalizar la experiencia. También guardamos la confirmación de licencias
          que recibes a través de Stripe, Wompi u otros canales autorizados.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Cómo usamos tu información</h2>
        <p className="text-slate-600">
          Utilizamos tus datos únicamente para los fines del programa (seguimiento, recordatorios,
          acceso a Agenda y soporte). No vendemos tu información ni la compartimos con terceros sin tu
          autorización expresa, salvo requerimientos legales.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Tus derechos</h2>
        <p className="text-slate-600">
          Puedes solicitar la actualización o eliminación de tus datos escribiéndonos a{" "}
          <a className="underline decoration-blue-500/40 underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . También puedes cerrar sesión o eliminar tu cuenta desde la plataforma.
        </p>
        <p className="text-sm text-slate-500">
          Si requieres más detalles sobre nuestras políticas de protección de datos, contáctanos o
          visita <Link className="underline decoration-blue-500/40 underline-offset-4" href="/contacto">nuestro formulario de soporte</Link>.
        </p>
      </section>
    </main>
  );
}
