export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/email";
import { defaultEmailContext } from "@/lib/email/context";
import {
  sendAgendaActivationEmail,
  sendPaymentFailedEmail,
  sendPaymentReceiptEmail,
  sendWelcomeRetosEmail,
} from "@/lib/email/notifications";
import { enqueueAgendaGrant } from "@/lib/grant-agenda";

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

export async function POST(req: Request) {
  const context = defaultEmailContext(req);
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

      const rawEmail =
        session.customer_details?.email ||
        session.customer_email ||
        (session.customer as string) ||
        "";

      const email = normalizeEmail(rawEmail);

      if (!rawEmail) {
        console.error("[stripe webhook] missing email in session", session.id);
      }

      const sku = (session.metadata?.sku as "retos" | "agenda" | "combo") || "retos";

      const { error: orderError } = await supabase.from("orders").insert({
        user_id: null,
        email: rawEmail || email,
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

      if (email && (sku === "retos" || sku === "combo")) {
        const { error: retoError } = await supabase
          .from("entitlements")
          .upsert({ email, product: "retos", active: true }, { onConflict: "email,product" });
        if (retoError) {
          console.error("[stripe webhook] entitlements retos error", retoError.message);
        } else {
          await sendWelcomeRetosEmail(email, {
            email,
            sku,
            source: "stripe",
            sessionId: session.id,
            supportEmail: context.supportEmail,
          });
        }
      }
      if (email && (sku === "agenda" || sku === "combo")) {
        let agendaActivated = false;
        const { error: agendaError } = await supabase
          .from("entitlements")
          .upsert({ email, product: "agenda", active: true }, { onConflict: "email,product" });
        if (agendaError) {
          console.error("[stripe webhook] entitlements agenda error", agendaError.message);
        } else {
          agendaActivated = true;
        }
        const granted = await enqueueAgendaGrant(supabase, email);
        if (!granted) {
          console.warn("[stripe webhook] agenda grant queued for retry", { email, session: session.id });
        }
        if (agendaActivated) {
          await sendAgendaActivationEmail(email, {
            email,
            sku,
            source: "stripe",
            sessionId: session.id,
            supportEmail: context.supportEmail,
          });
        }
      }

      if (email) {
        await sendPaymentReceiptEmail(email, {
          email,
          sku,
          provider: "stripe",
          sessionId: session.id,
          paymentIntent: session.payment_intent ?? null,
          amount: session.amount_total ? session.amount_total / 100 : null,
          amountCents: session.amount_total ?? null,
          currency: session.currency ?? null,
          supportEmail: context.supportEmail,
        });
      }

      console.log("[stripe webhook] checkout.session.completed", { email, sku });
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const chargesSource = paymentIntent as Stripe.PaymentIntent & {
        charges?: Stripe.ApiList<Stripe.Charge>;
      };
      const charge = chargesSource.charges?.data?.[0];
      const rawEmail =
        charge?.billing_details?.email ??
        (paymentIntent.metadata?.email as string | undefined) ??
        "";
      const email = normalizeEmail(rawEmail);
      const sku = (paymentIntent.metadata?.sku as "retos" | "agenda" | "combo" | undefined) ?? "retos";

      if (email) {
        await sendPaymentFailedEmail(email, {
          email,
          sku,
          provider: "stripe",
          paymentIntent: paymentIntent.id,
          amount: paymentIntent.amount ? paymentIntent.amount / 100 : null,
          amountCents: paymentIntent.amount ?? null,
          currency: paymentIntent.currency ?? null,
          reason: paymentIntent.last_payment_error?.message ?? null,
          supportEmail: context.supportEmail,
        });
      }
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
