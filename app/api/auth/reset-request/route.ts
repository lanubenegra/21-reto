import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendResetPasswordEmail } from "@/lib/email/notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  const { data: listed, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email });
  if (listError) {
    console.error("[auth.reset-request] list users failed", { email, error: listError.message });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const user = listed?.users?.[0];
  if (!user) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${context.siteUrl}/auth/signin`,
    },
  });

  if (linkError || !linkData?.action_link) {
    console.error("[auth.reset-request] generate link failed", { email, error: linkError?.message });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const delivered = await sendResetPasswordEmail(email, {
    email,
    name: user.user_metadata?.name ?? undefined,
    resetUrl: linkData.action_link,
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[auth.reset-request] send failed", { email, status: delivered.status, error: delivered.error });
    return NextResponse.json({ message: "No pudimos enviar las instrucciones. Intenta más tarde." }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
