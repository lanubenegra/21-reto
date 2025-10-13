export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";

type SKU = "retos" | "agenda" | "combo";

type CreateCheckoutPayload = {
  sku: SKU;
  email?: string;
  priceId: string;
  profile?: {
    name?: string;
    phone?: string;
    country?: string;
    city?: string;
  };
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

function resolveOrigin(req: Request) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  const url = new URL(req.url);
  return url.origin;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCheckoutPayload;
    const { sku, email, priceId, profile } = body;

    if (!sku || !priceId) {
      return NextResponse.json({ error: "Missing sku or priceId" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Missing donor email" }, { status: 400 });
    }

    const origin = resolveOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/gracias?sku=${sku}&status=success`,
      cancel_url: `${origin}/pago?status=cancel`,
      metadata: {
        sku,
        donor_name: profile?.name?.slice(0, 100) ?? "",
        donor_phone: profile?.phone?.slice(0, 60) ?? "",
        donor_country: profile?.country?.slice(0, 60) ?? "",
        donor_city: profile?.city?.slice(0, 60) ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[stripe checkout] error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
