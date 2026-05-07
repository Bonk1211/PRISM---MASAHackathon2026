import { useState } from 'react';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import canon from '../data/key_numbers_python.json';

type ViewMode = 'both' | 'pairwise' | 'partial';

const PRETTY: Record<string, string> = {
  CO2_intensity_GDP:    'CO₂ intensity / GDP',
  forest_area_pct:      'Forest area %',
  energy_use_pc:        'Energy use / capita',
  industry_pct_GDP:     'Industry % GDP',
  agri_land_pct:        'Agriculture land %',
  urban_pop_pct:        'Urban pop %',
  renewable_energy_pct: 'Renewable energy %',
};

const FLIP_NOTE: Record<string, string> = {
  forest_area_pct:  'Forest-rich SEA economies emit MORE than predicted — LULUCF channel hidden by pairwise.',
  energy_use_pc:    'Singapore (low intensity, high emissions per scale) confounds the unconditional view.',
  industry_pct_GDP: 'Industry-heavy economies emit more per unit of scale, as theory predicts.',
};

export function Diagnostic() {
  const [view, setView] = useState<ViewMode>('both');
  const [active, setActive] = useState<string | null>(null);

  const rows = [...canon.partial_correlations].sort(
    (a, b) => Math.abs(b.partial_r) - Math.abs(a.partial_r),
  );
  const flipped = rows.filter((r) => r.flag === 'SIGN-FLIP');

  return (
    <div className="space-y-5">
      <section className="border border-ink bg-ink px-5 py-6 text-paper lg:px-10 lg:py-10">
        <Eyebrow tone="paper">Methodological differentiator · §3.2</Eyebrow>
        <h1 className="display mt-2 text-[40px] leading-[0.95] lg:text-[64px]">
          <span className="display tab-num text-[88px] italic text-amber leading-none mr-3 align-baseline lg:text-[140px]">
            {flipped.length}
          </span>
          indicators flip <span className="italic">sign</span> once scale is controlled.
        </h1>
        <Hairline className="mt-5 border-paper/20" strong />
        <p className="mt-4 font-serif italic text-[15px] leading-relaxed text-paper/85 lg:text-[18px] lg:max-w-prose">
          Pairwise correlation is the unconditional view. Partial correlation removes log-GDP and log-population first — the structural lever surfaces. No competing team will show this side-by-side.
        </p>
      </section>

      <div className="flex items-center gap-2">
        <Eyebrow>View</Eyebrow>
        <div className="flex border border-rule">
          {(['both', 'pairwise', 'partial'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setView(m)}
              aria-pressed={view === m}
              className={[
                'min-h-[34px] px-3 text-[11px] font-medium uppercase tracking-eyebrow transition',
                view === m ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/5',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <section className="border border-rule bg-paper px-5 py-5 lg:px-8 lg:py-7">
        <Eyebrow>Correlation with log-GHG · 1990–2023</Eyebrow>
        <Hairline className="mt-3" />

        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <FeatureBar
              key={r.feature}
              feature={r.feature}
              pretty={PRETTY[r.feature] ?? r.feature}
              pairwise={r.pairwise_r}
              partial={r.partial_r}
              flip={r.flag === 'SIGN-FLIP'}
              view={view}
              active={active === r.feature}
              onClick={() => setActive(active === r.feature ? null : r.feature)}
            />
          ))}
        </ul>

        <Hairline className="mt-5" />
        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <Legend dot="#0E7C86" label="Pairwise r" />
          <Legend dot="#8B2E1F" label="Partial r" />
          <Legend dot="#B8761C" label="Sign-flip" outline />
        </div>
      </section>

      {/* Drill-down for active row */}
      {active && (
        <section className="border border-rule bg-sand px-5 py-5">
          <Eyebrow>Drill-down · {PRETTY[active] ?? active}</Eyebrow>
          {(() => {
            const r = rows.find((x) => x.feature === active)!;
            return (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatBig
                    value={fmt(r.pairwise_r)}
                    label="Pairwise r"
                    accent="sea"
                    size="md"
                  />
                  <StatBig
                    value={fmt(r.partial_r)}
                    label="Partial r"
                    accent={r.flag === 'SIGN-FLIP' ? 'rust' : 'ink'}
                    size="md"
                  />
                </div>
                <Hairline className="mt-4" />
                <p className="mt-3 font-serif italic text-[14px] leading-relaxed text-ink">
                  {FLIP_NOTE[active] ?? 'Partial correlation removes log-GDP and log-population. The remaining association is the structural lever insurers can underwrite against.'}
                </p>
              </>
            );
          })()}
        </section>
      )}

      <Card title="Why this matters for underwriting" tone="paper">
        <p className="text-[13px] leading-relaxed text-ink">
          A naïve correlation says forest-rich economies pollute less. The partial says the opposite — once we control for the size of the economy. That distinction prices a Lao PDR or a Brunei correctly.
        </p>
      </Card>
    </div>
  );
}

function fmt(v: number) {
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

function FeatureBar({
  pretty, pairwise, partial, flip, view, active, onClick,
}: {
  feature: string;
  pretty: string;
  pairwise: number;
  partial: number;
  flip: boolean;
  view: ViewMode;
  active: boolean;
  onClick: () => void;
}) {
  const SCALE = 1; // r ∈ [-1, 1]
  const half = 50; // % from center
  const showPair = view !== 'partial';
  const showPart = view !== 'pairwise';

  const barFor = (r: number, color: string) => {
    const pct = Math.min(100, Math.abs(r) / SCALE * half);
    const left = r >= 0 ? 50 : 50 - pct;
    return (
      <div
        className="absolute top-0 h-full"
        style={{ left: `${left}%`, width: `${pct}%`, background: color }}
      />
    );
  };

  return (
    <li>
      <button
        onClick={onClick}
        aria-pressed={active}
        className={[
          'block w-full text-left',
          active ? 'bg-ink/[0.03]' : '',
        ].join(' ')}
      >
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-ink">
            {pretty}
            {flip && (
              <span className="ml-2 inline-block border border-amber/50 bg-amber/10 px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-eyebrow text-amber">
                Sign-flip
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] tab-num text-muted">
            {showPair && <span className="text-sea">{fmt(pairwise)}</span>}
            {showPair && showPart && <span className="mx-1.5 text-rule">·</span>}
            {showPart && <span className="text-rust">{fmt(partial)}</span>}
          </span>
        </div>

        <div className="relative mt-2 h-4 border-t border-b border-rule">
          {/* center axis */}
          <div className="absolute left-1/2 top-0 h-full w-px bg-rule-strong" />
          {showPair && barFor(pairwise, 'rgba(14, 124, 134, 0.55)')}
          {showPart && (
            <div className={showPair ? 'absolute inset-0 mix-blend-multiply' : 'absolute inset-0'}>
              {barFor(partial, 'rgba(139, 46, 31, 0.85)')}
            </div>
          )}
        </div>

        <div className="mt-1 flex justify-between font-mono text-[9px] text-muted">
          <span>−1.0</span><span>0</span><span>+1.0</span>
        </div>
      </button>
    </li>
  );
}

function Legend({ dot, label, outline = false }: { dot: string; label: string; outline?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span
        className={['h-2.5 w-2.5', outline ? 'border' : ''].join(' ')}
        style={outline ? { borderColor: dot } : { background: dot }}
      />
      {label}
    </span>
  );
}
