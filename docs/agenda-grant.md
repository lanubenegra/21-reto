# Agenda Grant Integration

This document describes how the 21 Retos app grants access to the Agenda app after a donation that includes the `agenda` or `combo` SKU.

## Overview

1. Webhooks from Stripe and Wompi normalize the donor email, activate local entitlements, and enqueue a row in `grant_outbox`.
2. The app attempts to call the Agenda grant endpoint immediately using a signed JWT (`grantAgenda`). Any failure leaves the outbox row pending for retry.
3. A scheduled cron job (`/api/cron/grant-retry`) retries pending rows until they succeed or exceed the retry limit.
4. Support can trigger a manual grant by calling `/api/test/grant?email=<email>` (keep protected, or remove after validation).

## Required Environment Variables

| Variable | Description |
| --- | --- |
| `AGENDA_GRANT_URL` | Fully qualified URL for Juan's Agenda grant endpoint, e.g. `https://agenda.example.com/api/grant`. |
| `SHARED_SECRET` | Shared symmetric secret (HS256) used to sign the Agenda grant JWTs. Must match Agenda's server. |
| `AGENDA_GRANT_ISSUER` | Optional. Defaults to `retos`. Set only if Agenda expects a different `iss`. |
| `AGENDA_GRANT_AUDIENCE` | Optional. Defaults to `agenda-grant`. Set only if Agenda expects a different `aud`. |
| `AGENDA_GRANT_MAX_TRIES` | Optional. Defaults to `10`. Maximum retries before marking an outbox row as `error`. |
| `AGENDA_GRANT_BATCH_SIZE` | Optional. Defaults to `50`. Maximum rows processed per cron execution. |

Ensure these variables are configured in Vercel (Production and Preview) before enabling the cron job.

## Database Setup

Run `scripts/grant_outbox.sql` in Supabase to create the outbox table and supporting index:

```sql
\i scripts/grant_outbox.sql
```

The table shape:

```text
grant_outbox (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text not null check (product in ('agenda')),
  tries int not null default 0,
  last_try timestamptz,
  status text not null default 'pending',
  last_error text,
  created_at timestamptz not null default now()
)
```

Emails are stored normalized (lowercase + trimmed).

## Cron Job

Configure a Vercel cron job (every 5–10 minutes works well):

```
GET /api/cron/grant-retry
```

The handler processes up to `AGENDA_GRANT_BATCH_SIZE` pending rows. It marks rows as:

- `ok` when the Agenda grant call succeeds.
- `pending` with updated `tries`/`last_error` when another retry is needed.
- `error` once `tries` reaches `AGENDA_GRANT_MAX_TRIES`.

## Manual Grants

For quick manual verification, `GET /api/test/grant?email=<email>` triggers an immediate grant using the normalized email. Protect this endpoint behind auth or remove it after initial validation.

## Logging

- Webhooks log when the Agenda grant needs to be retried.
- The cron handler logs failures with the email and last error message.

Monitor Vercel/Supabase logs to ensure grants are flowing and to troubleshoot pending rows.

