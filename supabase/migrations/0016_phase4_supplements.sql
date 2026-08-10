-- Phase 4, Increment A4: Supplement stack tracking.
-- Run this in the Supabase dashboard's SQL Editor.

create table supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dose_description text,
  purpose text,
  timing text not null check (timing in ('am', 'pm', 'with_meal')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table supplements enable row level security;

create table supplement_logs (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references supplements(id) on delete cascade,
  log_date date not null,
  client_id uuid not null unique, -- offline-queue idempotency, same pattern as food_log_entries
  logged_at timestamptz not null default now()
);
alter table supplement_logs enable row level security;
-- One log per supplement per day — a duplicate tap should toggle, not stack.
create unique index supplement_logs_supplement_date_idx on supplement_logs(supplement_id, log_date);
