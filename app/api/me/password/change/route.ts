import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import authOptions from "@/auth.config";
import { defaultEmailContext } from "@/lib/email/context";
import { sendPasswordChangedEmail } from "@/lib/email/notifications";
import { supabaseAnon } from "@/lib/supabase-anon";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "contraseña actual requerida"),
  newPassword: z
    .string()
    .min(10, "mínimo 10 caracteres")
    .max(128)
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "usa letras y números"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const body = parsed.data;
  const email = session.user.email.toLowerCase();

  const anon = supabaseAnon();
  const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password: body.currentPassword,
  });

  if (signInError || !signInData?.user) {
    return NextResponse.json({ error: "invalid_current_password" }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
    password: body.newPassword,
  });

  if (updateError) {
    console.error("[me.password.change] failed to update supabase user", {
      userId: session.user.id,
      error: updateError.message,
    });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const { data: credential } = await supabaseAdmin
    .from("user_credentials")
    .select("password_version")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const newHash = await bcrypt.hash(body.newPassword, 12);
  const version = (credential?.password_version ?? 0) + 1;

  await supabaseAdmin
    .from("user_credentials")
    .upsert({
      user_id: session.user.id,
      password_hash: newHash,
      password_version: version,
      updated_at: new Date().toISOString(),
    })
    .throwOnError();

  const context = defaultEmailContext(req);
  const notify = await sendPasswordChangedEmail(email, {
    email,
    changeDate: new Date().toISOString(),
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!notify.ok) {
    console.error("[me.password.change] passwordChanged email failed", {
      email,
      status: notify.status,
      error: notify.error,
    });
  }

  return NextResponse.json({ ok: true });
}
