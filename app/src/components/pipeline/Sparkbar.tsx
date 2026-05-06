/**
 * Sparkbar — tiny histogram of recent latency samples. No deps.
 * Renders ascending bars on the right (most recent), used in Stage 03 to
 * surface API responsiveness over the last N predict calls.
 */
export function Sparkbar({
  values,
  max,
  className = '',
}: {
  values: number[];
  max?: number;
  className?: string;
}) {
  if (values.length === 0) {
    return (
      <div className={`flex h-6 items-end gap-[2px] ${className}`} aria-hidden="true">
        <span className="font-mono text-[9px] text-muted">no samples</span>
      </div>
    );
  }
  const peak = Math.max(max ?? 0, ...values, 1);
  return (
    <div
      className={`flex h-6 items-end gap-[2px] ${className}`}
      role="img"
      aria-label={`Latency sparkline · ${values.length} samples · peak ${peak.toFixed(1)} ms`}
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.round((v / peak) * 22));
        const isLast = i === values.length - 1;
        return (
          <span
            key={i}
            className={isLast ? 'bg-sea' : 'bg-ink/35'}
            style={{ height: `${h}px`, width: '4px', display: 'inline-block' }}
          />
        );
      })}
    </div>
  );
}
