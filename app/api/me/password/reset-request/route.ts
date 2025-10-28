import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendResetPasswordEmail } from "@/lib/email/notifications";
import { createResetToken, getAuthUserWithProfileByEmail } from "@/lib/server/user-store";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);

  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const context = defaultEmailContext(req);

  const existing = await getAuthUserWithProfileByEmail(email);
  const user = existing?.auth ?? null;
  const profile = existing?.profile ?? null;
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const tokenData = await createResetToken(email);
  if (!tokenData) {
    return NextResponse.json({ ok: true });
  }

  const resetUrl = `${context.resetUrlBase}&token=${tokenData.token}`;

  const delivered = await sendResetPasswordEmail(email, {
    email,
    name: profile?.display_name ?? user.user_metadata?.name ?? undefined,
    resetUrl,
    expiresAt: new Date(tokenData.expiresAt).toISOString(),
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[me.password.reset-request] send failed", { email, status: delivered.status, error: delivered.error });
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
