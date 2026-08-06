-- Phase 2: Manual Tracking Core — schema.
-- Run this in the Supabase dashboard's SQL Editor.
--
-- RLS is enabled on every table with zero policies attached. That locks out
-- the anon/authenticated Postgres roles entirely; the service_role key
-- (BYPASSRLS) used by every Next.js API route is the only way in. There is
-- no separate per-user auth in this app (single shared password gate), so
-- this is the correct "deny the public key, allow the server" posture.

create extension if not exists pgcrypto;

create table weight_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null unique,
  weight_kg numeric(5,2) not null,
  body_fat_pct numeric(4,2),
  note text,
  created_at timestamptz not null default now()
);
alter table weight_entries enable row level security;

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  video_url text,
  instructions text,
  created_at timestamptz not null default now()
);
alter table exercises enable row level security;

create table plan_days (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday .. 6=Saturday (JS Date convention)
  name text not null,
  day_type text not null check (day_type in ('strength', 'running', 'active_recovery', 'rest')),
  description text,
  sort_order int not null,
  created_at timestamptz not null default now()
);
alter table plan_days enable row level security;

create table plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references plan_days(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete restrict,
  category text not null check (category in ('warmup', 'main', 'cooldown')),
  log_type text not null check (log_type in ('main_lift', 'reps', 'duration', 'hold_time')),
  sort_order int not null,
  target_sets int,
  target_reps text,
  target_duration_seconds int,
  notes text,
  created_at timestamptz not null default now()
);
alter table plan_exercises enable row level security;
create index plan_exercises_plan_day_id_idx on plan_exercises(plan_day_id);

create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references plan_days(id) on delete restrict,
  session_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now()
);
alter table workout_sessions enable row level security;
create index workout_sessions_plan_day_id_idx on workout_sessions(plan_day_id);

create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  plan_exercise_id uuid not null references plan_exercises(id) on delete restrict,
  client_id uuid not null unique, -- generated client-side so a retried offline-queue flush can't duplicate a row
  set_number int not null default 1,
  actual_reps int,
  weight_kg numeric(6,2),
  rpe int check (rpe between 1 and 10),
  duration_seconds int,
  hold_time_seconds int,
  created_at timestamptz not null default now()
);
alter table exercise_logs enable row level security;
create index exercise_logs_session_id_idx on exercise_logs(session_id);
create index exercise_logs_plan_exercise_id_idx on exercise_logs(plan_exercise_id);

create table run_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  client_id uuid not null unique,
  distance_km numeric(5,2),
  duration_seconds int,
  rpe int check (rpe between 1 and 10),
  created_at timestamptz not null default now()
);
alter table run_logs enable row level security;
create index run_logs_session_id_idx on run_logs(session_id);
