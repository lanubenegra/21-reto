import { NextResponse } from "next/server";
import { z } from "zod";

import { defaultEmailContext } from "@/lib/email/context";
import { normalizeEmail } from "@/lib/email";
import { sendResetPasswordEmail } from "@/lib/email/notifications";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUserWithProfileByEmail } from "@/lib/server/user-store";

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

  const existing = await getAuthUserWithProfileByEmail(email);
  const user = existing?.auth ?? null;
  const profile = existing?.profile ?? null;
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink(
    {
      type: "recovery",
      email,
      options: {
        redirectTo: `${context.siteUrl}/auth/signin`,
      },
    } as Parameters<typeof supabaseAdmin.auth.admin.generateLink>[0],
  );

  const actionLink =
    linkData?.properties?.action_link ??
    (typeof (linkData as { action_link?: string }).action_link === "string"
      ? (linkData as { action_link?: string }).action_link
      : null);

  if (linkError || !actionLink) {
    console.error("[me.password.reset-request] generate link failed", { email, error: linkError?.message });
    return NextResponse.json({ ok: true });
  }

  const delivered = await sendResetPasswordEmail(email, {
    email,
    name: profile?.display_name ?? user.user_metadata?.name ?? undefined,
    resetUrl: actionLink,
    supportEmail: context.supportEmail,
    siteUrl: context.siteUrl,
  });

  if (!delivered.ok) {
    console.error("[me.password.reset-request] send failed", { email, status: delivered.status, error: delivered.error });
    return NextResponse.json({ error: "delivery_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
