import { NextResponse } from "next/server";

export const runtime = "nodejs";

function refFromUrl(source?: string | null) {
  if (!source) return null;
  try {
    return new URL(source).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

function refFromKey(key?: string | null) {
  if (!key) return null;
  try {
    const [, payloadPart] = key.split(".");
    if (!payloadPart) return null;
    const decoded = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8")) as {
      iss?: string;
      issuing_authority?: string;
    };
    const issuer = decoded.iss ?? decoded.issuing_authority ?? null;
    if (!issuer) return null;
    return new URL(issuer).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.SHARED_SECRET ? `Bearer ${process.env.SHARED_SECRET}` : null;
  if (!authHeader || !expected || authHeader !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const urlRef = refFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? null);
  const anonRef = refFromKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null);
  const serviceRef = refFromKey(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null,
  );

  return NextResponse.json({
    ok: Boolean(urlRef && urlRef === anonRef && urlRef === serviceRef),
    urlRef,
    anonRef,
    serviceRef,
  });
}
