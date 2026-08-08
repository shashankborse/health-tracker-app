// Standalone one-time import — run with `npm run import-cofid`.
// Downloads the official UK CoFID dataset (McCance & Widdowson's
// Composition of Foods Integrated Dataset, 2021) from gov.uk and imports
// its "1.3 Proximates" sheet (generic foods' macros) into the `foods`
// table as source='cofid'. Column layout confirmed directly against the
// real downloaded file, not guessed — see migration 0008 / Phase 4 plan.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { getSupabaseServerClient } from "../src/lib/supabaseServer";

const COFID_URL =
  "https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx";
const SHEET_NAME = "1.3 Proximates";

// Confirmed 0-based column indices from the real file's header row.
const COL = {
  foodCode: 0,
  foodName: 1,
  protein: 9,
  fat: 10,
  carbohydrate: 11,
  energyKcal: 12,
  aoacFibre: 25,
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

async function main() {
  console.log(`Downloading CoFID dataset from ${COFID_URL} ...`);
  const res = await fetch(COFID_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded ${buffer.length} bytes.`);

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in the downloaded file.`);
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const foods: Record<string, unknown>[] = [];
  let skippedExcluded = 0;
  let skippedIncomplete = 0;

  // First 3 rows are header variants (full name / short code / display name).
  for (const row of rows.slice(3)) {
    const foodCode = row[COL.foodCode];
    const foodName = row[COL.foodName];
    if (!foodCode || !foodName) continue;

    const name = String(foodName).trim();
    if (EXCLUDED_NAME_PATTERN.test(name)) {
      skippedExcluded++;
      continue;
    }

    const protein = parseNumeric(row[COL.protein]);
    const fat = parseNumeric(row[COL.fat]);
    const carbs = parseNumeric(row[COL.carbohydrate]);
    const calories = parseNumeric(row[COL.energyKcal]);
    const fibre = parseNumeric(row[COL.aoacFibre]);

    if (protein == null || fat == null || carbs == null || calories == null) {
      skippedIncomplete++;
      continue;
    }

    foods.push({
      source: "cofid",
      external_id: String(foodCode).trim(),
      name,
      calories_kcal_per_100g: calories,
      protein_g_per_100g: protein,
      carbs_g_per_100g: carbs,
      fat_g_per_100g: fat,
      fibre_g_per_100g: fibre,
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
