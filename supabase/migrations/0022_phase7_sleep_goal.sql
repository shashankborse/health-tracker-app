-- Phase 7, Increment P7-5b: configurable sleep-duration goal, powering
-- the banded goal chart on the new /health/sleep overview page.
-- Run this in the Supabase dashboard's SQL Editor.

alter table user_profile
  add column sleep_goal_minutes int;
