import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["superadmin"]);

  const { userId, newPassword } = schema.parse(await req.json());

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
    session.user.id as string,
    "admin.set_password",
    {},
    { userId },
    req,
  );

  return NextResponse.json({ ok: true });
}
