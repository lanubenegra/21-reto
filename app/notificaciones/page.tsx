"use client";

import Link from "next/link";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ??
  process.env.SUPPORT_EMAIL ??
  "info@ministeriomana.org";

export default function NotificationsPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-8 px-6 py-16 text-slate-800">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Devocional Maná</p>
        <h1 className="text-4xl font-semibold">Preferencias de notificaciones</h1>
        <p className="text-base text-slate-600">
          Aquí te explicamos cómo usamos tu correo y cómo puedes administrar los mensajes que enviamos
          desde la comunidad Devocional Maná y nuestros productos 21 Retos y Agenda Devocional.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Correos obligatorios</h2>
        <p className="text-slate-600">
          Algunos mensajes son indispensables para la seguridad de tu cuenta: verificación de correo,
          restablecimiento de contraseña, avisos de pago y confirmaciones administrativas. Estos
          correos no se pueden desactivar porque garantizan que solo tú puedas acceder a tus licencias
          y donaciones.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Comunicaciones opcionales</h2>
        <p className="text-slate-600">
          Nuestro equipo puede enviarte resúmenes del plan, recordatorios devocionales o noticias del
          ministerio. Si en algún momento deseas pausar estas comunicaciones no esenciales, responde
          cualquiera de nuestros correos solicitando la baja o escríbenos directamente a{" "}
          <a className="underline decoration-blue-500/40 underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="text-sm text-slate-500">
          También puedes administrar tu suscripción desde los enlaces “Administrar notificaciones” o
          “Darse de baja” incluidos en el pie de cada correo transaccional.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">¿Necesitas ayuda?</h2>
        <p className="text-slate-600">
          Si notas algún correo sospechoso o no reconoces una notificación, avísanos enseguida para
          proteger tu cuenta. Puedes escribirnos a{" "}
          <a className="underline decoration-blue-500/40 underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          o completar el formulario de contacto en{" "}
          <Link className="underline decoration-blue-500/40 underline-offset-4" href="/contacto">
            nuestros canales oficiales
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
