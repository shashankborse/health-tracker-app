-- Phase 4, Increment B2: muscle-group tagging, powering weekly training
-- load / muscle-group volume aggregation over exercise_logs.
-- Run this in the Supabase dashboard's SQL Editor.

alter table exercises
  add column muscle_group text check (
    muscle_group in ('chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'mobility', 'cardio')
  );

-- Backfill the existing seeded catalog (Appendix A). Warm-up/cool-down
-- stretches and cardio items get a category too for completeness, even
-- though only weighted main lifts (which have weight_kg on their logs)
-- actually contribute to tonnage math.
update exercises set muscle_group = 'mobility' where name = 'Ankle Circles';
update exercises set muscle_group = 'shoulders' where name = 'Arm Circles';
update exercises set muscle_group = 'back' where name = 'Band Pull-Aparts';
update exercises set muscle_group = 'legs' where name = 'Barbell Back Squat';
update exercises set muscle_group = 'chest' where name = 'Barbell Bench Press';
update exercises set muscle_group = 'back' where name = 'Barbell Bent-Over Row';
update exercises set muscle_group = 'glutes' where name = 'Barbell Hip Thrust';
update exercises set muscle_group = 'legs' where name = 'Barbell Romanian Deadlift';
update exercises set muscle_group = 'legs' where name = 'Bodyweight Squats';
update exercises set muscle_group = 'legs' where name = 'Bodyweight Walking Lunges';
update exercises set muscle_group = 'cardio' where name = 'Brisk Walk';
update exercises set muscle_group = 'cardio' where name = 'Butt Kicks';
update exercises set muscle_group = 'mobility' where name = 'Calf Stretch Against a Wall';
update exercises set muscle_group = 'mobility' where name = 'Child''s Pose or Knee-to-Chest';
update exercises set muscle_group = 'back' where name = 'Conventional Barbell Deadlift';
update exercises set muscle_group = 'mobility' where name = 'Cross-Body Shoulder Stretch';
update exercises set muscle_group = 'mobility' where name = 'Doorway Chest Stretch';
update exercises set muscle_group = 'back' where name = 'Dumbbell Renegade Row';
update exercises set muscle_group = 'legs' where name = 'Dumbbell Step-ups';
update exercises set muscle_group = 'legs' where name = 'Dumbbell Thrusters';
update exercises set muscle_group = 'legs' where name = 'Dumbbell Walking Lunges';
update exercises set muscle_group = 'shoulders' where name = 'Face Pulls';
update exercises set muscle_group = 'mobility' where name = 'Figure-4 Glute/Piriformis Stretch';
update exercises set muscle_group = 'core' where name = 'Hanging Knee Raises';
update exercises set muscle_group = 'cardio' where name = 'High Knees';
update exercises set muscle_group = 'mobility' where name = 'Hip Circles';
update exercises set muscle_group = 'mobility' where name = 'Kneeling Hip-Flexor Stretch';
update exercises set muscle_group = 'mobility' where name = 'Lat Stretch';
update exercises set muscle_group = 'mobility' where name = 'Leg Swings';
update exercises set muscle_group = 'cardio' where name = 'Light Cardio';
update exercises set muscle_group = 'mobility' where name = 'Overhead Triceps Stretch';
update exercises set muscle_group = 'back' where name = 'Pull-ups / Chin-ups';
update exercises set muscle_group = 'mobility' where name = 'Push-up to Downward Dog Stretch';
update exercises set muscle_group = 'chest' where name = 'Push-ups';
update exercises set muscle_group = 'shoulders' where name = 'Standing Barbell Overhead Press';
update exercises set muscle_group = 'mobility' where name = 'Standing or Seated Hamstring Forward Fold';
update exercises set muscle_group = 'mobility' where name = 'Standing Quad Stretch';
update exercises set muscle_group = 'cardio' where name = 'Walk';
