import { getSupabaseServerClient } from "./supabaseServer";
import { getValidDriveAccessToken, getOrCreateFolder, uploadFileToDrive } from "./googleDrive";

export const BACKUP_ROOT_FOLDER = "Health Tracker Backups";

// Every table in the schema, in FK-dependency-safe order (parents before
// children) so the restore script can insert in this same order against a
// fresh database. `pk` is the column used to page through rows in a stable
// order — id for uuid-keyed tables, entry_date for the date-keyed daily
// rollup tables.
export const BACKUP_TABLES: { name: string; pk: string }[] = [
  { name: "exercises", pk: "id" },
  { name: "plan_days", pk: "id" },
  { name: "plan_exercises", pk: "id" },
  { name: "workout_sessions", pk: "id" },
  { name: "exercise_logs", pk: "id" },
  { name: "run_logs", pk: "id" },
  { name: "weight_entries", pk: "id" },
  { name: "google_health_connection", pk: "id" },
  { name: "daily_steps", pk: "entry_date" },
  { name: "daily_resting_heart_rate", pk: "entry_date" },
  { name: "daily_hrv", pk: "entry_date" },
  { name: "daily_respiratory_rate", pk: "entry_date" },
  { name: "daily_skin_temperature", pk: "entry_date" },
  { name: "daily_spo2", pk: "entry_date" },
  { name: "sleep_sessions", pk: "id" },
  { name: "weekly_measurements", pk: "id" },
  { name: "progress_photos", pk: "id" },
  { name: "exercise_recordings", pk: "id" },
  { name: "backup_runs", pk: "id" },
  { name: "google_drive_connection", pk: "id" },
];

const PAGE_SIZE = 1000;

/** Fetches every row of a table, paging past Supabase's default 1000-row cap. */
async function fetchAllRows(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  table: string,
  pk: string
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(pk, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Reading ${table} failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

export type BackupResult = {
  runDate: string;
  driveFolderLink: string;
  tablesExported: { table: string; rowCount: number }[];
};

/** Exports every table to one JSON file per table in a dated Drive folder. */
export async function runBackup(): Promise<BackupResult> {
  const supabase = getSupabaseServerClient();
  const runDate = new Date().toISOString().slice(0, 10);
  const tablesExported: { table: string; rowCount: number }[] = [];

  try {
    const accessToken = await getValidDriveAccessToken();
    const rootFolder = await getOrCreateFolder(accessToken, BACKUP_ROOT_FOLDER);
    const dateFolder = await getOrCreateFolder(accessToken, runDate, rootFolder);

    for (const { name, pk } of BACKUP_TABLES) {
      const rows = await fetchAllRows(supabase, name, pk);
      await uploadFileToDrive({
        accessToken,
        folderId: dateFolder,
        filename: `${name}.json`,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(rows), "utf-8"),
      });
      tablesExported.push({ table: name, rowCount: rows.length });
    }

    const driveFolderLink = `https://drive.google.com/drive/folders/${dateFolder}`;
    await supabase.from("backup_runs").insert({
      run_date: runDate,
      drive_folder_link: driveFolderLink,
      tables_exported: tablesExported,
      status: "success",
    });

    return { runDate, driveFolderLink, tablesExported };
  } catch (error) {
    await supabase.from("backup_runs").insert({
      run_date: runDate,
      tables_exported: tablesExported,
      status: "failed",
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
