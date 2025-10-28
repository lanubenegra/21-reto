import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendResetPasswordEmail } from "@/lib/email/notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email });
  if (listError) {
    console.error("[me.password.reset-request] list users failed", { email, error: listError.message });
    return NextResponse.json({ ok: true });
  }

  const user = listed?.users?.[0];
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${context.siteUrl}/auth/signin`,
    },
  });

  if (linkError || !linkData?.action_link) {
    console.error("[me.password.reset-request] generate link failed", { email, error: linkError?.message });
    return NextResponse.json({ ok: true });
  }

  const delivered = await sendResetPasswordEmail(email, {
    email,
    name: user.user_metadata?.name ?? undefined,
    resetUrl: linkData.action_link,
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[me.password.reset-request] send failed", { email, status: delivered.status, error: delivered.error });
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
