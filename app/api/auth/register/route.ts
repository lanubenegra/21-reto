import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendVerifyEmail } from "@/lib/email/notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  const payload = schema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ message: "Datos incompletos o inválidos." }, { status: 400 });
  }

  const body = payload.data;
  const displayName = body.name.trim();
  if (displayName.length < 2) {
    return NextResponse.json({ message: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ message: "Correo inválido." }, { status: 400 });
  }

  const context = defaultEmailContext(request);

  const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    per_page: 1,
    email,
  });
  const existingUser = existingList?.users?.[0] ?? null;

  if (existingUser) {
    if (!existingUser.email_confirmed_at) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        options: { redirectTo: `${context.siteUrl}/auth/signin?verified=1` },
      });

      if (linkError || !linkData?.action_link) {
        console.error("[auth.register] failed to generate verification link for existing user", {
          email,
          error: linkError?.message,
        });
        return NextResponse.json(
          { message: "No pudimos reenviar el correo de verificación. Intenta más tarde." },
          { status: 500 }
        );
      }

      const delivered = await sendVerifyEmail(email, {
        email,
        name: displayName,
        verificationUrl: linkData.action_link,
        loginUrl: context.loginUrl,
        supportEmail: context.supportEmail,
        siteUrl: context.siteUrl,
      });

      if (!delivered.ok) {
        console.error("[auth.register] resend verification failed", { email, status: delivered.status });
        return NextResponse.json(
          { message: "No pudimos reenviar el correo de verificación. Intenta más tarde." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          verificationSent: true,
          message: "Ya tenías una cuenta. Reenviamos el correo para confirmar tu correo electrónico.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json({ message: "Ya existe una cuenta con este correo." }, { status: 409 });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: false,
    user_metadata: { name: body.name },
  });

  if (createError || !created?.user?.id) {
    console.error("[auth.register] failed to create supabase user", { email, error: createError?.message });
    return NextResponse.json(
      { message: "No pudimos crear la cuenta. Intenta más tarde." },
      { status: 500 }
    );
  }

  const userId = created.user.id;
  await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      email,
      display_name: displayName,
      role: "user",
    })
    .throwOnError();

  const passwordHash = await bcrypt.hash(body.password, 12);
  await supabaseAdmin
    .from("user_credentials")
    .upsert({
      user_id: userId,
      password_hash: passwordHash,
      password_version: 1,
      updated_at: new Date().toISOString(),
    })
    .throwOnError();

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    options: { redirectTo: `${context.siteUrl}/auth/signin?verified=1` },
  });

  if (linkError || !linkData?.action_link) {
    console.error("[auth.register] failed to generate verification link", { email, error: linkError?.message });
    return NextResponse.json(
      { message: "No pudimos generar el enlace de verificación. Intenta más tarde." },
      { status: 500 }
    );
  }

  const delivered = await sendVerifyEmail(email, {
    email,
    name: displayName,
    verificationUrl: linkData.action_link,
    loginUrl: context.loginUrl,
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[auth.register] verify email not sent", { email, status: delivered.status, error: delivered.ok ? undefined : delivered.error });
    return NextResponse.json(
      { message: "No pudimos enviar el correo de verificación. Intenta más tarde." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      verificationSent: true,
      message: "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja antes de iniciar sesión.",
    },
    { status: 201 }
  );
}
