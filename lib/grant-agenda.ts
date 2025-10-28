import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail } from "@/lib/email";
import { sendGrantFailureAlert } from "@/lib/email/notifications";

type AgendaGrantConfig = {
  secret: string;
  url: string;
  issuer: string;
  audience: string;
};

function getConfig(): AgendaGrantConfig {
  const secret = process.env.SHARED_SECRET;
  const url = process.env.AGENDA_GRANT_URL;
  const issuer = process.env.AGENDA_GRANT_ISSUER ?? "retos";
  const audience = process.env.AGENDA_GRANT_AUDIENCE ?? "agenda-grant";

  if (!secret) throw new Error("missing SHARED_SECRET");
  if (!url) throw new Error("missing AGENDA_GRANT_URL");

  return { secret, url, issuer, audience };
}

export async function grantAgenda(email: string) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("missing email");

  const config = getConfig();

  const token = jwt.sign(
    {
      email: normalizedEmail,
      product: "agenda",
      scope: "grant",
      jti: crypto.randomUUID(),
    },
    config.secret,
    {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: "5m",
    }
  );

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`grant failed: ${response.status} ${body}`.trim());
  }
}

export async function enqueueAgendaGrant(
  supabase: SupabaseClient,
  email: string
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const { data: outboxRow, error: insertError } = await supabase
    .from("grant_outbox")
    .insert({ email: normalizedEmail, product: "agenda" })
    .select()
    .single();

  if (insertError || !outboxRow) {
    console.error("[agenda grant] outbox insert failed", insertError?.message);
    return false;
  }

  const tries = (outboxRow.tries ?? 0) + 1;
  const timestamp = new Date().toISOString();

  try {
    await grantAgenda(normalizedEmail);
    await supabase
      .from("grant_outbox")
      .update({
        status: "ok",
        last_try: timestamp,
        tries,
        last_error: null,
      })
      .eq("id", outboxRow.id);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown grant error";
    await supabase
      .from("grant_outbox")
      .update({
        status: "pending",
        last_try: timestamp,
        tries,
        last_error: message,
      })
      .eq("id", outboxRow.id);
    console.error("[agenda grant] immediate grant failed", message);
    await sendGrantFailureAlert({
      email: normalizedEmail,
      tries,
      stage: "immediate",
      error: message,
    });
    return false;
  }
}
