import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import authOptions from "@/auth.config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const { data: credential } = await supabaseAdmin
    .from("user_credentials")
    .select("password_hash,password_version")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!credential?.password_hash) {
    return NextResponse.json({ error: "no_password" }, { status: 400 });
  }

  const matches = await bcrypt.compare(body.currentPassword, credential.password_hash);
  if (!matches) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(body.newPassword, 12);
  const version = (credential.password_version ?? 0) + 1;
  const { error } = await supabaseAdmin.from("user_credentials").upsert({
    user_id: session.user.id,
    password_hash: newHash,
    password_version: version,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
