-- Phase 4: Nutrition core — schema.
-- Run this in the Supabase dashboard's SQL Editor.
-- Same posture as Phase 2/3: RLS enabled, no policies, server-only access.

create table foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('cofid', 'restaurant', 'off', 'manual')),
  external_id text, -- CoFID food code / Open Food Facts barcode; null for restaurant/manual items
  name text not null,
  brand text,
  serving_description text, -- e.g. "1 glass (200ml)"; null implies 100g
  default_serving_grams numeric(6,1), -- powers quick-add's one-tap log
  calories_kcal_per_100g numeric(6,1) not null,
  protein_g_per_100g numeric(5,1) not null,
  carbs_g_per_100g numeric(5,1) not null,
  fat_g_per_100g numeric(5,1) not null,
  fibre_g_per_100g numeric(5,1),
  is_favourite boolean not null default false,
  created_at timestamptz not null default now()
);
alter table foods enable row level security;
-- Plain (non-partial) unique index: Postgres never treats two NULLs as
-- equal for uniqueness, so multiple restaurant rows (external_id null)
-- coexist fine, while this still works as an ON CONFLICT upsert target
-- for CoFID/OFF imports — a partial index's WHERE predicate can't be
-- inferred as a conflict target by a plain upsert call.
create unique index foods_source_external_id_idx on foods(source, external_id);

create table food_log_entries (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid not null references foods(id) on delete restrict,
  quantity_grams numeric(6,1) not null,
  client_id uuid not null unique, -- offline-queue idempotency, same pattern as exercise_logs
  created_at timestamptz not null default now()
);
alter table food_log_entries enable row level security;
create index food_log_entries_log_date_idx on food_log_entries(log_date);

-- Single-row profile config (height/DOB/sex), needed for the Mifflin-St-Jeor
-- fallback in the nutrition-targets increment — same single-row convention
-- as google_health_connection / google_drive_connection.
create table user_profile (
  id text primary key default 'default',
  height_cm numeric(5,1),
  date_of_birth date,
  biological_sex text check (biological_sex in ('male', 'female')),
  updated_at timestamptz not null default now()
);
alter table user_profile enable row level security;

-- Daily total-calories-burned rollup, synced from Google Health's
-- total-calories dataType (see googleHealthMetrics.ts) — powers the
-- Fitbit-actual-burn override for nutrition targets.
create table daily_total_calories (
  entry_date date primary key,
  kcal numeric(6,1) not null,
  synced_at timestamptz not null default now()
);
alter table daily_total_calories enable row level security;
