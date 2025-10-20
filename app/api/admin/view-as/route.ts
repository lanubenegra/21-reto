import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { assertRole, requireSession } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/email";

const COOKIE = "admin_view_as";

export async function GET() {
  const session = await requireSession();
  assertRole(session, ["support", "admin", "superadmin"]);

  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value ?? null;
  return NextResponse.json({ email: value });
}

export async function POST(req: Request) {
  const session = await requireSession();
  assertRole(session, ["support", "admin", "superadmin"]);

  const res = NextResponse.json({ ok: true });
  const body = await req.json().catch(() => ({}));

  if (body?.clear) {
    res.cookies.set(COOKIE, "", {
      path: "/admin",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 0,
    });
    return res;
  }

  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  res.cookies.set(COOKIE, email, {
    path: "/admin",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60,
  });
  return res;
}
