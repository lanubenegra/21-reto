import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendLicenseRevokedEmail } from "@/lib/email/notifications";

const schema = z.object({
  email: z.string().email(),
  product: z.enum(["retos", "agenda"]),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["admin", "superadmin"]);

  const actorId = session.user?.id;
  if (!actorId) {
    throw new Response("unauthorized", { status: 401 });
  }

  const { email, product } = schema.parse(await req.json());
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("entitlements")
    .update({ active: false })
    .eq("email", normalizedEmail)
    .eq("product", product);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    actorId,
    "admin.revoke",
    { product },
    { email: normalizedEmail },
    req,
  );

  const context = defaultEmailContext(req);
  await sendLicenseRevokedEmail(normalizedEmail, {
    email: normalizedEmail,
    product,
    actorId,
    supportEmail: context.supportEmail,
  });

  return NextResponse.json({ ok: true });
}
