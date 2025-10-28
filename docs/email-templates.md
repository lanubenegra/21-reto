# Email Templates Overview

Cada plantilla dinámica de SendGrid que usa la app se identifica mediante una variable de entorno `SENDGRID_TEMPLATE_*`. A continuación se detalla el evento que la dispara y los campos específicos que añadimos al `dynamicTemplateData`.

### Campos comunes incluidos automáticamente
Todas las plantillas reciben estos valores desde `lib/email/notifications.ts`:

| Clave | Descripción | Origen |
| --- | --- | --- |
| `siteUrl` | URL base pública del proyecto | `NEXT_PUBLIC_BASE_URL` (o `NEXTAUTH_URL`) |
| `loginUrl` | URL de inicio de sesión (`/auth/signin`) | derivado de `siteUrl` |
| `supportEmail` | Correo de soporte mostrado en el footer | `SUPPORT_EMAIL` → `SENDGRID_ALERT_TO` → `SENDGRID_FROM` |
| `year` | Año actual | calculado en runtime |
| `logo_url` / `logo_url_dark` / `logo_url_light` | Logo usado en el header (oscuro/claro) | `SENDGRID_LOGO_*` (ver `.env`) con fallback a los assets locales |
| `notifications_url` | Link “Administrar notificaciones” | `SENDGRID_NOTIFICATIONS_URL` o `${siteUrl}/notificaciones` |
| `privacy_url` | Link “Aviso de privacidad” | `SENDGRID_PRIVACY_URL` o `${siteUrl}/privacidad` |
| `intro_regular_woff2_url` / `intro_bold_woff2_url` / `intro_black_woff2_url` | Fuentes Intro opcionales | `INTRO_*_URL` (si existen) |

Además cada helper define `subject`, `preheader` y `tag` adecuados al caso; los valores que pasemos desde el backend pueden sobrescribirlos al estar al final del spread (`{ ...defaults, ...data }`).

| Variable | Evento | Datos enviados |
| --- | --- | --- |
| `SENDGRID_TEMPLATE_VERIFY_EMAIL` | Nuevo registro o reenvío de verificación (`app/api/auth/register/route.ts`) | `name`, `email`, `verificationUrl`, `loginUrl`, `supportEmail`, `siteUrl` |
| `SENDGRID_TEMPLATE_SIGNUP_WELCOME` | *(reservado)* Actualmente no se envía automáticamente; se puede reutilizar después de la verificación si se desea. |
| `SENDGRID_TEMPLATE_RESET_PASSWORD` | Solicitud de reseteo (`/api/auth/reset-request`, `/api/me/password/reset-request`) | `email`, `name?`, `resetUrl`, `expiresAt`, `supportEmail`, `siteUrl` |
| `SENDGRID_TEMPLATE_RESET_SUCCESS` | Contraseña restablecida (`/api/auth/reset`, `/api/me/password/reset-confirm`) | `email`, `name?`, `changeDate`, `loginUrl`, `supportEmail` |
| `SENDGRID_TEMPLATE_PASSWORD_CHANGED` | Cambio manual de contraseña (`/api/me/password/change`) | `email`, `changeDate`, `supportEmail`, `siteUrl` |
| `SENDGRID_TEMPLATE_SUPPORT_PASSWORD_RESET` | Reset forzado por soporte (`/api/admin/users/set-password`) | `email`, `name?`, `changeDate`, `supportEmail`, `actorId` |
| `SENDGRID_TEMPLATE_PROFILE_UPDATED_BY_SUPPORT` | Soporte actualiza perfil (`/api/admin/users/update-profile`) | `email`, `name?`, `updatedFields`, `supportEmail`, `actorId` |
| `SENDGRID_TEMPLATE_ROLE_CHANGED` | Cambio de rol (`/api/admin/roles/set`) | `email`, `name?`, `role`, `supportEmail`, `actorId` |
| `SENDGRID_TEMPLATE_WELCOME_RETOS` | Licencia Retos activada (Stripe/Wompi/grant/admin) | `email`, `sku`, `source`, `sessionId?`, `reference?`, `supportEmail` |
| `SENDGRID_TEMPLATE_AGENDA_ACTIVATION` | Licencia Agenda activada (Stripe/Wompi/grant/admin) | `email`, `sku`, `source`, `sessionId?`, `reference?`, `supportEmail` |
| `SENDGRID_TEMPLATE_PAYMENT_RECEIPT` | Pago aprobado (Stripe/Wompi) | `email`, `sku`, `provider`, `sessionId?`, `paymentIntent?`, `amount`, `amountCents`, `currency`, `supportEmail` |
| `SENDGRID_TEMPLATE_PAYMENT_FAILED` | Pago fallido (Stripe/Wompi) | `email`, `sku`, `provider`, `paymentIntent?`, `amount`, `amountCents`, `currency`, `reason?`, `supportEmail` |
| `SENDGRID_TEMPLATE_EXTERNAL_GRANT` | Licencia otorgada vía `/api/grant` | `email`, `sku`, `source`, `supportEmail` |
| `SENDGRID_TEMPLATE_LICENSE_REVOKED` | Licencia revocada por admin (`/api/admin/revoke`) | `email`, `product`, `actorId`, `supportEmail` |
| `SENDGRID_TEMPLATE_AGENDA_REACTIVATED` | Agenda reactivada (`/api/admin/regrant-agenda`) | `email`, `actorId`, `supportEmail` |
| `SENDGRID_TEMPLATE_PLAN_START` | Inicio de plan 21 Retos (`/api/enroll`) | `email`, `name`, `startDate`, `siteUrl`, `supportEmail` |
| `SENDGRID_TEMPLATE_ASSESSMENT_SUMMARY` | Registro de evaluación (`/api/assessments`) | `email`, `name`, `kind`, `values`, `siteUrl`, `supportEmail` |
| `SENDGRID_TEMPLATE_COMPLETION_CERTIFICATE` | Firma de compromiso (fetch `/api/notifications/completion`) | `email`, `name`, `completedAt`, `scores`, `siteUrl`, `supportEmail` |
| `SENDGRID_TEMPLATE_GRANT_FAILURE_ALERT` | Alerta interna cuando falla el otorgamiento Agenda (`lib/grant-agenda.ts`, `/api/cron/grant-retry`) | `email?`, `targetEmail`, `tries`, `stage`, `error` |

> Nota: `supportEmail` toma el valor de `SUPPORT_EMAIL` o `SENDGRID_ALERT_TO`, con fallback a `SENDGRID_FROM`. `siteUrl` corresponde a `NEXT_PUBLIC_BASE_URL` (o derivado de la solicitud) para construir enlaces absolutos.

### Variables auxiliares
- `SENDGRID_ALERT_TO`: dirección que recibe las alertas internas (grant fallido).  
- `SUPPORT_EMAIL`: correo de soporte mostrado a los usuarios en copys de cada plantilla.

### Verificación de correo
El flujo de registro genera un enlace de confirmación vía `supabaseAdmin.auth.admin.generateLink(type: "signup")`, que se entrega en `verificationUrl`. Tras hacer clic, Supabase marca el correo como verificado y el usuario puede iniciar sesión.
