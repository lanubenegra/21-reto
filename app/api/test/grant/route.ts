import { NextResponse } from "next/server";

import { grantAgenda } from "@/lib/grant-agenda";
import { normalizeEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = normalizeEmail(url.searchParams.get("email"));

  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  try {
    await grantAgenda(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "unknown grant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

