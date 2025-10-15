import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  const debug = req.nextUrl.searchParams.get("debug") === "1";

  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email ? String(token.email).toLowerCase() : null;
    const userId = token?.sub ? String(token.sub) : null;

    if (!email && !userId) {
      const body = debug
        ? { error: "unauthorized", hint: "missing token/email", hasToken: Boolean(token), email, userId }
        : { error: "unauthorized" };
      return NextResponse.json(body, { status: 401, headers: { "cache-control": "no-store" } });
    }

    let query = supabase.from("entitlements").select("product,active").eq("active", true);
    if (email && userId) {
      query = query.or(`email.eq.${email},user_id.eq.${userId}`);
    } else if (email) {
      query = query.eq("email", email);
    } else if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[licenses] supabase error:", error);
      const body = debug ? { error: "db_error", detail: error.message } : { error: "db" };
      return NextResponse.json(body, { status: 500, headers: { "cache-control": "no-store" } });
    }

    const entitlements = data ?? [];
    const products = entitlements.map((row) => row.product);
    const hasRetos = products.includes("retos") || products.includes("combo");
    const hasAgenda = products.includes("agenda") || products.includes("combo");

    const payload: Record<string, unknown> = {
      email,
      userId,
      hasRetos,
      hasAgenda,
      products,
    };

    if (debug) {
      payload.debug = {
        entitlementsCount: entitlements.length,
        hasToken: Boolean(token),
      };
    }

    return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[licenses] fatal:", error);
    const body = debug ? { error: "fatal", detail: error instanceof Error ? error.message : String(error) } : { error: "fatal" };
    return NextResponse.json(body, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
