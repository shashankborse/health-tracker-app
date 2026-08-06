export type WeightEntry = {
  id: string;
  entry_date: string; // YYYY-MM-DD
  weight_kg: number;
  body_fat_pct: number | null;
  note: string | null;
  created_at: string;
};
