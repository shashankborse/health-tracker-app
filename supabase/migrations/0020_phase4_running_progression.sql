-- Phase 4 (Track D), Increment C3: running progression program.
-- Tracks the running day's current phase (SPEC.md Appendix A: Phase 1 =
-- beginner walk/jog intervals, Phase 2 = continuous 30-minute run).
-- Run this in the Supabase dashboard's SQL Editor.

alter table plan_days
  add column running_phase_number int not null default 1;
