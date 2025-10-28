const templateIds = {
  welcomeRetos: process.env.SENDGRID_TEMPLATE_WELCOME_RETOS,
  agendaActivation: process.env.SENDGRID_TEMPLATE_AGENDA_ACTIVATION,
  resetPassword: process.env.SENDGRID_TEMPLATE_RESET_PASSWORD,
  verifyEmail: process.env.SENDGRID_TEMPLATE_VERIFY_EMAIL,
  signupWelcome: process.env.SENDGRID_TEMPLATE_SIGNUP_WELCOME,
  passwordChanged: process.env.SENDGRID_TEMPLATE_PASSWORD_CHANGED,
  passwordResetSuccess: process.env.SENDGRID_TEMPLATE_RESET_SUCCESS,
  supportPasswordReset: process.env.SENDGRID_TEMPLATE_SUPPORT_PASSWORD_RESET,
  profileUpdatedBySupport: process.env.SENDGRID_TEMPLATE_PROFILE_UPDATED_BY_SUPPORT,
  roleChanged: process.env.SENDGRID_TEMPLATE_ROLE_CHANGED,
  paymentReceipt: process.env.SENDGRID_TEMPLATE_PAYMENT_RECEIPT,
  paymentFailed: process.env.SENDGRID_TEMPLATE_PAYMENT_FAILED,
  externalGrant: process.env.SENDGRID_TEMPLATE_EXTERNAL_GRANT,
  licenseRevoked: process.env.SENDGRID_TEMPLATE_LICENSE_REVOKED,
  agendaReactivated: process.env.SENDGRID_TEMPLATE_AGENDA_REACTIVATED,
  grantFailureAlert: process.env.SENDGRID_TEMPLATE_GRANT_FAILURE_ALERT,
  planStart: process.env.SENDGRID_TEMPLATE_PLAN_START,
  completionCertificate: process.env.SENDGRID_TEMPLATE_COMPLETION_CERTIFICATE,
  assessmentSummary: process.env.SENDGRID_TEMPLATE_ASSESSMENT_SUMMARY,
} as const;

export type TemplateKey = keyof typeof templateIds;

export function requireTemplateId(key: TemplateKey): string {
  const value = templateIds[key];
  if (!value) {
    throw new Error(`[sendgrid] Missing template ID for "${key}"`);
  }
  return value;
}

export function hasTemplateId(key: TemplateKey): boolean {
  return Boolean(templateIds[key]);
}
