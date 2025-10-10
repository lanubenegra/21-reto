import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type StripePayload = Stripe.Checkout.Session | Stripe.PaymentIntent;

const isCheckoutSession = (value: StripePayload): value is Stripe.Checkout.Session =>
  value.object === "checkout.session";

const isPaymentIntent = (value: StripePayload): value is Stripe.PaymentIntent =>
  value.object === "payment_intent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  const sig = (req.headers as Headers).get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Webhook signature verification failed.";
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const payload = event.data.object as StripePayload;

    let email: string | null = null;
    if (isCheckoutSession(payload)) {
      email = payload.customer_details?.email ?? payload.customer_email ?? null;
    } else if (isPaymentIntent(payload)) {
      const latestCharge = payload.latest_charge;
      let chargeEmail: string | null = null;
      if (latestCharge && typeof latestCharge !== "string") {
        chargeEmail = latestCharge.billing_details?.email ?? null;
      } else if (payload.charges?.data?.length) {
        chargeEmail = payload.charges.data[0]?.billing_details?.email ?? null;
      }
      email = payload.receipt_email ?? chargeEmail;
    }

    const metadataSku = payload.metadata?.sku;
    const sku = typeof metadataSku === "string" && metadataSku.length > 0 ? metadataSku : "retos";

    const amountRaw = isCheckoutSession(payload) ? payload.amount_total : payload.amount_received;
    const amount = typeof amountRaw === "number" ? amountRaw / 100 : null;
    const currency = payload.currency ? payload.currency.toUpperCase() : null;

    const db = supabaseAdmin();
    await db
      .from("orders")
      .insert({ email, sku, provider: "stripe", amount, currency, status: "paid", raw: payload });

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
