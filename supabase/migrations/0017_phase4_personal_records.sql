-- Phase 4, Increment B1: Personal records.
-- Run this in the Supabase dashboard's SQL Editor.

create table personal_records (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null unique references exercises(id) on delete cascade,
  best_weight_kg numeric(6,2) not null,
  best_reps_at_weight integer not null,
  achieved_date date not null,
  previous_best_weight_kg numeric(6,2),
  updated_at timestamptz not null default now()
);
alter table personal_records enable row level security;
