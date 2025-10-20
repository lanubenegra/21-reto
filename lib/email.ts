export function normalizeEmail(email: string | null | undefined) {
  if (!email) return "";
  return email.trim().toLowerCase();
}

