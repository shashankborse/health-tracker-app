-- Phase 4.2b follow-up: backfill sugar/sodium onto restaurant seed rows
-- where already on hand from the original sourcing pass (not a fresh
-- research round — see the Phase 4 plan). Only the Subway Grilled Chicken
-- Sub had these specifically reported in the source used; the rest stay
-- null until/unless revisited.
-- Run this in the Supabase dashboard's SQL Editor, after 0010.

update foods
set sugar_g_per_100g = 6, sodium_mg_per_100g = 570
where source = 'restaurant' and name = '6" Grilled Chicken Sub' and brand = 'Subway';
