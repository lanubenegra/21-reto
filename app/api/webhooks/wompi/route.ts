import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyWompiSignature(raw: string, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const sanitized = signature?.startsWith("sha256=") ? signature.slice(7) : signature;
  return expected === sanitized;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = req.headers as Headers;
  const secret = process.env.WOMPI_EVENT_SECRET!;
  const signatureHeader =
    headers.get("x-wompi-event-signature") ||
    headers.get("wompi-signature") ||
    headers.get("x-signature") ||
    "";

  const signatureCandidates = signatureHeader
    ? signatureHeader.split(',').map(part => part.trim())
    : [];

  const signatures = signatureCandidates
    .map(entry => (entry.startsWith('sha256=') ? entry.slice(7) : entry))
    .filter(entry => entry.length);

  const isValid = signatures.some(candidate => verifyWompiSignature(raw, candidate, secret));

  if (!isValid) {
    console.warn("[wompi webhook] bad signature", {
      candidate: signatureHeader,
      parsed: signatures,
      bodySample: raw.slice(0, 160),
    });
    return new NextResponse("Invalid signature", { status: 401 });
  }

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
