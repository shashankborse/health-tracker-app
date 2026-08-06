-- Phase 2: Manual Tracking Core — Appendix A seed data.
-- Run this in the Supabase dashboard's SQL Editor, after 0001_phase2_schema.sql.
--
-- video_url is left NULL everywhere. Each exercise card shows a placeholder
-- "add video" state until a real YouTube or Google Drive link is pasted in
-- later through the plan-editing UI — no code change needed to backfill.
--
-- Exercises that appear on more than one day (e.g. "Arm Circles") are a
-- single library row, referenced by multiple plan_exercises rows — so
-- View Progress aggregates that exercise's history across every day it
-- appears on, rather than fragmenting it per day.

-- ---------------------------------------------------------------------
-- Exercise library
-- ---------------------------------------------------------------------
insert into exercises (name, instructions) values
  ('Arm Circles', 'Forward and backward, arms extended out to your sides.'),
  ('Band Pull-Aparts', 'Or light dumbbell external rotations if no band is available.'),
  ('Push-up to Downward Dog Stretch', 'Flow from a push-up position into a downward-dog stretch.'),
  ('Bodyweight Squats', 'Standard bodyweight squat, warm-up tempo.'),
  ('Leg Swings', 'Front-to-back, then side-to-side.'),
  ('Bodyweight Walking Lunges', 'Walking lunges with no added weight.'),
  ('Hip Circles', 'Both directions.'),
  ('Light Cardio', 'Jogging on the spot or jumping jacks.'),
  ('Brisk Walk', 'Easy pace, gets the heart rate up gently.'),
  ('High Knees', 'Running drill, quick tempo.'),
  ('Butt Kicks', 'Running drill, quick tempo.'),
  ('Ankle Circles', 'Both directions, each ankle.'),
  ('Doorway Chest Stretch', 'Forearm on a doorframe, lean forward gently.'),
  ('Overhead Triceps Stretch', 'Arm bent overhead, gentle pull with the other hand.'),
  ('Lat Stretch', 'Overhead reach, or hang from a pull-up bar.'),
  ('Cross-Body Shoulder Stretch', 'Pull one arm across the chest with the other.'),
  ('Standing Quad Stretch', 'Stand on one leg, pull the other heel toward the glute.'),
  ('Standing or Seated Hamstring Forward Fold', 'Fold forward from the hips, knees soft.'),
  ('Kneeling Hip-Flexor Stretch', 'Half-kneeling lunge position, hips pressed forward.'),
  ('Figure-4 Glute/Piriformis Stretch', 'Cross one ankle over the opposite knee, fold forward.'),
  ('Calf Stretch Against a Wall', 'Hands on a wall, back leg straight, heel down.'),
  ('Child''s Pose or Knee-to-Chest', 'Lower-back release, hold gently.'),
  ('Walk', 'Easy walking pace for heart-rate recovery.'),
  ('Barbell Bench Press', 'Chest, shoulders, triceps.'),
  ('Barbell Bent-Over Row', 'Upper back, biceps.'),
  ('Standing Barbell Overhead Press', 'Shoulders, triceps, core stability.'),
  ('Pull-ups / Chin-ups', 'Back, biceps. Assisted or negative-rep progression for a beginner.'),
  ('Dumbbell Renegade Row', 'Core, back, shoulders, and stabilisers in one movement.'),
  ('Barbell Back Squat', 'Quads, glutes, core.'),
  ('Barbell Romanian Deadlift', 'Hamstrings, glutes, lower back.'),
  ('Dumbbell Walking Lunges', 'Single-leg balance, hip strength.'),
  ('Barbell Hip Thrust', 'Bench-supported. Glutes, hamstrings.'),
  ('Hanging Knee Raises', 'Rack pull-up bar. Lower abdominals, grip.'),
  ('Conventional Barbell Deadlift', 'Posterior chain, grip, core — the single biggest full-body compound lift.'),
  ('Push-ups', 'Standard or incline against a bench. Chest, shoulders, triceps, core.'),
  ('Dumbbell Step-ups', 'Using a bench. Leg power, mimics daily climbing movement.'),
  ('Dumbbell Thrusters', 'Squat-to-press combination hitting legs, glutes, shoulders, and core.'),
  ('Face Pulls', 'Multi-function machine cable (provisional pending machine confirmation — fallback is Dumbbell Reverse Fly). Rear delts, upper back, shoulder health.');

-- ---------------------------------------------------------------------
-- Weekly schedule
-- ---------------------------------------------------------------------
insert into plan_days (day_of_week, name, day_type, description, sort_order) values
  (1, 'Strength Workout A — Upper Body Focus', 'strength', null, 1),
  (2, 'Active Recovery', 'active_recovery', 'Light walking or mobility stretching.', 2),
  (3, 'Strength Workout B — Lower Body Focus', 'strength', null, 3),
  (4, 'Rest Day', 'rest', 'Complete rest.', 4),
  (5, 'Strength Workout C — Full Body Focus', 'strength', null, 5),
  (6, 'Running Day', 'running', 'Phase 1 (starting point): 20-30 minutes alternating 1 minute jogging with 1 minute walking. Phase 2 (progression target): 30 minutes of continuous, easy-paced running.', 6),
  (0, 'Rest Day', 'rest', 'Complete rest.', 7);

-- ---------------------------------------------------------------------
-- Day 1: Strength Workout A (Upper Body Focus)
-- ---------------------------------------------------------------------
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 1, 1, '15', '15 reps each direction'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Arm Circles';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 2, 1, '15', '15 reps'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Band Pull-Aparts';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 3, 1, '8', '8 reps'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Push-up to Downward Dog Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'main_lift', 4, 2, '10', 'Bar only or very light weight'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Barbell Bench Press';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 5, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Barbell Bench Press';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 6, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Barbell Bent-Over Row';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 7, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Standing Barbell Overhead Press';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 8, 3, '8-12', 'Assisted or negative-rep progression for a beginner'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Pull-ups / Chin-ups';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 9, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Dumbbell Renegade Row';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 10, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Doorway Chest Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 11, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Overhead Triceps Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 12, 30, '30 second hold'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Lat Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 13, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 1 and e.name = 'Cross-Body Shoulder Stretch';

-- ---------------------------------------------------------------------
-- Day 2: Strength Workout B (Lower Body Focus)
-- ---------------------------------------------------------------------
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 1, '10-15', '10-15 reps'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Bodyweight Squats';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 2, '10', '10 each direction per leg'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Leg Swings';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 3, '10', '10 reps'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Bodyweight Walking Lunges';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 4, '10', '10 each direction'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Hip Circles';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'main_lift', 5, 2, '10', 'Bar only'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Barbell Back Squat';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 6, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Barbell Back Squat';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 7, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Barbell Romanian Deadlift';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 8, 3, '8-12', null
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Dumbbell Walking Lunges';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 9, 3, '8-12', 'Bench-supported'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Barbell Hip Thrust';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 10, 3, '8-12', 'Rack pull-up bar'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Hanging Knee Raises';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 11, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Standing Quad Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 12, 30, '30 second hold'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Standing or Seated Hamstring Forward Fold';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 13, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Kneeling Hip-Flexor Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 14, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Figure-4 Glute/Piriformis Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 15, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 3 and e.name = 'Calf Stretch Against a Wall';

-- ---------------------------------------------------------------------
-- Day 3: Strength Workout C (Full Body & Balance)
-- ---------------------------------------------------------------------
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'warmup', 'duration', 1, 150, '2-3 minutes'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Light Cardio';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 2, '15', '15 reps each direction'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Arm Circles';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 3, '10-15', '10-15 reps'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Bodyweight Squats';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 4, '10', '10 reps'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Bodyweight Walking Lunges';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 5, '8', '8 reps'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Push-up to Downward Dog Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'warmup', 'main_lift', 6, 2, '10', 'Bar only'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Conventional Barbell Deadlift';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 7, 3, '10', null
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Conventional Barbell Deadlift';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 8, 3, '10', 'Standard or incline against a bench'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Push-ups';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 9, 3, '10', 'Using the bench'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Dumbbell Step-ups';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 10, 3, '10', null
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Dumbbell Thrusters';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_sets, target_reps, notes)
select pd.id, e.id, 'main', 'main_lift', 11, 3, '10', 'Provisional — depends on multi-function machine confirmation; fallback is Dumbbell Reverse Fly'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Face Pulls';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 12, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Standing or Seated Hamstring Forward Fold';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 13, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Standing Quad Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 14, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Kneeling Hip-Flexor Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 15, 30, '30 second hold'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Child''s Pose or Knee-to-Chest';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 16, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 5 and e.name = 'Doorway Chest Stretch';

-- ---------------------------------------------------------------------
-- Day 4 (Saturday): Running Day
-- ---------------------------------------------------------------------
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'warmup', 'duration', 1, 150, '2-3 minutes'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Brisk Walk';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 2, '10', '10 each direction per leg'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Leg Swings';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'warmup', 'duration', 3, 20, '20 seconds'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'High Knees';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'warmup', 'duration', 4, 20, '20 seconds'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Butt Kicks';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_reps, notes)
select pd.id, e.id, 'warmup', 'reps', 5, '10', '10 each direction per ankle'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Ankle Circles';

insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'duration', 6, 240, '3-5 minutes, heart rate recovery'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Walk';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 7, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Calf Stretch Against a Wall';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 8, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Standing or Seated Hamstring Forward Fold';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 9, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Standing Quad Stretch';
insert into plan_exercises (plan_day_id, exercise_id, category, log_type, sort_order, target_duration_seconds, notes)
select pd.id, e.id, 'cooldown', 'hold_time', 10, 30, '30 seconds per side'
from plan_days pd, exercises e where pd.sort_order = 6 and e.name = 'Kneeling Hip-Flexor Stretch';
