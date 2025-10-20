import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { enqueueAgendaGrant } from "@/lib/grant-agenda";

const schema = z.object({
  email: z.string().email(),
  product: z.enum(["retos", "agenda", "combo"]),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["admin", "superadmin"]);

  const { email, product } = schema.parse(await req.json());
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const upserts = [];
  if (product === "retos" || product === "combo") {
    upserts.push({ email: normalizedEmail, product: "retos", active: true });
  }
  if (product === "agenda" || product === "combo") {
    upserts.push({ email: normalizedEmail, product: "agenda", active: true });
  }

  if (upserts.length) {
    const { error } = await supabaseAdmin.from("entitlements").upsert(upserts, {
      onConflict: "email,product",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (product === "agenda" || product === "combo") {
    await enqueueAgendaGrant(supabaseAdmin, normalizedEmail);
  }

  await logAdminAction(
    session.user.id as string,
    "admin.grant",
    { product },
    { email: normalizedEmail },
    req,
  );

  return NextResponse.json({ ok: true });
}
