import type { ReactNode } from 'react';

export function ReportFigure({
  caption,
  source,
  height = 280,
  children,
  fullBleed = false,
}: {
  caption?: ReactNode;
  source?: ReactNode;
  height?: number;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <figure className="my-4 break-inside-avoid">
      {caption && (
        <figcaption className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {caption}
        </figcaption>
      )}
      <div
        className={[
          'overflow-hidden border border-rule bg-paper print:bg-transparent',
          fullBleed ? '' : 'px-3 pt-3 pb-2',
        ].join(' ')}
        style={{ height }}
      >
        {children}
      </div>
      {source && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {source}
        </p>
      )}
    </figure>
  );
}
