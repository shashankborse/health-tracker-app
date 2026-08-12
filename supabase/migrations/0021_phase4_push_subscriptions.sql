-- Phase 4 (Track D), Increment C4: Web Push weight-log reminder.
-- Stores browser push subscriptions (one per installed device/browser —
-- a single-user app can still have more than one, e.g. phone + a test
-- browser during development).
-- Run this in the Supabase dashboard's SQL Editor.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
