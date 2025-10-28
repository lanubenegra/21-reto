import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { grantAgenda } from "@/lib/grant-agenda";
import { normalizeEmail } from "@/lib/email";
import { sendGrantFailureAlert } from "@/lib/email/notifications";

export const runtime = "nodejs";

const MAX_TRIES = Number.parseInt(process.env.AGENDA_GRANT_MAX_TRIES ?? "10", 10);
const BATCH_SIZE = Number.parseInt(process.env.AGENDA_GRANT_BATCH_SIZE ?? "50", 10);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("grant_outbox")
    .select("*")
    .eq("status", "pending")
    .lt("tries", MAX_TRIES)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[agenda grant cron] select failed", error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of data ?? []) {
    processed += 1;
    const email = normalizeEmail(row.email);
    const nextTry = (row.tries ?? 0) + 1;
    const timestamp = new Date().toISOString();

    if (!email) {
      await supabaseAdmin
        .from("grant_outbox")
        .update({
          status: "error",
          tries: nextTry,
          last_try: timestamp,
          last_error: "missing email",
        })
        .eq("id", row.id);
      failed += 1;
      await sendGrantFailureAlert({
        targetEmail: row.email,
        tries: nextTry,
        stage: "cron",
        error: "missing email",
      });
      continue;
    }

    try {
      await grantAgenda(email);
      await supabaseAdmin
        .from("grant_outbox")
        .update({
          status: "ok",
          tries: nextTry,
          last_try: timestamp,
          last_error: null,
        })
        .eq("id", row.id);
      succeeded += 1;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "unknown grant error";
      const status = nextTry >= MAX_TRIES ? "error" : "pending";
      await supabaseAdmin
        .from("grant_outbox")
        .update({
          status,
          tries: nextTry,
          last_try: timestamp,
          last_error: message,
        })
        .eq("id", row.id);
      failed += 1;
      console.error("[agenda grant cron] grant failed", { email, message });
      if (status === "error") {
        await sendGrantFailureAlert({
          email,
          targetEmail: row.email,
          tries: nextTry,
          stage: "cron",
          error: message,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    succeeded,
    failed,
  });
}
