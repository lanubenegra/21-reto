import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendResetPasswordEmail } from "@/lib/email/notifications";
import { getAuthUserWithProfileByEmail, createResetToken } from "@/lib/server/user-store";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ message: "Debes indicar un correo válido." }, { status: 400 });
  }

  const email = normalizeEmail(body.data.email);
  if (!email) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const context = defaultEmailContext(request);

  const existing = await getAuthUserWithProfileByEmail(email);
  const user = existing?.auth ?? null;
  const profile = existing?.profile ?? null;
  if (!user) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const tokenData = await createResetToken(email);
  if (!tokenData) {
    console.error("[auth.reset-request] token creation failed", { email });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const base = context.resetUrlBase ?? `${context.siteUrl}/auth/signin?mode=forgot`;
  const separator = base.includes("?") ? "&" : "?";
  const resetUrl = `${base}${separator}token=${tokenData.token}&email=${encodeURIComponent(email)}`;

  const delivered = await sendResetPasswordEmail(email, {
    email,
    name: profile?.display_name ?? user.user_metadata?.name ?? undefined,
    resetUrl,
    expiresAt: new Date(tokenData.expiresAt).toISOString(),
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[auth.reset-request] send failed", { email, status: delivered.status, error: delivered.error });
    return NextResponse.json({ message: "No pudimos enviar las instrucciones. Intenta más tarde." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
