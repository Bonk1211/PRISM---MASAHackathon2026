import { useState } from 'react';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { SECTORS, SECTOR_RESIDUAL_PCT } from '../data/cedent';

const COUNTRIES = Object.keys(SECTOR_RESIDUAL_PCT);

function cellTone(v: number): string {
  if (v <= -25) return 'rgba(63, 138, 102, 0.45)';
  if (v < 25) return 'rgba(244, 239, 227, 0.30)';
  if (v < 75) return 'rgba(184, 118, 28, 0.30)';
  if (v < 150) return 'rgba(184, 118, 28, 0.55)';
  if (v < 300) return 'rgba(139, 46, 31, 0.65)';
  return 'rgba(139, 46, 31, 0.90)';
}
function textTone(v: number): string {
  return Math.abs(v) >= 100 ? '#FAF7EE' : '#0A1A2A';
}

export function Sectoral() {
  const [hot, setHot] = useState(false);
  const [active, setActive] = useState<{ country: string; sector: string; v: number } | null>(null);

  const cellSize = 'h-9';

  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Sectoral STIRPAT · residual %</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Vietnam&apos;s +24 % is really a
          <span className="italic"> +280 % power-sector </span>
          story.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink">
          Residual = actual minus what scale + structure predict, expressed in percent. Red = over-emits; green = under-emits.
        </p>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12px] text-ink">
            <input
              type="checkbox"
              checked={hot}
              onChange={(e) => setHot(e.target.checked)}
              className="h-4 w-4 accent-rust"
            />
            <span>Highlight hot cells (&gt; +150 %)</span>
          </label>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            10 × 8 cells
          </span>
        </div>
      </section>

      {/* Heatmap */}
      <section className="border border-rule bg-paper p-3">
        <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[110px_repeat(8,minmax(60px,1fr))] gap-px bg-rule">
              <div className="bg-paper" />
              {SECTORS.map((s) => (
                <div
                  key={s}
                  className="bg-paper px-1 py-2 text-center text-[9px] uppercase tracking-eyebrow text-muted"
                >
                  {abbreviate(s)}
                </div>
              ))}
              {COUNTRIES.map((c) => (
                <Row
                  key={c}
                  country={c}
                  hot={hot}
                  cellSize={cellSize}
                  onPick={(sector, v) => setActive({ country: c, sector, v })}
                  active={active}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {active && (
        <section className="border border-rule bg-sand px-5 py-5">
          <Eyebrow>Drill-down</Eyebrow>
          <h2 className="display mt-2 text-[24px] leading-[1.05] text-ink">
            {active.country} · <span className="italic">{active.sector}</span>
          </h2>
          <Hairline className="mt-3" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatBig
              value={`${active.v >= 0 ? '+' : ''}${active.v}%`}
              label="Residual vs STIRPAT"
              accent={active.v >= 150 ? 'rust' : active.v >= 25 ? 'amber' : 'sage'}
              size="md"
            />
            <StatBig
              value={active.v >= 150 ? 'Hot' : active.v >= 25 ? 'Warm' : active.v <= -25 ? 'Cool' : 'Aligned'}
              label="Underwriting flag"
              accent="ink"
              size="md"
            />
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Tap a different cell or close drill-down by tapping the same cell.
          </p>
        </section>
      )}

      <Card title="The four hot cells" tone="ink">
        <ul className="space-y-2 text-[14px]">
          <Hot c="Vietnam" s="Power Industry" v={280} />
          <Hot c="Vietnam" s="Industrial Combustion" v={276} />
          <Hot c="Lao PDR" s="Power Industry" v={781} />
          <Hot c="Brunei Darussalam" s="Fugitive Energy" v={4205} />
        </ul>
      </Card>
    </div>
  );
}

function abbreviate(s: string) {
  const map: Record<string, string> = {
    'Power Industry': 'Power',
    'Industrial Combustion': 'Ind.Comb',
    'Industrial Processes': 'Ind.Proc',
    'Transport': 'Transp',
    'Agriculture': 'Agric',
    'Buildings': 'Bldgs',
    'Waste': 'Waste',
    'Fugitive Energy': 'Fugit',
  };
  return map[s] ?? s;
}

function Row({
  country, hot, cellSize, onPick, active,
}: {
  country: string;
  hot: boolean;
  cellSize: string;
  onPick: (sector: string, v: number) => void;
  active: { country: string; sector: string; v: number } | null;
}) {
  const row = SECTOR_RESIDUAL_PCT[country] ?? {};
  return (
    <>
      <div className="bg-paper px-2 py-2 text-[11px] font-medium text-ink whitespace-nowrap">
        {country}
      </div>
      {SECTORS.map((s) => {
        const v = row[s] ?? 0;
        const dim = hot && v < 150;
        const isActive = active && active.country === country && active.sector === s;
        return (
          <button
            key={s}
            onClick={() => onPick(s, v)}
            className={[
              'relative grid place-items-center transition',
              cellSize,
              dim ? 'opacity-25' : 'opacity-100',
              isActive ? 'ring-2 ring-ink ring-offset-1 ring-offset-paper z-10' : '',
            ].join(' ')}
            style={{ background: cellTone(v), color: textTone(v) }}
          >
            <span className="font-mono text-[11px] tab-num font-medium">
              {v >= 0 ? '+' : ''}{v}
            </span>
          </button>
        );
      })}
    </>
  );
}

function Hot({ c, s, v }: { c: string; s: string; v: number }) {
  return (
    <li className="flex items-baseline justify-between border-b border-paper/15 pb-1.5 last:border-0 last:pb-0">
      <span>
        <span className="font-medium">{c}</span>
        <span className="text-paper/60"> · </span>
        <span className="italic">{s}</span>
      </span>
      <span className="display tab-num text-[24px] text-amber italic">+{v}%</span>
    </li>
  );
}
