import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = (req.headers as Headers).get("authorization") || "";
  const token = auth.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.SHARED_SECRET!, {
      issuer: "agenda",
      audience: "grant",
    }) as { email: string; sku: "agenda" | "retos" | "combo" };
    const { email, sku } = payload;
    const products = sku === "combo" ? ["agenda", "retos"] : [sku];
    const db = supabaseAdmin();
    for (const product of products) {
      await db.from("entitlements").upsert(
        { user_id: null, email, product, active: true },
        { onConflict: "user_id,product" }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("grant error", error);
    return new NextResponse("Unauthorized", { status: 401 });
  }
}
