import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";

import { normalizeEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const email = normalizeEmail(body.email);

  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ email });
  if (error) {
    console.error("[password reset] listUsers failed", error.message);
  }
  const user = usersData?.users?.[0] ?? null;

  if (!user) {
    // Do not leak info
    return NextResponse.json({ ok: true });
  }

  await supabaseAdmin
    .from("password_resets")
    .update({ used: true })
    .eq("user_id", user.id);

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

  const { error: insertError } = await supabaseAdmin.from("password_resets").insert({
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // TODO: send email with token
  return NextResponse.json({ ok: true, token });
}
