// Deliberately NOT the full 24-nutrient panel — trimmed, per direct user
// request, to the specific micronutrients real population-level nutrition
// research flags as commonly under-met on an Indian diet, so the list is
// short and each entry is actually actionable rather than a generic label
// dump. Verified against real sources, not guessed:
//   - ICMR-NIN / Comprehensive National Nutrition Survey-linked research
//     (multicenter cross-sectional study, urban Indian schoolchildren):
//     >80% of the Indian population at risk for Vitamin B12, Vitamin D,
//     Calcium, Vitamin A and Folate; iron, zinc and Vitamin B6 flagged as
//     more localized but still significant gaps.
// Reference values themselves are still the standard adult NRVs from EU
// Regulation 1169/2011 Annex XIII Part A (the same figures printed on
// EU/UK food labels) — only the *selection* of which nutrients to show is
// India-diet-specific, not the target numbers.
//
// `foodField` is the exact snake_case column on `foods` this target reads.
export type NutrientGroup = "vitamin" | "mineral";

export type NutrientDef = {
  label: string;
  unit: "µg" | "mg";
  target: number;
  group: NutrientGroup;
  foodField: string; // e.g. "vitamin_a_ug_per_100g"
};

export const NUTRIENT_TARGETS: NutrientDef[] = [
  // Vitamins — commonly under-met on an Indian diet per population survey data
  { label: "Vitamin A", unit: "µg", target: 800, group: "vitamin", foodField: "vitamin_a_ug_per_100g" },
  { label: "Vitamin D", unit: "µg", target: 5, group: "vitamin", foodField: "vitamin_d_ug_per_100g" },
  { label: "Folate", unit: "µg", target: 200, group: "vitamin", foodField: "folate_ug_per_100g" },
  { label: "Vitamin B6", unit: "mg", target: 1.4, group: "vitamin", foodField: "vitamin_b6_mg_per_100g" },
  { label: "Vitamin B12", unit: "µg", target: 2.5, group: "vitamin", foodField: "vitamin_b12_ug_per_100g" },
  // Minerals — same basis
  { label: "Calcium", unit: "mg", target: 800, group: "mineral", foodField: "calcium_mg_per_100g" },
  { label: "Iron", unit: "mg", target: 14, group: "mineral", foodField: "iron_mg_per_100g" },
  { label: "Zinc", unit: "mg", target: 10, group: "mineral", foodField: "zinc_mg_per_100g" },
];

// Sodium isn't in Annex XIII Part A (salt/sodium is a macronutrient ceiling,
// not a vitamin/mineral NRV) — tracked separately as a "keep under" ceiling,
// not counted toward the "X targets met" summary. 2400mg matches the
// commonly-cited UK/EU public-health conversion of the 6g/day salt
// guideline (6g × 23/58.5 sodium fraction ≈ 2.36g, rounded to 2400mg).
export const SODIUM_CEILING_MG = 2400;

// Matches the fibre target SPEC.md already established (~30g), not a new number.
export const FIBRE_TARGET_G = 30;
