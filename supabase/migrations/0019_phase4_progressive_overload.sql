-- Phase 4 (Track D), Increment C2: progressive overload engine.
-- Adds the missing weight-target column plan_exercises never had — the
-- engine writes a suggested next-session weight here after each logged
-- set, editable by the user afterward via the existing plan-exercises
-- PATCH route/ExerciseEditForm UI.
-- Run this in the Supabase dashboard's SQL Editor.

alter table plan_exercises
  add column target_weight_kg numeric(6,2);
