-- Phase 4.2b: extended nutrient tracking — sugar, saturated fat, and a
-- full vitamin/mineral panel, added mid-session at user request.
-- Run this in the Supabase dashboard's SQL Editor.
--
-- All nullable: coverage is genuinely inconsistent across sources (CoFID
-- has the full panel; Open Food Facts varies per product; manual entries
-- only ever set sugar/saturated fat/sodium). Column names follow
-- <nutrient>_<unit>_per_100g, matching the existing *_per_100g convention.

alter table foods
  add column sugar_g_per_100g numeric(5,1),
  add column saturated_fat_g_per_100g numeric(5,1),
  -- Minerals
  add column sodium_mg_per_100g numeric(8,3),
  add column potassium_mg_per_100g numeric(8,3),
  add column calcium_mg_per_100g numeric(8,3),
  add column magnesium_mg_per_100g numeric(8,3),
  add column phosphorus_mg_per_100g numeric(8,3),
  add column iron_mg_per_100g numeric(8,3),
  add column copper_mg_per_100g numeric(8,3),
  add column zinc_mg_per_100g numeric(8,3),
  add column chloride_mg_per_100g numeric(8,3),
  add column manganese_mg_per_100g numeric(8,3),
  add column selenium_ug_per_100g numeric(8,3),
  add column iodine_ug_per_100g numeric(8,3),
  -- Vitamins
  add column vitamin_a_ug_per_100g numeric(8,3),
  add column vitamin_d_ug_per_100g numeric(8,3),
  add column vitamin_e_mg_per_100g numeric(8,3),
  add column vitamin_k_ug_per_100g numeric(8,3),
  add column thiamin_mg_per_100g numeric(8,3),
  add column riboflavin_mg_per_100g numeric(8,3),
  add column niacin_mg_per_100g numeric(8,3),
  add column vitamin_b6_mg_per_100g numeric(8,3),
  add column vitamin_b12_ug_per_100g numeric(8,3),
  add column folate_ug_per_100g numeric(8,3),
  add column pantothenate_mg_per_100g numeric(8,3),
  add column biotin_ug_per_100g numeric(8,3),
  add column vitamin_c_mg_per_100g numeric(8,3);
