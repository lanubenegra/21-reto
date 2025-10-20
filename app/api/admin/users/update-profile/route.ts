import { NextResponse } from "next/server";
import { z } from "zod";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { logAdminAction } from "@/lib/admin-log";
import { supabaseAdmin } from "@/lib/supabase-admin";

const schema = z.object({
  userId: z.string().uuid(),
  display_name: z.union([z.string().min(2).max(80), z.null()]).optional(),
  country: z.union([z.string().max(2), z.null()]).optional(),
  whatsapp: z.union([z.string().max(32), z.null()]).optional(),
  timezone: z.union([z.string().max(64), z.null()]).optional(),
  photo_url: z.union([z.string().url(), z.null()]).optional(),
});

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["admin", "superadmin"]);

  const actorId = session.user?.id;
  if (!actorId) {
    throw new Response("unauthorized", { status: 401 });
  }

  const payload = schema.parse(await req.json());
  const { userId, ...fields } = payload;

  const updates: Record<string, string | null> = {};
  (Object.keys(fields) as Array<keyof typeof fields>).forEach((key) => {
    const value = fields[key];
    if (value !== undefined) {
      updates[key] = value;
    }
  });

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId,
        ...updates,
      },
      { onConflict: "id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    actorId,
    "admin.update_profile",
    updates,
    { userId },
    req,
  );

  return NextResponse.json({ ok: true });
}
