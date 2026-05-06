import { useState, type ReactNode } from 'react';
import { Eyebrow, Hairline } from '../Card';
import { StatusDot } from './StatusDot';

export type Accent = 'ink' | 'sea' | 'rust' | 'amber' | 'sage';

const ACCENT_BAR: Record<Accent, string> = {
  ink:   'bg-ink',
  sea:   'bg-sea',
  rust:  'bg-rust',
  amber: 'bg-amber',
  sage:  'bg-sage',
};

const ACCENT_TEXT: Record<Accent, string> = {
  ink:   'text-ink',
  sea:   'text-sea',
  rust:  'text-rust',
  amber: 'text-amber',
  sage:  'text-sage',
};

/**
 * StageCard — one node in the pipeline flow diagram.
 *
 *   ┌────────────────────────────────┐
 *   │ ▍ 01 · Title          [● fresh]│
 *   │   subtitle                     │
 *   │   ───                          │
 *   │   <hero>  big animated number  │
 *   │   ───                          │
 *   │   [▼ details]   [inspect →]    │
 *   │   <details when expanded>      │
 *   └────────────────────────────────┘
 */
export function StageCard({
  code,
  title,
  subtitle,
  accent,
  hero,
  fresh,
  onInspect,
  details,
  defaultOpen = false,
  className = '',
}: {
  code: string;
  title: string;
  subtitle?: ReactNode;
  accent: Accent;
  hero: ReactNode;
  fresh: boolean;
  onInspect?: () => void;
  details?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={[
        'relative flex flex-col border border-rule bg-paper transition',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
        `before:${ACCENT_BAR[accent]}`,
        className,
      ].join(' ')}
    >
      {/* Solid accent bar — explicit so Tailwind JIT picks it up */}
      <span
        aria-hidden="true"
        className={['absolute left-0 top-0 h-full w-[3px]', ACCENT_BAR[accent]].join(' ')}
      />

      <header className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 lg:px-5 lg:pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={['font-mono text-[10px] font-semibold tracking-eyebrow', ACCENT_TEXT[accent]].join(' ')}>
              {code}
            </span>
            <Eyebrow>Stage</Eyebrow>
          </div>
          <h3 className="display mt-0.5 text-[16px] leading-tight text-ink lg:text-[18px]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-[10px] text-muted lg:text-[11px]">
              {subtitle}
            </p>
          )}
        </div>
        <StatusDot fresh={fresh} />
      </header>

      <Hairline />

      <div className="flex-1 px-4 py-3 lg:px-5 lg:py-4">{hero}</div>

      {(details || onInspect) && (
        <>
          <Hairline />
          <footer className="flex items-center justify-between px-4 py-2 lg:px-5">
            {details ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`stage-${code}-details`}
                onClick={() => setOpen((o) => !o)}
                className="font-mono text-[10px] uppercase tracking-eyebrow text-ink hover:text-sea"
              >
                <span aria-hidden="true">{open ? '▾' : '▸'}</span>{' '}
                {open ? 'hide detail' : 'show detail'}
              </button>
            ) : (
              <span />
            )}
            {onInspect && (
              <button
                type="button"
                onClick={onInspect}
                aria-label={`Inspect stage ${code}: ${title}`}
                className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
              >
                inspect <span aria-hidden="true">→</span>
              </button>
            )}
          </footer>
          {open && details && (
            <div
              id={`stage-${code}-details`}
              className="border-t border-rule bg-sand/40 px-4 py-3 lg:px-5"
            >
              {details}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Connector — directional flow line between two cards.
 * Horizontal on lg+ (line + chevron), vertical on small (down arrow).
 */
export function Connector() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center py-2 lg:py-0 lg:px-1"
    >
      {/* Mobile: vertical line + chevron */}
      <div className="flex flex-col items-center lg:hidden">
        <span className="block h-4 w-[1px] bg-ink/30" />
        <span className="font-mono text-[12px] leading-none text-ink/60">▼</span>
      </div>
      {/* Desktop: horizontal line + chevron */}
      <div className="hidden items-center lg:flex">
        <span className="block h-[1px] w-6 bg-ink/30" />
        <span className="font-mono text-[12px] leading-none text-ink/60">▶</span>
      </div>
    </div>
  );
}
