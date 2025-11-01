"use server";

import { NextResponse } from "next/server";

import { requireSession, assertRole } from "@/lib/auth-roles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeEmail } from "@/lib/email";

type JsonObject = Record<string, unknown>;

type OrderRow = {
  id: number;
  email: string | null;
  sku: string | null;
  provider: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
  raw: JsonObject | null;
};

type ProfileRow = {
  email: string;
  display_name?: string | null;
  country?: string | null;
  city?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  whatsapp?: string | null;
};

type FallbackProfile = {
  name?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
};

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (!/[",\n]/.test(str)) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

function buildProfileMap(profiles: ProfileRow[]) {
  const map = new Map<string, ProfileRow>();
  profiles.forEach(profile => {
    if (!profile.email) return;
    const normalized = normalizeEmail(profile.email);
    if (normalized) {
      map.set(normalized, profile);
    }
    map.set(profile.email.toLowerCase(), profile);
  });
  return map;
}

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" ? (value as JsonObject) : {};
}

function getString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

function extractFromWompi(order: OrderRow): FallbackProfile {
  const rawData = asRecord(order.raw);
  const data = asRecord(rawData.data);
  const transaction = asRecord(data.transaction);
  const customer = asRecord(transaction.customer_data);
  const billing = asRecord(transaction.billing_data);
  const paymentMethod = asRecord(transaction.payment_method);
  const paymentExtra = asRecord(paymentMethod.extra);
  return {
    name:
      getString(customer.full_name) ??
      getString(customer.legal_name) ??
      getString(billing.full_name) ??
      getString(paymentExtra.card_holder) ??
      null,
    documentType:
      getString(customer.legal_id_type) ??
      getString(billing.legal_id_type) ??
      getString(paymentExtra.billing_document_type) ??
      null,
    documentNumber:
      getString(customer.legal_id) ??
      getString(billing.legal_id) ??
      getString(paymentExtra.billing_document) ??
      null,
    phone:
      getString(customer.phone_number) ??
      getString(billing.phone_number) ??
      getString(paymentExtra.phone_number) ??
      null,
  };
}

function extractFromStripe(order: OrderRow): FallbackProfile {
  const rawData = asRecord(order.raw);
  const metadata = asRecord(rawData.metadata);
  const customerDetails = asRecord(rawData.customer_details);
  const address = asRecord(customerDetails.address);
  return {
    name:
      getString(metadata.donor_name) ??
      getString(customerDetails.name) ??
      null,
    phone:
      getString(metadata.donor_phone) ??
      getString(customerDetails.phone) ??
      null,
    country: getString(metadata.donor_country) ?? getString(address.country) ?? null,
    city: getString(metadata.donor_city) ?? getString(address.city) ?? null,
  };
}

export async function GET(req: Request) {
  const session = await requireSession();
  assertRole(session, ["support", "admin", "superadmin"]);

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const providerFilter = url.searchParams.get("provider");

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id,email,sku,provider,status,amount,currency,created_at,raw")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reports.donations] orders query failed", error.message);
    return NextResponse.json({ error: "orders_query_failed" }, { status: 500 });
  }

  const filteredOrders = (orders ?? []).filter(order => {
    if (!providerFilter) return true;
    return (order.provider ?? "").toLowerCase() === providerFilter.toLowerCase();
  });

  const emailSet = new Set<string>();
  filteredOrders.forEach(order => {
    if (!order.email) return;
    const normalized = normalizeEmail(order.email);
    if (normalized) emailSet.add(normalized);
    emailSet.add(order.email.toLowerCase());
  });

  let profiles: ProfileRow[] = [];
  if (emailSet.size) {
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name, country, city, document_type, document_number, whatsapp")
      .in("email", Array.from(emailSet));

    if (profilesError) {
      console.error("[reports.donations] profiles query failed", profilesError.message);
    } else {
      profiles = profilesData ?? [];
    }
  }

  const profileMap = buildProfileMap(profiles);

  const rows = filteredOrders.map(order => {
    const normalized = normalizeEmail(order.email);
    const profile =
      (normalized ? profileMap.get(normalized) : undefined) ??
      (order.email ? profileMap.get(order.email.toLowerCase()) : undefined) ??
      null;

    const baseProfile: Partial<ProfileRow> = profile ?? {};
    const fallback: FallbackProfile =
      (order.provider === "wompi" && extractFromWompi(order)) ||
      (order.provider === "stripe" && extractFromStripe(order)) ||
      ({} as FallbackProfile);

    const amount = typeof order.amount === "number" ? order.amount / 100 : null;

    return {
      order_id: order.id,
      created_at: order.created_at,
      provider: order.provider,
      sku: order.sku,
      status: order.status,
      amount,
      amount_cents: order.amount,
      currency: order.currency,
      email: normalized || order.email || "",
      display_name: baseProfile.display_name ?? fallback.name ?? "",
      country: baseProfile.country ?? fallback.country ?? "",
      city: baseProfile.city ?? fallback.city ?? "",
      document_type: baseProfile.document_type ?? fallback.documentType ?? "",
      document_number: baseProfile.document_number ?? fallback.documentNumber ?? "",
      phone: baseProfile.whatsapp ?? fallback.phone ?? "",
    };
  });

  if (format === "csv") {
    const headers = [
      "order_id",
      "created_at",
      "provider",
      "sku",
      "status",
      "amount",
      "amount_cents",
      "currency",
      "email",
      "display_name",
      "country",
      "city",
      "document_type",
      "document_number",
      "phone",
    ];
    const csv = [
      headers.join(","),
      ...rows.map(row => headers.map(header => csvEscape((row as Record<string, unknown>)[header])).join(",")),
    ].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="donaciones-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ rows });
}
