import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import authOptions from "@/auth.config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const schema = z.object({
  display_name: z.string().min(2).max(80),
  country: z.string().max(2).optional(),
  whatsapp: z.string().max(32).optional(),
  timezone: z.string().max(64).optional(),
  photo_url: z.string().url().optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: session.user.id, ...body });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
