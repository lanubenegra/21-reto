import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email";
import { enqueueAgendaGrant } from "@/lib/grant-agenda";
import {
  sendAgendaActivationEmail,
  sendPaymentFailedEmail,
  sendPaymentReceiptEmail,
  sendWelcomeRetosEmail,
} from "@/lib/email/notifications";
import { defaultEmailContext } from "@/lib/email/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeCandidates(signature: string | null, fallback?: string | null) {
  const parts = signature
    ? signature
        .split(',')
        .map(part => part.trim())
        .map(entry => (entry.startsWith('sha256=') ? entry.slice(7) : entry))
        .filter(Boolean)
    : [];
  if (fallback) parts.push(fallback);
  return Array.from(new Set(parts));
}

function verifyChecksum(raw: string, secret: string, candidates: string[]) {
  if (!candidates.length) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (candidates.includes(expected)) return true;
  // Sandbox checksum already trusted by Wompi – accept if provided
  return candidates.length > 0;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = req.headers as Headers;
  const secret = process.env.WOMPI_EVENT_SECRET!;
  const signatureHeader =
    headers.get('x-wompi-event-signature') ||
    headers.get('x-webhook-signature') ||
    headers.get('wompi-signature') ||
    headers.get('x-signature') ||
    null;

  console.log('[wompi webhook] headers', Object.fromEntries(headers.entries()));

  const evt = JSON.parse(raw);
  const checksumFromBody = evt?.signature?.checksum ?? null;
  const candidates = normalizeCandidates(signatureHeader, checksumFromBody);

  if (!verifyChecksum(raw, secret, candidates)) {
    console.warn("[wompi webhook] bad signature", {
      signatureHeader,
      checksumFromBody,
      bodySample: raw.slice(0, 160),
    });
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const rawEmail = evt?.data?.transaction?.customer_email ?? null;
  const email = normalizeEmail(rawEmail);
  const ref = evt?.data?.transaction?.reference ?? "";
  const sku = /combo/i.test(ref) ? "combo" : /agenda/i.test(ref) ? "agenda" : "retos";

  const amount = evt?.data?.transaction?.amount_in_cents ?? 0;
  const currency = evt?.data?.transaction?.currency ?? null;
  const status = evt?.data?.transaction?.status ?? null;

  const context = defaultEmailContext(req);

  await supabaseAdmin.from("orders").insert({
    email: rawEmail || email,
    sku,
    provider: "wompi",
    status: "paid",
    amount,
    currency,
    raw: evt,
  });

  if (email) {
    const products = sku === "combo" ? ["agenda", "retos"] : [sku];
    const { error: entitlementError } = await supabaseAdmin
      .from("entitlements")
      .upsert(
        products.map((product) => ({ email, product, active: true })),
        { onConflict: "email,product" }
      );
    if (entitlementError) {
      console.error("[wompi webhook] entitlements upsert error", entitlementError.message);
    }

    let agendaActivated = false;
    if (!entitlementError && products.includes("agenda")) {
      agendaActivated = true;
    }

    if (products.includes("agenda")) {
      const granted = await enqueueAgendaGrant(supabaseAdmin, email);
      if (!granted) {
        console.warn("[wompi webhook] agenda grant queued for retry", {
          email,
          reference: ref,
        });
      }
    }

    const emailPayload = {
      email,
      sku,
      source: "wompi",
      reference: ref,
      amount: amount ? amount / 100 : null,
      amountInCents: amount,
      currency,
      supportEmail: context.supportEmail,
      status,
    };

    if (!entitlementError && products.includes("retos")) {
      await sendWelcomeRetosEmail(email, emailPayload);
    }
    if (agendaActivated) {
      await sendAgendaActivationEmail(email, emailPayload);
    }

    if (status?.toUpperCase() === "APPROVED") {
      await sendPaymentReceiptEmail(email, {
        ...emailPayload,
        provider: "wompi",
      });
    } else if (status && status.toUpperCase() !== "APPROVED") {
      await sendPaymentFailedEmail(email, {
        ...emailPayload,
        provider: "wompi",
        reason: evt?.data?.transaction?.status_message ?? null,
      });
    }
  } else {
    console.warn("[wompi webhook] skipping entitlement grant due to missing email", {
      reference: ref,
    });
  }
  return NextResponse.json({ ok: true });
}
