import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    urlHost: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ?? null,
  });
}
