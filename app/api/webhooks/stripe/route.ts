import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const data: any = event.data.object;
    const email =
      data?.customer_details?.email ||
      data?.customer_email ||
      data?.charges?.data?.[0]?.billing_details?.email ||
      null;

    const sku = data?.metadata?.sku ?? "retos";
    const amount = data?.amount_total ? data.amount_total / 100 : null;
    const currency = data?.currency?.toUpperCase() ?? null;

    const db = supabaseAdmin();
    await db
      .from("orders")
      .insert({ email, sku, provider: "stripe", amount, currency, status: "paid", raw: data });

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
