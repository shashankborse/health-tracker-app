-- Phase 3.7 follow-up: progress photos use four poses (front, left side,
-- right side, back) instead of three (front, side, back).
-- Run this in the Supabase dashboard's SQL Editor.

alter table progress_photos drop constraint if exists progress_photos_pose_check;
alter table progress_photos add constraint progress_photos_pose_check
  check (pose in ('front', 'left_side', 'right_side', 'back'));
