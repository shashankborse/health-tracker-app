// Standalone restore script — run with `npm run restore -- --date=YYYY-MM-DD [--target=test|real] [--force]`.
// Rebuilds every table from a dated Drive backup (see src/lib/backup.ts).
// `--target` defaults to "test" (writes into `<table>_restore_test` shadow
// tables, migration 0007) so the common case can never touch real data.
// `--target=real` requires being typed explicitly and refuses to run
// against a non-empty destination table unless `--force` is also passed.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  getValidDriveAccessToken,
  findFolder,
  listFilesInFolder,
  downloadFileFromDrive,
} from "../src/lib/googleDrive";
import { getSupabaseServerClient } from "../src/lib/supabaseServer";
import { BACKUP_TABLES, BACKUP_ROOT_FOLDER } from "../src/lib/backup";

const INSERT_CHUNK_SIZE = 500;

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    })
  );
  if (!args.date) {
    throw new Error("Usage: npm run restore -- --date=YYYY-MM-DD [--target=test|real] [--force]");
  }
  if (args.target && args.target !== "test" && args.target !== "real") {
    throw new Error(`--target must be "test" or "real", got "${args.target}"`);
  }
  return {
    date: args.date as string,
    target: (args.target as "test" | "real") ?? "test",
    force: args.force === "true",
  };
}

async function main() {
  const { date, target, force } = parseArgs();
  const supabase = getSupabaseServerClient();
  const accessToken = await getValidDriveAccessToken();

  const rootFolder = await findFolder(accessToken, BACKUP_ROOT_FOLDER);
  if (!rootFolder) throw new Error(`No "${BACKUP_ROOT_FOLDER}" folder found in Drive.`);
  const dateFolder = await findFolder(accessToken, date, rootFolder);
  if (!dateFolder) throw new Error(`No backup found for ${date}.`);

  const files = await listFilesInFolder(accessToken, dateFolder);
  const summary: { table: string; rowCount: number }[] = [];

  for (const { name: table, pk } of BACKUP_TABLES) {
    const file = files.find((f) => f.name === `${table}.json`);
    if (!file) throw new Error(`Missing ${table}.json in the ${date} backup.`);

    const buffer = await downloadFileFromDrive(accessToken, file.id);
    const rows = JSON.parse(buffer.toString("utf-8"));
    const destination = target === "test" ? `${table}_restore_test` : table;

    if (target === "real" && !force) {
      const { count, error } = await supabase
        .from(destination)
        .select("*", { count: "exact", head: true });
      if (error) throw new Error(`Checking ${destination} failed: ${error.message}`);
      if ((count ?? 0) > 0) {
        throw new Error(
          `Refusing to restore into "${destination}": it already has ${count} row(s). Pass --force to override.`
        );
      }
    }

    if (target === "test") {
      // Makes a re-run of the same date idempotent rather than duplicating
      // rows — `_restore_test` tables intentionally carry no unique
      // constraints (see migration 0007), so this is the only guard.
      const { error } = await supabase.from(destination).delete().not(pk, "is", null);
      if (error) throw new Error(`Clearing ${destination} failed: ${error.message}`);
    }

    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
      const { error } = await supabase.from(destination).insert(chunk);
      if (error) throw new Error(`Inserting into ${destination} failed: ${error.message}`);
    }

    summary.push({ table: destination, rowCount: rows.length });
  }

  console.log(`Restored ${date} (target=${target}):`);
  for (const { table, rowCount } of summary) {
    console.log(`  ${table}: ${rowCount} row(s)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
