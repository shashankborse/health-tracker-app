// Standalone one-time import — run with `npm run import-cofid`.
// Downloads the official UK CoFID dataset (McCance & Widdowson's
// Composition of Foods Integrated Dataset, 2021) from gov.uk and imports
// three of its sheets into the `foods` table as source='cofid': "1.3
// Proximates" (macros/fibre/sugar/sat fat), "1.4 Inorganics" (minerals),
// and "1.5 Vitamins" (vitamins), joined by Food Code. Column layout
// confirmed directly against the real downloaded file, not guessed — see
// migrations 0008/0010 and the Phase 4 plan. Upserts on (source,
// external_id), so re-running updates existing rows in place rather than
// duplicating them — this is how the extended-nutrient columns (0010) got
// backfilled onto the 2,579 rows the first run already imported.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { getSupabaseServerClient } from "../src/lib/supabaseServer";

const COFID_URL =
  "https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx";

const PROXIMATES_SHEET = "1.3 Proximates";
const INORGANICS_SHEET = "1.4 Inorganics";
const VITAMINS_SHEET = "1.5 Vitamins";

// Confirmed 0-based column indices from each sheet's real header row.
const PROXIMATES_COL = {
  foodCode: 0,
  foodName: 1,
  protein: 9,
  fat: 10,
  carbohydrate: 11,
  energyKcal: 12,
  totalSugars: 16,
  aoacFibre: 25,
  saturatedFat: 27, // "Satd FA /100g fd (g)"
};

const INORGANICS_COL = {
  foodCode: 0,
  sodium: 7,
  potassium: 8,
  calcium: 9,
  magnesium: 10,
  phosphorus: 11,
  iron: 12,
  copper: 13,
  zinc: 14,
  chloride: 15,
  manganese: 16,
  selenium: 17,
  iodine: 18,
};

const VITAMINS_COL = {
  foodCode: 0,
  retinolEquivalent: 9, // reported as "Vitamin A"
  vitaminD: 10,
  vitaminE: 11,
  vitaminK1: 12,
  thiamin: 13,
  riboflavin: 14,
  niacinEquivalent: 17, // the computed column, not raw Niacin (15)
  vitaminB6: 18,
  vitaminB12: 19,
  folate: 20,
  pantothenate: 21,
  biotin: 22,
  vitaminC: 23,
};

// Per SPEC.md's dietary constraint: no beef or pork (incl. pork-derived
// meats) in any seeded/recommended item.
const EXCLUDED_NAME_PATTERN = /\b(beef|pork|bacon|ham|gammon|chorizo|pepperoni|salami|prosciutto|lard)\b/i;

const INSERT_CHUNK_SIZE = 500;

// CoFID cells mix real numbers with "Tr" (trace, ~0) and "N" (not
// determined/available) as literal text within the same column.
function parseNumeric(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (s === "") return null;
  if (/^tr$/i.test(s)) return 0;
  if (/^n$/i.test(s)) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function sheetRows(workbook: XLSX.WorkBook, name: string): unknown[][] {
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new Error(`Sheet "${name}" not found in the downloaded file.`);
  // First 3 rows are header variants (full name / short code / display name).
  return (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][]).slice(3);
}

function buildLookup(rows: unknown[][], foodCodeCol: number, fields: Record<string, number>) {
  const map = new Map<string, Record<string, number | null>>();
  for (const row of rows) {
    const code = row[foodCodeCol];
    if (!code) continue;
    const entry: Record<string, number | null> = {};
    for (const [key, col] of Object.entries(fields)) {
      entry[key] = parseNumeric(row[col]);
    }
    map.set(String(code).trim(), entry);
  }
  return map;
}

async function main() {
  console.log(`Downloading CoFID dataset from ${COFID_URL} ...`);
  const res = await fetch(COFID_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded ${buffer.length} bytes.`);

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const proximatesRows = sheetRows(workbook, PROXIMATES_SHEET);
  const inorganics = buildLookup(sheetRows(workbook, INORGANICS_SHEET), INORGANICS_COL.foodCode, {
    sodium_mg_per_100g: INORGANICS_COL.sodium,
    potassium_mg_per_100g: INORGANICS_COL.potassium,
    calcium_mg_per_100g: INORGANICS_COL.calcium,
    magnesium_mg_per_100g: INORGANICS_COL.magnesium,
    phosphorus_mg_per_100g: INORGANICS_COL.phosphorus,
    iron_mg_per_100g: INORGANICS_COL.iron,
    copper_mg_per_100g: INORGANICS_COL.copper,
    zinc_mg_per_100g: INORGANICS_COL.zinc,
    chloride_mg_per_100g: INORGANICS_COL.chloride,
    manganese_mg_per_100g: INORGANICS_COL.manganese,
    selenium_ug_per_100g: INORGANICS_COL.selenium,
    iodine_ug_per_100g: INORGANICS_COL.iodine,
  });
  const vitamins = buildLookup(sheetRows(workbook, VITAMINS_SHEET), VITAMINS_COL.foodCode, {
    vitamin_a_ug_per_100g: VITAMINS_COL.retinolEquivalent,
    vitamin_d_ug_per_100g: VITAMINS_COL.vitaminD,
    vitamin_e_mg_per_100g: VITAMINS_COL.vitaminE,
    vitamin_k_ug_per_100g: VITAMINS_COL.vitaminK1,
    thiamin_mg_per_100g: VITAMINS_COL.thiamin,
    riboflavin_mg_per_100g: VITAMINS_COL.riboflavin,
    niacin_mg_per_100g: VITAMINS_COL.niacinEquivalent,
    vitamin_b6_mg_per_100g: VITAMINS_COL.vitaminB6,
    vitamin_b12_ug_per_100g: VITAMINS_COL.vitaminB12,
    folate_ug_per_100g: VITAMINS_COL.folate,
    pantothenate_mg_per_100g: VITAMINS_COL.pantothenate,
    biotin_ug_per_100g: VITAMINS_COL.biotin,
    vitamin_c_mg_per_100g: VITAMINS_COL.vitaminC,
  });

  const foods: Record<string, unknown>[] = [];
  let skippedExcluded = 0;
  let skippedIncomplete = 0;

  for (const row of proximatesRows) {
    const foodCode = row[PROXIMATES_COL.foodCode];
    const foodName = row[PROXIMATES_COL.foodName];
    if (!foodCode || !foodName) continue;

    const name = String(foodName).trim();
    if (EXCLUDED_NAME_PATTERN.test(name)) {
      skippedExcluded++;
      continue;
    }

    const protein = parseNumeric(row[PROXIMATES_COL.protein]);
    const fat = parseNumeric(row[PROXIMATES_COL.fat]);
    const carbs = parseNumeric(row[PROXIMATES_COL.carbohydrate]);
    const calories = parseNumeric(row[PROXIMATES_COL.energyKcal]);

    if (protein == null || fat == null || carbs == null || calories == null) {
      skippedIncomplete++;
      continue;
    }

    const code = String(foodCode).trim();
    foods.push({
      source: "cofid",
      external_id: code,
      name,
      calories_kcal_per_100g: calories,
      protein_g_per_100g: protein,
      carbs_g_per_100g: carbs,
      fat_g_per_100g: fat,
      fibre_g_per_100g: parseNumeric(row[PROXIMATES_COL.aoacFibre]),
      sugar_g_per_100g: parseNumeric(row[PROXIMATES_COL.totalSugars]),
      saturated_fat_g_per_100g: parseNumeric(row[PROXIMATES_COL.saturatedFat]),
      ...(inorganics.get(code) ?? {}),
      ...(vitamins.get(code) ?? {}),
    });
  }

  console.log(
    `Parsed ${foods.length} importable foods ` +
      `(${skippedExcluded} excluded by beef/pork name filter, ${skippedIncomplete} skipped for missing core macros).`
  );

  const supabase = getSupabaseServerClient();
  let inserted = 0;
  for (let i = 0; i < foods.length; i += INSERT_CHUNK_SIZE) {
    const chunk = foods.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from("foods").upsert(chunk, { onConflict: "source,external_id" });
    if (error) throw new Error(`Insert failed: ${error.message}`);
    inserted += chunk.length;
  }
  console.log(`Imported ${inserted} CoFID foods into the "foods" table.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
