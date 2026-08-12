// Phase 7: the repeated `rounded-2xl bg-card ... shadow-sm` wrapper div
// showed up identically in 35 files — at that many occurrences it's worth
// extracting, per this project's own "clean up duplication once it
// actually recurs" convention. Thin on purpose: no default padding, since
// callers vary (p-4 is common but not universal) — pass it via className.
export default function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`overflow-hidden rounded-[1.375rem] bg-card card-shadow ${className}`} style={style}>
      {children}
    </div>
  );
}
