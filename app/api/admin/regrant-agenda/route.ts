import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { enqueueAgendaGrant } from "@/lib/grant-agenda";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["support", "admin", "superadmin"]);

  const actorId = session.user?.id;
  if (!actorId) {
    throw new Response("unauthorized", { status: 401 });
  }

  const { email } = schema.parse(await req.json());
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  await enqueueAgendaGrant(supabaseAdmin, normalizedEmail);

  await logAdminAction(
    actorId,
    "admin.regrant_agenda",
    {},
    { email: normalizedEmail },
    req,
  );

  return NextResponse.json({ ok: true });
}
