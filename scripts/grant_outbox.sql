create table if not exists grant_outbox (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text not null check (product in ('agenda')),
  tries int not null default 0,
  last_try timestamptz,
  status text not null default 'pending', -- pending|ok|error
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists grant_outbox_status_idx
  on grant_outbox(status, created_at);

