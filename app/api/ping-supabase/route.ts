import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authHeaders() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const url = `${baseUrl}/rest/v1/prices?select=id&limit=1`;
    const response = await fetch(url, { headers: authHeaders() });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json({ ok: response.ok, status: response.status, body });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        haveUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        haveAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      },
      { status: 500 }
    );
  }
}
