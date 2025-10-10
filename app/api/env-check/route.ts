import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const kind = anon.startsWith("sb_") || anon.startsWith("sbp_")
    ? "publishable"
    : anon.startsWith("eyJ")
      ? "legacy-anon-jwt"
      : anon
          ? "unknown"
          : null;
  return NextResponse.json({
    hasUrl: Boolean(url),
    hasAnon: Boolean(anon),
    kind,
    anon_preview: anon ? `${anon.slice(0, 6)}...${anon.slice(-6)}` : null,
    urlHost: url.replace(/^https?:\/\//, "") || null,
  });
}
