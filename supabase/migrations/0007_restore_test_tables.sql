-- Phase 3.9: shadow tables for destructively testing the restore script.
-- Run this in the Supabase dashboard's SQL Editor.
--
-- One `_restore_test` table per real table, structure/types/defaults only
-- (no FKs, unique constraints, or check constraints copied) — these exist
-- purely to prove a backup round-trips correctly through the restore
-- script, not to replay full referential integrity. Same RLS posture as
-- every other table: enabled, no policies, server-only access.

create table exercises_restore_test (like exercises including defaults);
alter table exercises_restore_test enable row level security;

create table plan_days_restore_test (like plan_days including defaults);
alter table plan_days_restore_test enable row level security;

create table plan_exercises_restore_test (like plan_exercises including defaults);
alter table plan_exercises_restore_test enable row level security;

create table workout_sessions_restore_test (like workout_sessions including defaults);
alter table workout_sessions_restore_test enable row level security;

create table exercise_logs_restore_test (like exercise_logs including defaults);
alter table exercise_logs_restore_test enable row level security;

create table run_logs_restore_test (like run_logs including defaults);
alter table run_logs_restore_test enable row level security;

create table weight_entries_restore_test (like weight_entries including defaults);
alter table weight_entries_restore_test enable row level security;

create table google_health_connection_restore_test (like google_health_connection including defaults);
alter table google_health_connection_restore_test enable row level security;

create table daily_steps_restore_test (like daily_steps including defaults);
alter table daily_steps_restore_test enable row level security;

create table daily_resting_heart_rate_restore_test (like daily_resting_heart_rate including defaults);
alter table daily_resting_heart_rate_restore_test enable row level security;

create table daily_hrv_restore_test (like daily_hrv including defaults);
alter table daily_hrv_restore_test enable row level security;

create table daily_respiratory_rate_restore_test (like daily_respiratory_rate including defaults);
alter table daily_respiratory_rate_restore_test enable row level security;

create table daily_skin_temperature_restore_test (like daily_skin_temperature including defaults);
alter table daily_skin_temperature_restore_test enable row level security;

create table daily_spo2_restore_test (like daily_spo2 including defaults);
alter table daily_spo2_restore_test enable row level security;

create table sleep_sessions_restore_test (like sleep_sessions including defaults);
alter table sleep_sessions_restore_test enable row level security;

create table weekly_measurements_restore_test (like weekly_measurements including defaults);
alter table weekly_measurements_restore_test enable row level security;

create table progress_photos_restore_test (like progress_photos including defaults);
alter table progress_photos_restore_test enable row level security;

create table exercise_recordings_restore_test (like exercise_recordings including defaults);
alter table exercise_recordings_restore_test enable row level security;

create table backup_runs_restore_test (like backup_runs including defaults);
alter table backup_runs_restore_test enable row level security;

create table google_drive_connection_restore_test (like google_drive_connection including defaults);
alter table google_drive_connection_restore_test enable row level security;
