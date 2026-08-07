-- Phase 2.4: allows "get-or-create today's session for this day" to be a
-- single clean upsert instead of a select-then-maybe-insert race.
alter table workout_sessions
  add constraint workout_sessions_day_date_unique unique (plan_day_id, session_date);
