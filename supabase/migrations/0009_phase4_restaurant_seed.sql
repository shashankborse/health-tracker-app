-- Phase 4: restaurant-chain starter seed content.
-- Run this in the Supabase dashboard's SQL Editor, after 0008.
--
-- Sourced from each chain's published nutrition disclosures (via aggregator
-- cross-reference), no beef/pork per the dietary constraint. Restaurant
-- items are reported per-serving rather than per-100g (unlike CoFID/OFF) —
-- since exact serving weight in grams isn't published, each item's real
-- per-serving macros are stored directly in the _per_100g columns with
-- default_serving_grams = 100, so logging "1 serving" (quantity_grams=100)
-- reproduces the real numbers. This is a stand-in unit, not a literal
-- 100g weight — expandable later through the app's own editable UI.

insert into foods (source, name, brand, serving_description, default_serving_grams, calories_kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fibre_g_per_100g) values
  ('restaurant', '1/4 Chicken (grilled breast)', 'Nando''s', '1 serving', 100, 289, 39.3, 0.3, 14.5, null),
  ('restaurant', 'Grilled Chicken Wrap', 'Nando''s', '1 serving', 100, 556, 36.8, 62.8, 17.2, null),
  ('restaurant', 'Spicy Rice (Regular)', 'Nando''s', '1 serving', 100, 246, 3.8, 42.2, 6, null),
  ('restaurant', 'Rainbow Slaw (Regular)', 'Nando''s', '1 serving', 100, 132, 1.8, 7.4, 11.6, null),
  ('restaurant', '6" Grilled Chicken Sub', 'Subway', '1 serving', 100, 290, 26, 40, 5, 4),
  ('restaurant', '6" Veggie Delite', 'Subway', '1 serving', 100, 230, 9, 44, 2.5, 4);
