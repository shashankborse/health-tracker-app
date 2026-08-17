// Apex's exact linear-bar recipe: thin rounded track + rounded fill,
// width set inline as a percent. Used ~7x on the Home dashboard alone
// (4 Recovery rows + 3 Fueling macros).
export default function MiniBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-[7px] w-full rounded-full" style={{ backgroundColor: "var(--surface-2)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
