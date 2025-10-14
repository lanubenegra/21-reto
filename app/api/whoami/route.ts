import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  return NextResponse.json(
    {
      hasToken: Boolean(token),
      email: token?.email ?? null,
      name: token?.name ?? null,
      sub: token?.sub ?? null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
