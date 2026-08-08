-- Phase 4.2c: liquid units — logging "100g" of Coca-Cola was misleading;
-- liquids should say "ml". CoFID reports everything per-100g uniformly
-- (no ml convention in that dataset), so this only actually varies for
-- Open Food Facts items going forward, and the manual-entry form gains a
-- unit choice.
-- Run this in the Supabase dashboard's SQL Editor, after 0012.

alter table foods add column quantity_unit text not null default 'g' check (quantity_unit in ('g', 'ml'));

-- Metadata-only rename; existing values are untouched. The column never
-- exclusively meant grams once liquids are tracked in ml.
alter table food_log_entries rename column quantity_grams to quantity_amount;
