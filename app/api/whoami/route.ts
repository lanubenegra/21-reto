import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import authOptions from "@/auth.config";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    ok: true,
    session: session
      ? {
          id: session.user?.id ?? null,
          email: session.user?.email ?? null,
          role: session.user?.role ?? null,
        }
      : null,
  });
}
