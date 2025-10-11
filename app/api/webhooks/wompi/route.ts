import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  await supabaseAdmin.from("orders").insert({ email, sku, provider: "wompi", status: "paid", raw: evt });

  const products = sku === "combo" ? ["agenda", "retos"] : [sku];
  await supabaseAdmin
    .from("entitlements")
    .upsert(
      products.map((product) => ({ email, product, active: true })),
      { onConflict: "email,product" }
    );
  return NextResponse.json({ ok: true });
}
