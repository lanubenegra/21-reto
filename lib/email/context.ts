export type EmailContext = ReturnType<typeof defaultEmailContext>;

export function resolveSiteUrl(req?: Request) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (req) {
    try {
      const url = new URL(req.url);
      return url.origin.replace(/\/$/, "");
    } catch {
      // ignore parsing error
    }
  }
  return "http://localhost:3000";
}

export function resolveAgendaUrl() {
  return (
    process.env.NEXT_PUBLIC_AGENDA_APP_URL ??
    "https://agenda-devocional.example.com"
  );
}

export function resolveSupportEmail() {
  return (
    process.env.SUPPORT_EMAIL ??
    process.env.SENDGRID_ALERT_TO ??
    process.env.SENDGRID_FROM ??
    ""
  );
}

export function resolveLogoUrls(siteUrl: string) {
  const light =
    process.env.SENDGRID_LOGO_LIGHT_URL ??
    process.env.SENDGRID_LOGO_ORIGINAL_URL ??
    process.env.SENDGRID_LOGO_URL ??
    `${siteUrl}/assets/logo-mana-original.png`;

  const dark =
    process.env.SENDGRID_LOGO_DARK_URL ??
    process.env.SENDGRID_LOGO_URL ??
    `${siteUrl}/assets/logo-mana-blanco.png`;

  return { light, dark };
}

export function resolveIntroFontUrls() {
  return {
    regular: process.env.INTRO_REGULAR_URL ?? process.env.SENDGRID_INTRO_WOFF2_URL ?? null,
    bold: process.env.INTRO_BOLD_URL ?? null,
    black: process.env.INTRO_BLACK_URL ?? null,
  };
}

export function resolveNotificationsUrl(siteUrl: string) {
  return (
    process.env.SENDGRID_NOTIFICATIONS_URL ??
    `${siteUrl}/notificaciones`
  );
}

export function resolvePrivacyUrl(siteUrl: string) {
  return process.env.SENDGRID_PRIVACY_URL ?? `${siteUrl}/privacidad`;
}

export function defaultEmailContext(req?: Request) {
  const siteUrl = resolveSiteUrl(req);
  const introFonts = resolveIntroFontUrls();
  return {
    siteUrl,
    loginUrl: `${siteUrl}/auth/signin`,
    resetUrlBase: `${siteUrl}/auth/signin?mode=forgot`,
    agendaUrl: resolveAgendaUrl(),
    supportEmail: resolveSupportEmail(),
    logos: resolveLogoUrls(siteUrl),
    introFonts,
    notificationsUrl: resolveNotificationsUrl(siteUrl),
    privacyUrl: resolvePrivacyUrl(siteUrl),
    year: new Date().getFullYear(),
  };
}

export function templateBase(context: EmailContext) {
  return {
    siteUrl: context.siteUrl,
    loginUrl: context.loginUrl,
    supportEmail: context.supportEmail,
    year: context.year,
    logo_url: context.logos.dark,
    logo_url_light: context.logos.light,
    logo_url_dark: context.logos.dark,
    notifications_url: context.notificationsUrl,
    privacy_url: context.privacyUrl,
    intro_regular_woff2_url: context.introFonts.regular ?? undefined,
  intro_bold_woff2_url: context.introFonts.bold ?? undefined,
  intro_black_woff2_url: context.introFonts.black ?? undefined,
};
}
