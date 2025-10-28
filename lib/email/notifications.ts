import { sendEmail, type SendEmailResult } from "./sendgrid";
import { requireTemplateId, hasTemplateId } from "./templates";
import { defaultEmailContext, templateBase } from "./context";

type Data = Record<string, unknown>;

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
    if (!lines.includes(value)) {
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
  const tag = typeof merged.tag === "string" ? merged.tag : undefined;

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
      subject: "¡Bienvenido a 21 Retos!",
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
      subject: "Tu Agenda Devocional ya está lista",
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
      subject: "Recupera tu acceso a Devocional Maná",
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
      subject: "Bienvenido a Devocional Maná",
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
      subject: "Confirma tu correo",
      preheader: "Activa tu cuenta y protege tu acceso.",
      tag: "Verificación",
      ...data,
    },
  });

export const sendPasswordChangedEmail = (to: string, data: Data) =>
  safeSend({
    label: "passwordChanged",
    to,
    templateKey: "passwordChanged",
    data: {
      subject: "Tu contraseña fue actualizada",
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
      subject: "Confirmamos tu nueva contraseña",
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
      subject: "Soporte actualizó tu acceso",
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
      subject: "Actualizamos tu perfil",
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
      subject: "Tu rol dentro de Devocional Maná cambió",
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
      subject: "Recibo de tu donación",
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
      subject: "Necesitamos actualizar tu donación",
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
      subject: "Tienes acceso a 21 Retos",
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
      subject: "Actualizamos tus accesos",
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
      subject: "Restablecimos tu acceso a la Agenda",
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
      subject: "Tu plan de 21 Retos está por iniciar",
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
      subject: "¡Completaste los 21 Retos!",
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
      subject: "Resumen de tu evaluación",
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
      subject: "[Alerta] Falla otorgando Agenda",
      preheader: "Revisemos el outbox de grant. Un usuario espera su activación.",
      tag: "ALERTA",
      ...data,
    },
  });
};
