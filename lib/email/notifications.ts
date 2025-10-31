import { sendEmail, type SendEmailResult } from "./sendgrid";
import { requireTemplateId, hasTemplateId } from "./templates";
import { defaultEmailContext, templateBase } from "./context";

type Data = Record<string, unknown>;

function sanitizeCategory(value?: string | null) {
  if (!value) return undefined;
  const ascii = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  return ascii || undefined;
}

function composeData(data: Data) {
  const ctx = defaultEmailContext();
  const base = templateBase(ctx);
  const merged: Data = { ...base, ...data };
  return merged;
}

function buildFallbackText(label: string, merged: Data) {
  const lines: string[] = [];
  const preheader = merged.preheader;
  if (typeof preheader === "string" && preheader.trim()) {
    lines.push(preheader.trim());
  }

  const candidates = Object.entries(merged)
    .filter(([key, value]) => {
      if (typeof value !== "string") return false;
      const lowerKey = key.toLowerCase();
      return lowerKey.includes("url") || lowerKey.includes("link");
    })
    .map(([, value]) => value);

  candidates.forEach((value) => {
    if (typeof value === "string" && !lines.includes(value)) {
      lines.push(value);
    }
  });

  if (!lines.length) {
    const siteUrl = typeof merged.siteUrl === "string" ? merged.siteUrl : "";
    if (siteUrl) {
      lines.push(`Visita ${siteUrl} para continuar.`);
    } else {
      lines.push(`Notificación ${label}. Revisa tu panel de Devocional Maná.`);
    }
  }

  return lines.join("\n\n");
}

async function safeSend({
  label,
  to,
  templateKey,
  data,
}: {
  label: string;
  to: string;
  templateKey: Parameters<typeof requireTemplateId>[0];
  data: Data;
}): Promise<SendEmailResult> {
  const merged = composeData(data);
  const subject = typeof merged.subject === "string" ? merged.subject : undefined;
  const tag = sanitizeCategory(typeof merged.tag === "string" ? merged.tag : undefined);

  if (!hasTemplateId(templateKey)) {
    console.warn(`[email] template ${templateKey} missing; fallback send`, { to });
    const text = buildFallbackText(label, merged);
    return sendEmail({
      to,
      subject: subject ?? `Notificación ${label}`,
      text,
      tag,
    });
  }

  const templateId = requireTemplateId(templateKey);
  const primary = await sendEmail({
    to,
    templateId,
    dynamicTemplateData: merged,
    subject,
    tag,
  });

  if (primary.ok) {
    return primary;
  }

  console.error(`[email] ${label} failed`, {
    to,
    templateKey,
    status: primary.status,
    error: primary.ok ? null : primary.error,
  });

  const text = buildFallbackText(label, merged);
  return sendEmail({
    to,
    subject: subject ?? `Notificación ${label}`,
    text,
    tag,
  });
}

export function getDefaultSupportEmail() {
  return process.env.SENDGRID_ALERT_TO ?? process.env.SENDGRID_FROM ?? "";
}

// User facing
export const sendWelcomeRetosEmail = (to: string, data: Data = {}) =>
  safeSend({
    label: "welcomeRetos",
    to,
    templateKey: "welcomeRetos",
    data: {
      subject: "🚀 Tu transformación en 21 Retos arranca hoy",
      preheader: "Tu acceso ya está activo. Empieza hoy mismo con tu primer reto.",
      tag: "Bienvenida",
      ...data,
    },
  });

export const sendAgendaActivationEmail = (to: string, data: Data = {}) =>
  safeSend({
    label: "agendaActivation",
    to,
    templateKey: "agendaActivation",
    data: {
      subject: "🗓️ Tu Agenda Devocional te espera, ¿listo para empezar?",
      preheader: "Accede a la Agenda Devocional con tus credenciales de siempre.",
      tag: "Agenda",
      ...data,
    },
  });

export const sendResetPasswordEmail = (to: string, data: Data) =>
  safeSend({
    label: "resetPassword",
    to,
    templateKey: "resetPassword",
    data: {
      subject: "🔐 Recupera tu acceso en 2 pasos ultra rápidos",
      preheader: "Generamos un enlace seguro para que restablezcas tu contraseña.",
      tag: "Seguridad",
      ...data,
    },
  });

export const sendSignupWelcomeEmail = (to: string, data: Data) =>
  safeSend({
    label: "signupWelcome",
    to,
    templateKey: "signupWelcome",
    data: {
      subject: "🌱 Bienvenido a Devocional Maná: descubre lo que nadie te contó",
      preheader: "Estos son los pasos para comenzar con buen pie.",
      tag: "Bienvenida",
      ...data,
    },
  });

export const sendVerifyEmail = (to: string, data: Data) =>
  safeSend({
    label: "verifyEmail",
    to,
    templateKey: "verifyEmail",
    data: {
      subject: "✨ Estás a un clic de comenzar los retos que transformarán tus hábitos",
      preheader: "Activa tu cuenta y protege tu acceso.",
      tag: "Verificacion",
      ...data,
    },
  });

export const sendPasswordChangedEmail = (to: string, data: Data) =>
  safeSend({
    label: "passwordChanged",
    to,
    templateKey: "passwordChanged",
    data: {
      subject: "⚠️ ¿Fuiste tú? Confirmamos tu nueva contraseña",
      preheader: "Si no reconoces este cambio, contáctanos cuanto antes.",
      tag: "Seguridad",
      ...data,
    },
  });

export const sendPasswordResetSuccessEmail = (to: string, data: Data) =>
  safeSend({
    label: "passwordResetSuccess",
    to,
    templateKey: "passwordResetSuccess",
    data: {
      subject: "🔐 Clave actualizada: mira lo que cambió",
      preheader: "El acceso quedó actualizado. Inicia sesión de nuevo para continuar.",
      tag: "Seguridad",
      ...data,
    },
  });

export const sendSupportPasswordResetEmail = (to: string, data: Data) =>
  safeSend({
    label: "supportPasswordReset",
    to,
    templateKey: "supportPasswordReset",
    data: {
      subject: "🤝 Soporte abrió una puerta especial para ti",
      preheader: "Cambia tu contraseña al iniciar sesión para mantener tu cuenta protegida.",
      tag: "Soporte",
      ...data,
    },
  });

export const sendProfileUpdatedBySupportEmail = (to: string, data: Data) =>
  safeSend({
    label: "profileUpdatedBySupport",
    to,
    templateKey: "profileUpdatedBySupport",
    data: {
      subject: "🛠️ Ajustamos tu perfil para que brille más",
      preheader: "Un miembro del equipo ajustó algunos de tus datos de contacto.",
      tag: "Soporte",
      ...data,
    },
  });

export const sendRoleChangedEmail = (to: string, data: Data) =>
  safeSend({
    label: "roleChanged",
    to,
    templateKey: "roleChanged",
    data: {
      subject: "✨ Nuevo rol desbloqueado en Devocional Maná",
      preheader: "Revisa los nuevos permisos asignados a tu cuenta.",
      tag: "Permisos",
      ...data,
    },
  });

export const sendPaymentReceiptEmail = (to: string, data: Data) =>
  safeSend({
    label: "paymentReceipt",
    to,
    templateKey: "paymentReceipt",
    data: {
      subject: "🙏 Gracias por sembrar: mira lo que habilitaste",
      preheader: "Gracias por sembrar en Devocional Maná. Aquí los detalles de tu aporte.",
      tag: "Donación",
      ...data,
    },
  });

export const sendPaymentFailedEmail = (to: string, data: Data) =>
  safeSend({
    label: "paymentFailed",
    to,
    templateKey: "paymentFailed",
    data: {
      subject: "⛔ Tu donación quedó en pausa (tenemos 1 paso rápido)",
      preheader: "Hubo un inconveniente con tu medio de pago. Revísalo por favor.",
      tag: "Donación",
      ...data,
    },
  });

export const sendExternalGrantEmail = (to: string, data: Data = {}) =>
  safeSend({
    label: "externalGrant",
    to,
    templateKey: "externalGrant",
    data: {
      subject: "🎁 Te regalaron acceso a 21 Retos… descúbrelo",
      preheader: "Habilitamos tu cuenta para que avances en los 21 días de crecimiento.",
      tag: "Acceso",
      ...data,
    },
  });

export const sendLicenseRevokedEmail = (to: string, data: Data) =>
  safeSend({
    label: "licenseRevoked",
    to,
    templateKey: "licenseRevoked",
    data: {
      subject: "🔄 Ajustamos tus accesos: esto es lo nuevo",
      preheader: "Un miembro del equipo ajustó uno de tus permisos.",
      tag: "Acceso",
      ...data,
    },
  });

export const sendAgendaReactivatedEmail = (to: string, data: Data) =>
  safeSend({
    label: "agendaReactivated",
    to,
    templateKey: "agendaReactivated",
    data: {
      subject: "📔 Tu Agenda revive hoy con una sorpresa",
      preheader: "Ya puedes ingresar nuevamente y llevar tu devocional día a día.",
      tag: "Agenda",
      ...data,
    },
  });

export const sendPlanStartEmail = (to: string, data: Data) =>
  safeSend({
    label: "planStart",
    to,
    templateKey: "planStart",
    data: {
      subject: "⏰ Cuenta regresiva para tu plan de 21 Retos",
      preheader: "Marca la fecha y prepárate para vivir el proceso día a día.",
      tag: "Plan",
      ...data,
    },
  });

export const sendCompletionCertificateEmail = (to: string, data: Data) =>
  safeSend({
    label: "completionCertificate",
    to,
    templateKey: "completionCertificate",
    data: {
      subject: "🏆 Tu certificado está listo: mira tu logro final",
      preheader: "Celebremos juntos lo que Dios empezó en tu vida.",
      tag: "Celebración",
      ...data,
    },
  });

export const sendAssessmentSummaryEmail = (to: string, data: Data) =>
  safeSend({
    label: "assessmentSummary",
    to,
    templateKey: "assessmentSummary",
    data: {
      subject: "📊 Así va tu progreso: revelamos tus métricas clave",
      preheader: "Mira cómo vas creciendo en cada área de tu vida.",
      tag: "Evaluación",
      ...data,
    },
  });

// Internal alerts
export const sendGrantFailureAlert = async (data: Data) => {
  const to = getDefaultSupportEmail();
  if (!to) {
    console.warn("[email] grantFailureAlert skipped: SENDGRID_ALERT_TO not configured");
    return false;
  }
  return safeSend({
    label: "grantFailureAlert",
    to,
    templateKey: "grantFailureAlert",
    data: {
      subject: "🚨 Grant Agenda falló: acción inmediata requerida",
      preheader: "Revisemos el outbox de grant. Un usuario espera su activación.",
      tag: "ALERTA",
      ...data,
    },
  });
};
