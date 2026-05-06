import type { ReactNode } from 'react';

export function ReportTable({
  caption,
  source,
  headers,
  rows,
  align,
}: {
  caption?: ReactNode;
  source?: ReactNode;
  headers: string[];
  rows: ReactNode[][];
  align?: ('left' | 'right' | 'center')[];
}) {
  const alignFor = (i: number) => align?.[i] ?? (i === 0 ? 'left' : 'right');
  const alignCls = (a: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  return (
    <figure className="my-4 break-inside-avoid">
      {caption && (
        <figcaption className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {caption}
        </figcaption>
      )}
      <div className="overflow-x-auto border border-rule">
        <table className="w-full border-collapse text-[12px] tab-num print:text-[10pt]">
          <thead className="border-b border-rule bg-bone/40 print:bg-transparent">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-eyebrow text-muted ${alignCls(alignFor(i))}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t border-rule/60">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2 ${alignCls(alignFor(ci))} ${ci === 0 ? 'text-ink' : 'text-ink'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {source && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {source}
        </p>
      )}
    </figure>
  );
}
