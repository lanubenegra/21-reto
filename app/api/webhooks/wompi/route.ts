import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function verifyWompiSignature(raw: string, signature: string) {
  const secret = process.env.WOMPI_EVENT_SECRET!;
  const hash = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return hash === signature;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = (req.headers as Headers).get("wompi-signature") || "";
  if (!verifyWompiSignature(raw, signature)) return new NextResponse("Invalid signature", { status: 401 });

  const evt = JSON.parse(raw);
  const email = evt?.data?.transaction?.customer_email ?? null;
  const ref = evt?.data?.transaction?.reference ?? "";
  const sku = /combo/i.test(ref) ? "combo" : /agenda/i.test(ref) ? "agenda" : "retos";

  const db = supabaseAdmin();
  await db.from("orders").insert({ email, sku, provider: "wompi", status: "paid", raw: evt });

  const products = sku === "combo" ? ["agenda", "retos"] : [sku];
  for (const product of products) {
    await db.from("entitlements").upsert(
      { user_id: null, email, product, active: true },
      { onConflict: "user_id,product" }
    );
  }
  return NextResponse.json({ ok: true });
}
