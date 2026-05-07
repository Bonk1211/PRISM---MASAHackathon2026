// Box-selection card shell for the Pricing simulator inputs.
// Each card has a numbered tag, title, optional subtitle, and a content slot.
// Optional `complete` flag changes the left accent bar to sage to signal the
// underwriter that this section has all required inputs.

import type { ReactNode } from 'react';
import { Eyebrow, Hairline } from '../Card';

export function InputCard({
  step,
  title,
  subtitle,
  complete,
  children,
}: {
  step: string;
  title: string;
  subtitle?: string;
  complete?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        'relative flex flex-col border border-rule bg-paper px-5 py-5 transition',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
        complete ? 'before:bg-sage' : 'before:bg-ink/30',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>{step}</Eyebrow>
        {complete && (
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-sage">
            ready
          </span>
        )}
      </div>
      <h2 className="mt-1 text-[15px] font-semibold leading-tight text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-[11px] leading-snug text-muted">{subtitle}</p>}
      <Hairline className="mt-3" />
      <div className="mt-3 flex-1">{children}</div>
    </section>
  );
}
