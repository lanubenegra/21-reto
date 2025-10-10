import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

function extractEmail(event: Stripe.Event): string | null {
  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    return session.customer_details?.email ?? session.customer_email ?? null;
  }
  if (event.type.startsWith("payment_intent.")) {
    const intent = event.data.object as Stripe.PaymentIntent;
    let email = intent.receipt_email ?? null;
    const latestCharge = intent.latest_charge;
    if (latestCharge && typeof latestCharge !== "string") {
      email = latestCharge.billing_details?.email ?? email;
    }
    const intentWithCharges = intent as unknown as {
      charges?: { data?: Array<{ billing_details?: { email?: string } }> };
    };
    if (!email && intentWithCharges.charges?.data?.length) {
      email = intentWithCharges.charges.data[0]?.billing_details?.email ?? null;
    }
    return email;
  }
  return null;
}

function extractSku(event: Stripe.Event): "agenda" | "retos" | "combo" {
  const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
  const metadataSku = obj?.metadata?.sku;
  if (metadataSku === "agenda" || metadataSku === "retos" || metadataSku === "combo") {
    return metadataSku;
  }
  const description = (obj as { description?: string }).description ?? "";
  if (/combo/i.test(description)) return "combo";
  if (/agenda/i.test(description)) return "agenda";
  return "retos";
}

export async function POST(req: Request) {
  const buffer = Buffer.from(await req.arrayBuffer());
  const signature = (req.headers as Headers).get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buffer, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  if (event.type.startsWith("checkout.session.") || event.type.startsWith("payment_intent.")) {
    const email = extractEmail(event);
    const sku = extractSku(event);
    const rawObject = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const amountCents =
      typeof (rawObject as Stripe.Checkout.Session).amount_total === "number"
        ? (rawObject as Stripe.Checkout.Session).amount_total
        : typeof (rawObject as Stripe.PaymentIntent).amount === "number"
          ? (rawObject as Stripe.PaymentIntent).amount
          : null;
    const currency = rawObject.currency ? String(rawObject.currency).toUpperCase() : null;

    const db = supabaseAdmin();
    await db.from("orders").insert({
      email,
      sku,
      provider: "stripe",
      amount: amountCents ? amountCents / 100 : null,
      currency,
      status: "paid",
      raw: rawObject,
    });

    const products = sku === "combo" ? ["agenda", "retos"] : [sku];
    for (const product of products) {
      await db.from("entitlements").upsert(
        { user_id: null, email, product, active: true },
        { onConflict: "user_id,product" }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
