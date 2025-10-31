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
  city: z.string().max(80).optional(),
  document_type: z.string().max(16).optional(),
  document_number: z.string().max(64).optional(),
  timezone: z.string().max(64).optional(),
  photo_url: z.string().url().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("display_name,country,whatsapp,city,document_type,document_number,timezone,photo_url")
    .eq("id", session.user.id)
    .maybeSingle();

  return NextResponse.json({ profile: data ?? {} });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const body = parsed.data;
  const updates = {
    id: session.user.id,
    display_name: body.display_name,
    country: body.country?.trim().toUpperCase() || null,
    whatsapp: body.whatsapp?.trim() || null,
    city: body.city?.trim() || null,
    document_type: body.document_type?.trim().toUpperCase() || null,
    document_number: body.document_number?.trim() || null,
    timezone: body.timezone?.trim() || null,
    photo_url: body.photo_url?.trim() || null,
  };

  const { error } = await supabaseAdmin.from("profiles").upsert(updates);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
