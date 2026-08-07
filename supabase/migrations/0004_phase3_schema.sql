-- Phase 3: Google Health API integration — schema.
-- Run this in the Supabase dashboard's SQL Editor.
-- Same posture as Phase 2: RLS enabled, no policies, server-only access.

-- ---------------------------------------------------------------------
-- OAuth connection (single row, always id='default')
-- ---------------------------------------------------------------------
create table google_health_connection (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scopes text not null,
  connected_at timestamptz not null default now(),
  backfill_status text not null default 'not_started' check (backfill_status in ('not_started', 'in_progress', 'completed')),
  backfill_cursor jsonb,
  last_daily_sync_at timestamptz
);
alter table google_health_connection enable row level security;

-- ---------------------------------------------------------------------
-- Daily rollup metrics — one row per date, upserted on every sync
-- ---------------------------------------------------------------------
create table daily_steps (
  entry_date date primary key,
  count int not null,
  synced_at timestamptz not null default now()
);
alter table daily_steps enable row level security;

create table daily_resting_heart_rate (
  entry_date date primary key,
  beats_per_minute int not null,
  synced_at timestamptz not null default now()
);
alter table daily_resting_heart_rate enable row level security;

create table daily_hrv (
  entry_date date primary key,
  average_ms numeric(6, 2),
  non_rem_bpm int,
  entropy numeric(6, 3),
  deep_sleep_rmssd_ms numeric(6, 2),
  synced_at timestamptz not null default now()
);
alter table daily_hrv enable row level security;

create table daily_respiratory_rate (
  entry_date date primary key,
  breaths_per_minute numeric(4, 1) not null,
  synced_at timestamptz not null default now()
);
alter table daily_respiratory_rate enable row level security;

create table daily_skin_temperature (
  entry_date date primary key,
  nightly_temperature_c numeric(4, 2) not null,
  baseline_temperature_c numeric(4, 2),
  relative_nightly_stddev_30d_c numeric(4, 2),
  synced_at timestamptz not null default now()
);
alter table daily_skin_temperature enable row level security;

create table daily_spo2 (
  entry_date date primary key,
  average_pct numeric(5, 2) not null,
  lower_bound_pct numeric(5, 2),
  upper_bound_pct numeric(5, 2),
  stddev_pct numeric(5, 2),
  synced_at timestamptz not null default now()
);
alter table daily_spo2 enable row level security;

-- ---------------------------------------------------------------------
-- Sleep sessions — one row per sleep session (usually one per night)
-- ---------------------------------------------------------------------
create table sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  google_data_point_name text unique, -- Google's own DataPoint.name, for idempotent re-sync
  start_time timestamptz not null,
  end_time timestamptz not null,
  sleep_type text check (sleep_type in ('CLASSIC', 'STAGES')),
  total_minutes int,
  deep_minutes int,
  rem_minutes int,
  light_minutes int,
  awake_minutes int,
  stages_json jsonb,
  synced_at timestamptz not null default now()
);
alter table sleep_sessions enable row level security;
create index sleep_sessions_start_time_idx on sleep_sessions(start_time);

-- ---------------------------------------------------------------------
-- Weight source tracking (manual entries always take priority)
-- ---------------------------------------------------------------------
alter table weight_entries add column source text not null default 'manual' check (source in ('manual', 'google_health'));

-- ---------------------------------------------------------------------
-- Weekly measurements + progress photos (Drive-backed, no binary data here)
-- ---------------------------------------------------------------------
create table weekly_measurements (
  id uuid primary key default gen_random_uuid(),
  week_date date not null unique,
  arm_cm numeric(4, 1),
  chest_cm numeric(4, 1),
  waist_cm numeric(4, 1),
  hip_cm numeric(4, 1),
  thigh_cm numeric(4, 1),
  notes text,
  created_at timestamptz not null default now()
);
alter table weekly_measurements enable row level security;

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  weekly_measurement_id uuid not null references weekly_measurements(id) on delete cascade,
  pose text not null check (pose in ('front', 'side', 'back')),
  drive_file_id text not null,
  drive_view_link text not null,
  created_at timestamptz not null default now()
);
alter table progress_photos enable row level security;
create index progress_photos_weekly_measurement_id_idx on progress_photos(weekly_measurement_id);

-- ---------------------------------------------------------------------
-- Exercise form-check recordings (Drive-backed)
-- ---------------------------------------------------------------------
create table exercise_recordings (
  id uuid primary key default gen_random_uuid(),
  plan_exercise_id uuid not null references plan_exercises(id) on delete cascade,
  recorded_date date not null,
  drive_file_id text not null,
  drive_view_link text not null,
  created_at timestamptz not null default now()
);
alter table exercise_recordings enable row level security;
create index exercise_recordings_plan_exercise_id_idx on exercise_recordings(plan_exercise_id);

-- ---------------------------------------------------------------------
-- Backup job history
-- ---------------------------------------------------------------------
create table backup_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  drive_folder_link text,
  tables_exported jsonb,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);
alter table backup_runs enable row level security;
