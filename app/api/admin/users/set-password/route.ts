import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendSupportPasswordResetEmail } from "@/lib/email/notifications";

const schema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["superadmin"]);

  const actorId = session.user?.id;
  if (!actorId) {
    throw new Response("unauthorized", { status: 401 });
  }

  const { userId, newPassword } = schema.parse(await req.json());

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: credential } = await supabaseAdmin
    .from("user_credentials")
    .select("password_version")
    .eq("user_id", userId)
    .maybeSingle();

  const newHash = await bcrypt.hash(newPassword, 12);
  const version = (credential?.password_version ?? 0) + 1;

  const { error } = await supabaseAdmin.from("user_credentials").upsert({
    user_id: userId,
    password_hash: newHash,
    password_version: version,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    actorId,
    "admin.set_password",
    {},
    { userId },
    req,
  );

  const email = profile?.email;
  if (email) {
    const context = defaultEmailContext(req);
    const notify = await sendSupportPasswordResetEmail(email, {
      email,
      name: profile?.display_name ?? undefined,
      changeDate: new Date().toISOString(),
      supportEmail: context.supportEmail,
      actorId,
    });

    if (!notify.ok) {
      console.error("[admin.users.set-password] supportPasswordReset email failed", {
        email,
        status: notify.status,
        error: notify.error,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
