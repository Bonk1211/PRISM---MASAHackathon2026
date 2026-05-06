import type { ReactNode } from 'react';

/**
 * A top-level numbered section in the printed report. Adds a print-page break
 * before the section, formal §-prefixed numbering, and an editorial hairline.
 */
export function ReportSection({
  number,
  title,
  eyebrow,
  children,
  breakBefore = true,
}: {
  number?: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  breakBefore?: boolean;
}) {
  const breakCls = breakBefore ? 'print:break-before-page' : '';
  return (
    <section className={`report-section ${breakCls} border-t border-rule pt-6 lg:pt-10`}>
      {eyebrow && (
        <p className="eyebrow text-muted">{eyebrow}</p>
      )}
      <h2 className="display mt-2 text-[26px] leading-[1.05] text-ink lg:text-[30px] print:text-[18pt]">
        {number && <span className="font-mono text-[12px] not-italic align-top mr-2 text-muted">§{number}</span>}
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-ink lg:text-[14px] print:text-[11pt]">
        {children}
      </div>
    </section>
  );
}

export function Subhead({ number, children }: { number?: string; children: ReactNode }) {
  return (
    <h3 className="mt-5 text-[14px] font-semibold tracking-tight text-ink lg:text-[15px] print:text-[12pt]">
      {number && <span className="font-mono text-[11px] mr-2 text-muted">§{number}</span>}
      {children}
    </h3>
  );
}

/**
 * Justified body paragraph used throughout the report. Mirrors a typeset
 * reinsurance memo — slightly tighter measure, optical hyphenation hint.
 */
export function P({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`max-w-prose font-serif text-[14px] leading-[1.65] text-ink text-justify hyphens-auto print:text-[11pt] ${className}`}
      style={{ hyphens: 'auto' }}
    >
      {children}
    </p>
  );
}
