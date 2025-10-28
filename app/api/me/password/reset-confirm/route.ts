import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendPasswordResetSuccessEmail } from "@/lib/email/notifications";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");

  const now = new Date().toISOString();
  const { data: reset, error } = await supabaseAdmin
    .from("password_resets")
    .select("id,user_id")
    .eq("token_hash", tokenHash)
    .eq("used", false)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!reset) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const { data: credential } = await supabaseAdmin
    .from("user_credentials")
    .select("password_version")
    .eq("user_id", reset.user_id)
    .maybeSingle();

  const newHash = await bcrypt.hash(body.newPassword, 12);
  const version = (credential?.password_version ?? 0) + 1;
  const { error: upsertError } = await supabaseAdmin.from("user_credentials").upsert({
    user_id: reset.user_id,
    password_hash: newHash,
    password_version: version,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  await supabaseAdmin.from("password_resets").update({ used: true }).eq("id", reset.id);

  const { data: profileRow } = await supabaseAdmin
    .from("profiles")
    .select("email, display_name")
    .eq("id", reset.user_id)
    .maybeSingle();

  const email = profileRow?.email ?? null;
  if (email) {
    const context = defaultEmailContext(req);
    const notify = await sendPasswordResetSuccessEmail(email, {
      email,
      name: profileRow?.display_name ?? undefined,
      changeDate: new Date().toISOString(),
      loginUrl: context.loginUrl,
      supportEmail: context.supportEmail,
    });

    if (!notify.ok) {
      console.error("[me.password.reset-confirm] passwordResetSuccess email failed", {
        email,
        status: notify.status,
        error: notify.error,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
