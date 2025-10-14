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
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const email = token?.email ? String(token.email).toLowerCase() : null;
    const userId = token?.sub ? String(token.sub) : null;

    if (!email && !userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "db" }, { status: 500 });
    }

    const products = (data ?? []).map((row) => row.product);
    const hasRetos = products.includes("retos") || products.includes("combo");
    const hasAgenda = products.includes("agenda") || products.includes("combo");

    return NextResponse.json(
      {
        email,
        userId,
        hasRetos,
        hasAgenda,
        products,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error("[licenses] fatal:", error);
    return NextResponse.json({ error: "fatal" }, { status: 500 });
  }
}
