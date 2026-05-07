/**
 * StatusDot — small circular indicator. Green pulses for ~1 s after a fresh
 * value lands; otherwise grey idle. Visual feedback that the pipeline is
 * recomputing in response to control changes.
 */
export function StatusDot({ fresh, label }: { fresh: boolean; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label ?? (fresh ? 'updated' : 'idle')}
      className="inline-flex items-center gap-1.5"
    >
      <span
        aria-hidden="true"
        className={[
          'inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300',
          fresh ? 'bg-sage shadow-[0_0_0_3px_rgba(122,143,108,0.18)]' : 'bg-ink/25',
        ].join(' ')}
      />
      {label && (
        <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          {label}
        </span>
      )}
    </span>
  );
}
