import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { enqueueAgendaGrant } from "@/lib/grant-agenda";
import { defaultEmailContext } from "@/lib/email/context";
import {
  sendAgendaActivationEmail,
  sendWelcomeRetosEmail,
} from "@/lib/email/notifications";

const schema = z.object({
  email: z.string().email(),
  product: z.enum(["retos", "agenda", "combo"]),
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

  const upserts = [];
  if (product === "retos" || product === "combo") {
    upserts.push({ email: normalizedEmail, product: "retos", active: true });
  }
  if (product === "agenda" || product === "combo") {
    upserts.push({ email: normalizedEmail, product: "agenda", active: true });
  }

  let retosGranted = false;
  let agendaGranted = false;
  if (upserts.length) {
    const { error } = await supabaseAdmin.from("entitlements").upsert(upserts, {
      onConflict: "email,product",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    retosGranted = upserts.some((entry) => entry.product === "retos");
    agendaGranted = upserts.some((entry) => entry.product === "agenda");
  }

  if (product === "agenda" || product === "combo") {
    await enqueueAgendaGrant(supabaseAdmin, normalizedEmail);
  }

  const context = defaultEmailContext(req);
  const emailPayload = {
    email: normalizedEmail,
    product,
    source: "admin.grant",
    actorId,
    supportEmail: context.supportEmail,
  };

  if (retosGranted) {
    await sendWelcomeRetosEmail(normalizedEmail, emailPayload);
  }
  if (agendaGranted) {
    await sendAgendaActivationEmail(normalizedEmail, emailPayload);
  }

  await logAdminAction(
    actorId,
    "admin.grant",
    { product },
    { email: normalizedEmail },
    req,
  );

  return NextResponse.json({ ok: true });
}
