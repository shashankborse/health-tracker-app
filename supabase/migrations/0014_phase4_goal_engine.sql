-- Phase 4, Increment A1: Goal Engine profile fields, powering
-- src/lib/nutritionTargets.ts's Mifflin-St-Jeor + TDEE computation.
-- Run this in the Supabase dashboard's SQL Editor.

alter table user_profile
  add column activity_multiplier numeric(4,3) not null default 1.375,
  add column fitness_goal text not null default 'maintenance'
    check (fitness_goal in ('fat_loss', 'maintenance', 'muscle_gain')),
  add column meal_distribution text not null default '4_meal'
    check (meal_distribution in ('2_meal', '4_meal'));
