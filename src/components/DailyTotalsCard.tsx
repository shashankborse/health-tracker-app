export type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
  saturatedFat: number;
  sodium: number;
};

export default function DailyTotalsCard({ totals }: { totals: DailyTotals }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        Today
      </p>
      <p className="mt-1 text-3xl font-bold">
        {Math.round(totals.calories)}{" "}
        <span className="text-base font-medium" style={{ color: "var(--muted)" }}>
          kcal
        </span>
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-base font-semibold">{Math.round(totals.protein)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Protein</p>
        </div>
        <div>
          <p className="text-base font-semibold">{Math.round(totals.carbs)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Carbs</p>
        </div>
        <div>
          <p className="text-base font-semibold">{Math.round(totals.fat)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Fat</p>
        </div>
        <div>
          <p className="text-base font-semibold">{Math.round(totals.fibre)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Fibre</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center" style={{ borderColor: "var(--border)" }}>
        <div>
          <p className="text-sm font-semibold">{Math.round(totals.sugar)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sugar</p>
        </div>
        <div>
          <p className="text-sm font-semibold">{Math.round(totals.saturatedFat)}g</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sat Fat</p>
        </div>
        <div>
          <p className="text-sm font-semibold">{Math.round(totals.sodium)}mg</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Sodium</p>
        </div>
      </div>
    </div>
  );
}
