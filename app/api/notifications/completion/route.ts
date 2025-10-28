import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import authOptions from "@/auth.config";
import { normalizeEmail } from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendCompletionCertificateEmail } from "@/lib/email/notifications";

export const runtime = "nodejs";

const schema = z.object({
  completedAt: z.string().optional(),
  scores: z.record(z.number()).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json().catch(() => ({})));

  const email = normalizeEmail(session.user.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .maybeSingle();

  const context = defaultEmailContext(req);

  await sendCompletionCertificateEmail(email, {
    email,
    name: profile?.display_name ?? session.user.email,
    completedAt: body.completedAt ?? new Date().toISOString(),
    scores: body.scores ?? {},
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  return NextResponse.json({ ok: true });
}
