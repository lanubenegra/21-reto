export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const SUCCESS_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/gracias`
  : "http://localhost:3000/gracias";
const CANCEL_URL = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/pago`
  : "http://localhost:3000/pago";

type CreateCheckoutPayload = {
  sku: "retos" | "agenda" | "combo";
  email?: string;
  priceId: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCheckoutPayload;
    const { sku, email, priceId } = body;

    if (!sku || !priceId) {
      return NextResponse.json({ error: "Missing sku or priceId" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SUCCESS_URL}?sku=${sku}&status=success`,
      cancel_url: `${CANCEL_URL}?status=cancel`,
      metadata: { sku },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stripe checkout] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
