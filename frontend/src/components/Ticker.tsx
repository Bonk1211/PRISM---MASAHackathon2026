// Reinsurance-grade monogram ticker. Replaces decorative emoji icons.

export function Ticker({ code, tone = 'ink', size = 'md' }: { code: string; tone?: 'ink' | 'paper' | 'sage' | 'rust' | 'amber' | 'sea'; size?: 'sm' | 'md' | 'lg' }) {
  const toneCls = {
    ink:   'border-ink bg-ink text-paper',
    paper: 'border-rule bg-paper text-ink',
    sage:  'border-sage/60 bg-sage/12 text-sage',
    rust:  'border-rust/60 bg-rust/12 text-rust',
    amber: 'border-amber/60 bg-amber/12 text-amber',
    sea:   'border-sea/60 bg-sea/10 text-sea',
  }[tone];
  const sizeCls = {
    sm: 'h-7 w-9 text-[10px]',
    md: 'h-9 w-12 text-[11px]',
    lg: 'h-12 w-16 text-[13px]',
  }[size];
  return (
    <span
      aria-hidden="true"
      className={[
        'inline-grid place-items-center border font-mono font-semibold uppercase tracking-eyebrow',
        toneCls, sizeCls,
      ].join(' ')}
    >
      {code}
    </span>
  );
}
