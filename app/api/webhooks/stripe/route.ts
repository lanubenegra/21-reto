export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

if (!serviceKey) {
  throw new Error("Missing SUPABASE service role key for Stripe webhook");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey,
  { auth: { persistSession: false } }
);

const SHARED_SECRET = process.env.SHARED_SECRET!;
const AGENDA_GRANT_URL = process.env.AGENDA_GRANT_URL || "";

async function grantAgenda(email: string) {
  if (!AGENDA_GRANT_URL) return;
  const token = jwt.sign({ email, product: "agenda" }, SHARED_SECRET, {
    expiresIn: "5m",
    issuer: "retos",
    audience: "grant",
  });
  await fetch(AGENDA_GRANT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature") as string;
    const buffer = Buffer.from(await req.arrayBuffer());

    const event = stripe.webhooks.constructEvent(
      buffer,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        (session.customer as string) ||
        "";

      if (!email) {
        console.error("[stripe webhook] missing email in session", session.id);
      }

      const sku = (session.metadata?.sku as "retos" | "agenda" | "combo") || "retos";

      const { error: orderError } = await supabase.from("orders").insert({
        user_id: null,
        email,
        sku,
        provider: "stripe",
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        status: "paid",
        raw: session as Stripe.Checkout.Session,
      });
      if (orderError) {
        console.error("[stripe webhook] orders insert error", orderError.message);
      }

      if (sku === "retos" || sku === "combo") {
        const { error: retoError } = await supabase
          .from("entitlements")
          .upsert({ email, product: "retos", active: true }, { onConflict: "email,product" });
        if (retoError) {
          console.error("[stripe webhook] entitlements retos error", retoError.message);
        }
      }
      if (sku === "agenda" || sku === "combo") {
        const { error: agendaError } = await supabase
          .from("entitlements")
          .upsert({ email, product: "agenda", active: true }, { onConflict: "email,product" });
        if (agendaError) {
          console.error("[stripe webhook] entitlements agenda error", agendaError.message);
        }
        await grantAgenda(email);
      }

      console.log("[stripe webhook] checkout.session.completed", { email, sku });
    }

    if (event.type === "payment_intent.succeeded") {
      console.log("[stripe webhook] payment_intent.succeeded");
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook] error", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }
}

export async function GET() {
  return new Response("Stripe webhook endpoint OK", { status: 200 });
}
