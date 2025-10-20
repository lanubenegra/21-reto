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

  const payload = schema.parse(await req.json());
  const { userId, ...fields } = payload;

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(fields)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(
    session.user.id as string,
    "admin.update_profile",
    fields,
    { userId },
    req,
  );

  return NextResponse.json({ ok: true });
}
