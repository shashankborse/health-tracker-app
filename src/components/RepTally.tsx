"use client";

export default function RepTally({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--muted) 15%, transparent)" }}
          aria-label="Remove a rep"
        >
          −
        </button>
        <span className="w-12 text-center text-3xl font-bold tabular-nums">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ backgroundColor: "var(--accent)" }}
          aria-label="Add a rep"
        >
          +
        </button>
      </div>
    </div>
  );
}
