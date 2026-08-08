-- Phase 4.2b follow-up: widen the µg-unit nutrient columns.
-- Run this in the Supabase dashboard's SQL Editor, after 0011.
--
-- numeric(8,3) overflowed on a real (not erroneous) CoFID value: dried
-- kombu seaweed's iodine content is 440,670 µg/100g — the most iodine-
-- dense food that exists, bioaccumulated from seawater. Widening to
-- numeric(10,3) for every µg column rather than special-casing just
-- iodine, since other trace nutrients could plausibly have their own
-- extreme outliers in a 2,887-food dataset.

alter table foods
  alter column selenium_ug_per_100g type numeric(10,3),
  alter column iodine_ug_per_100g type numeric(10,3),
  alter column vitamin_a_ug_per_100g type numeric(10,3),
  alter column vitamin_d_ug_per_100g type numeric(10,3),
  alter column vitamin_k_ug_per_100g type numeric(10,3),
  alter column vitamin_b12_ug_per_100g type numeric(10,3),
  alter column folate_ug_per_100g type numeric(10,3),
  alter column biotin_ug_per_100g type numeric(10,3);
