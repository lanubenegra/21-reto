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

  const params =
    type === "signup"
      ? ({ type: "signup", email, options: { redirectTo } } as const)
      : ({ type: "recovery", email, options: { redirectTo } } as const);

  const { data, error } = await supabaseAdmin.auth.admin.generateLink(
    params as Parameters<typeof supabaseAdmin.auth.admin.generateLink>[0],
  );

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
