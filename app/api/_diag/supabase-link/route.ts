import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const type = url.searchParams.get("type") ?? "recovery";

  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  if (!["recovery", "signup"].includes(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/auth/signin`;

  const { data, error } =
    type === "signup"
      ? await supabaseAdmin.auth.admin.generateLink({
          type: "signup",
          email,
          password: undefined,
          options: { redirectTo },
        })
      : await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        summary: {
          redirectTo,
          email,
          type,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data,
    summary: {
      redirectTo,
      email,
      type,
    },
  });
}
