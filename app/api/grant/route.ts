import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const auth = (req.headers as Headers).get("authorization") || "";
  const token = auth.replace("Bearer ", "");

  try {
    const { email, sku } = jwt.verify(token, process.env.SHARED_SECRET!) as {
      email: string;
      sku: "agenda" | "retos" | "combo";
    };
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
