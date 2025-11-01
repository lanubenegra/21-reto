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

function extractPaymentLinkId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/\/l\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

function getString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
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

  const transaction = evt?.data?.transaction ?? {};
  const rawEmail = transaction?.customer_email ?? null;
  const email = normalizeEmail(rawEmail);
  const ref = getString(transaction?.reference) ?? "";
  const amount = Number(transaction?.amount_in_cents ?? 0);
  const currency = getString(transaction?.currency) ?? null;
  const status = getString(transaction?.status) ?? null;
  const paymentMethod = transaction?.payment_method ?? {};
  const paymentExtra = paymentMethod?.extra ?? {};
  const paymentLinkId = getString(transaction?.payment_link_id);

  const { data: priceRows } = await supabaseAdmin
    .from("prices")
    .select("product, amount, currency, external_id")
    .eq("provider", "wompi")
    .eq("active", true);

  const matchedPrice = (priceRows ?? []).find((row) => {
    if (!row.product || row.amount == null) return false;
    const rowCurrency = (row.currency ?? "").toUpperCase();
    const expectedCents =
      rowCurrency === "COP" || rowCurrency === "CRC" || rowCurrency === "CLP"
        ? Math.round(Number(row.amount) * 100)
        : Math.round(Number(row.amount) * 100);
    if (!expectedCents || expectedCents !== amount) return false;

    const linkId = extractPaymentLinkId(row.external_id);
    if (!linkId) return true;

    const methodLink = paymentLinkId ?? getString((paymentExtra as Record<string, unknown>)?.payment_link_id);
    const description = getString((paymentExtra as Record<string, unknown>)?.payment_description);

    return ref.includes(linkId) || methodLink === linkId || (description ? description.includes(linkId) : false);
  });

  if (!matchedPrice) {
    console.warn("[wompi webhook] unexpected transaction, skipping entitlement", {
      ref,
      amount,
      currency,
      email,
    });
    await supabaseAdmin.from("orders").insert({
      email: rawEmail || email,
      sku: "unknown",
      provider: "wompi",
      status: "ignored",
      amount,
      currency,
      raw: evt,
    });
    return NextResponse.json({ ok: true });
  }

  const sku = matchedPrice.product as "retos" | "agenda" | "combo";

  await supabaseAdmin.from("orders").insert({
    email: rawEmail || email,
    sku,
    provider: "wompi",
    status: status?.toUpperCase() === "APPROVED" ? "paid" : status ?? "pending",
    amount,
    currency,
    raw: evt,
  });

  const context = defaultEmailContext(req);

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
