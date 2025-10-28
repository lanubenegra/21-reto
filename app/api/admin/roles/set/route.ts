import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { defaultEmailContext } from "@/lib/email/context";
import { sendRoleChangedEmail } from "@/lib/email/notifications";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["user", "support", "admin", "superadmin"]),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["superadmin"]);

  const actorId = session.user?.id;
  if (!actorId) {
    throw new Response("unauthorized", { status: 401 });
  }

  const { userId, role } = schema.parse(await req.json());

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();
  const timestamp = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    role,
    role_granted_by: actorId,
    role_granted_at: timestamp,
  };

  let { error } = await supabaseAdmin.from("profiles").update(updatePayload).eq("id", userId);

  if (error?.message?.includes("role_granted")) {
    ({ error } = await supabaseAdmin.from("profiles").update({ role }).eq("id", userId));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    actorId,
    "admin.set_role",
    { role },
    { userId },
    req,
  );

  const email = profile?.email;
  if (email) {
    const context = defaultEmailContext(req);
    await sendRoleChangedEmail(email, {
      email,
      name: profile?.display_name ?? undefined,
      role,
      supportEmail: context.supportEmail,
      actorId,
    });
  }

  return NextResponse.json({ ok: true });
}
