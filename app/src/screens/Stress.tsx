import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AgentPanel } from '../components/AgentPanel';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { HEADLINE, PORTFOLIO, STRESS_2030 } from '../data/keyNumbers';
import { EvidenceModal } from '../components/EvidenceModal';
import { EVIDENCE_BY_ID } from '../data/evidence';

const COLOURS: Record<string, string> = {
  'Net Zero 2050':      '#3F8A66',
  'Mitigation':         '#0E7C86',
  'Delayed Transition': '#B8761C',
  'Current Policies':   '#8B2E1F',
};

const ALLOWED_SCENARIOS = STRESS_2030.map((s) => s.scenario);

export function Stress() {
  const [scenario, setScenario] = useState('Current Policies');
  const [elasticity, setElasticity] = useState(PORTFOLIO.elasticity);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);

  const applyAgentUpdates = (p: Record<string, unknown>) => {
    if (typeof p.scenario === 'string' && ALLOWED_SCENARIOS.includes(p.scenario)) {
      setScenario(p.scenario);
    }
    if (typeof p.elasticity === 'number') {
      setElasticity(Math.max(0.3, Math.min(1.2, p.elasticity)));
    }
  };

  const ref = STRESS_2030.find((s) => s.scenario === 'Current Policies')!;

  // Recompute LR + loss with the current elasticity slider.
  const live = useMemo(() => {
    const baseLR = PORTFOLIO.baseLossRatio;
    const baseEmis = ref.emissionsMt;
    return STRESS_2030.map((s) => {
      const pctChg = (s.emissionsMt - baseEmis) / baseEmis;
      const lr = baseLR * (1 + elasticity * pctChg);
      const loss = PORTFOLIO.gwpUsdM * lr;
      return { ...s, lr, lossUsdM: loss };
    });
  }, [elasticity, ref.emissionsMt]);

  const sel = live.find((s) => s.scenario === scenario)!;
  const ref2 = live.find((s) => s.scenario === 'Current Policies')!;
  const swing = ref2.lossUsdM - sel.lossUsdM;
  const lrSwingPp = (ref2.lr - sel.lr) * 100;

  // BNM CRST 2024 §6.3 capital implication — illustrative formula tied to LR delta vs base.
  const lrAboveBase = sel.lr - PORTFOLIO.baseLossRatio;
  const capitalAddPct = Math.max(0, Math.round(lrAboveBase * 100 * 0.7));

  const entry = evidenceId ? EVIDENCE_BY_ID[evidenceId] ?? null : null;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
    <div className="space-y-5">
      {/* Provenance banner — shows this screen reads pipeline outputs */}
      <section className="flex items-center justify-between border border-rule bg-paper/80 px-4 py-2.5">
        <div>
          <Eyebrow>Source · Pipeline /predict (cached)</Eyebrow>
          <p className="mt-0.5 font-mono text-[11px] tab-num text-ink/70">
            loss ratio = base × (1 + ε × Δemissions) · ε live below
          </p>
        </div>
        <Link
          to="/pipeline"
          className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
        >
          See pipeline →
        </Link>
      </section>

      <section className="border border-ink bg-ink px-5 py-6 text-paper lg:px-10 lg:py-10">
        <Eyebrow tone="paper">The wow moment · live recompute</Eyebrow>
        <h1 className="display mt-2 text-[36px] leading-[0.95] lg:text-[64px] lg:mt-4">
          One client portfolio.
          <br />
          <span className="italic">Four pathways to 2030.</span>
        </h1>
        <Hairline className="mt-4 border-paper/20 lg:mt-6" strong />
        <p className="mt-3 font-serif italic text-[14px] leading-relaxed text-paper/85 lg:text-[18px] lg:mt-5 lg:max-w-prose">
          NGFS Phase V — the de facto industry standard, cross-referenced in BNM CRST 2024. Pick a pathway, drag the elasticity, watch the loss ratio reprice.
        </p>
      </section>

      {/* Scenario chooser */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STRESS_2030.map((s) => {
          const isSel = scenario === s.scenario;
          return (
            <button
              key={s.scenario}
              onClick={() => setScenario(s.scenario)}
              aria-pressed={isSel}
              className={[
                'border px-4 py-3 text-left transition',
                isSel ? 'border-ink bg-paper' : 'border-rule bg-paper/60 hover:bg-paper',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2" style={{ background: COLOURS[s.scenario] }} />
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                  {s.family}
                </span>
              </div>
              <div className="mt-1 text-[14px] font-medium text-ink">{s.scenario}</div>
              <div className="mt-1 font-mono text-[11px] tab-num text-muted">
                {s.growth >= 0 ? '+' : ''}{(s.growth * 100).toFixed(1)}% p.a.
              </div>
            </button>
          );
        })}
      </div>

      {/* Hero numbers */}
      <section className="border border-rule bg-paper px-5 py-5 lg:px-8 lg:py-7">
        <div className="flex items-baseline justify-between">
          <Eyebrow>2030 reading · live</Eyebrow>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            ε = {elasticity.toFixed(2)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatBig
            value={`${(sel.lr * 100).toFixed(1)}%`}
            label="Loss ratio"
            accent={sel.scenario === 'Net Zero 2050' ? 'sage' : sel.scenario === 'Current Policies' ? 'rust' : 'amber'}
            size="lg"
          />
          <StatBig
            value={`USD ${Math.round(sel.lossUsdM)}m`}
            label="Expected loss"
            accent="ink"
            size="lg"
          />
          <button onClick={() => setEvidenceId('loss-swing')} className="evidence-tap text-left">
            <StatBig
              value={`${swing >= 0 ? '−' : '+'}USD ${Math.abs(Math.round(swing))}m`}
              label="Δ vs Hot House"
              accent="sea"
              size="lg"
              hint={`${lrSwingPp >= 0 ? '−' : '+'}${Math.abs(lrSwingPp).toFixed(1)} pp`}
            />
          </button>
        </div>

        {/* The elasticity slider — the wow moment */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <Eyebrow>Elasticity ε · drag me</Eyebrow>
            <button
              onClick={() => setEvidenceId('elasticity-07')}
              className="evidence-tap font-mono text-[10px] uppercase tracking-eyebrow text-muted"
            >
              source ↗
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted">0.30</span>
            <input
              type="range"
              min={0.3}
              max={1.2}
              step={0.05}
              value={elasticity}
              onChange={(e) => setElasticity(Number(e.target.value))}
              aria-label="Elasticity"
              aria-valuetext={`Elasticity ${elasticity.toFixed(2)}`}
              className="rule-slider"
            />
            <span className="font-mono text-[10px] text-muted">1.20</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="display tab-num text-[28px] italic text-ink">{elasticity.toFixed(2)}</span>
            <span className="text-[11px] text-muted pulse-mark">
              {elasticity < 0.5 ? 'Conservative' : elasticity < 0.85 ? 'Sigma 1/2024 base' : 'Stressed peril mix'}
            </span>
          </div>
        </div>

        {/* Capital implication tile */}
        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3 border-t border-rule pt-4">
          <div>
            <Eyebrow>Capital implication · BNM CRST 2024 §6.3</Eyebrow>
            <p className="mt-1.5 text-[13px] leading-snug text-ink">
              Hold an additional <span className="font-semibold">{capitalAddPct}%</span> regional risk-capital buffer under this scenario.
            </p>
          </div>
          <button onClick={() => setEvidenceId('capital-buffer-8')} className="evidence-tap">
            <StatBig
              value={`+${capitalAddPct}%`}
              label="Buffer"
              accent={capitalAddPct >= 8 ? 'rust' : capitalAddPct >= 4 ? 'amber' : 'sage'}
              size="md"
              align="right"
            />
          </button>
        </div>

        {/* Compare-to-baseline ribbon */}
        <div className="mt-4 border-t border-rule bg-sand px-3 py-2 text-center">
          <span className="font-mono text-[11px] uppercase tracking-eyebrow text-ink">
            Δ vs Hot House:&nbsp;
            <span className="font-semibold">
              {swing >= 0 ? '−' : '+'}USD {Math.abs(Math.round(swing))}m
            </span>
          </span>
        </div>
      </section>

      <Card title="2030 expected loss by scenario" subtitle={`GWP × base LR × (1 + ε × Δ emissions). ε live: ${elasticity.toFixed(2)}.`}>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={live} margin={{ top: 6, right: 12, left: -8, bottom: 32 }}>
              <XAxis dataKey="scenario" tickLine={false} axisLine={false} fontSize={9} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => `USD ${Math.round(Number(v))} m`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey="lossUsdM" radius={[2, 2, 0, 0]}>
                {live.map((s) => (
                  <Cell
                    key={s.scenario}
                    fill={COLOURS[s.scenario]}
                    fillOpacity={s.scenario === scenario ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Translation to capital" tone="sand">
        {(() => {
          const netZero = live.find((s) => s.scenario === 'Net Zero 2050')!;
          const mitig = live.find((s) => s.scenario === 'Mitigation')!;
          const headlinePp = ((ref2.lr - netZero.lr) * 100).toFixed(0);
          const mitigSwingUsdM = ref2.lossUsdM - mitig.lossUsdM;
          const fullSwing = ref2.lossUsdM - netZero.lossUsdM;
          const recoveryPct = ((mitigSwingUsdM / fullSwing) * 100).toFixed(0);
          return (
            <p className="font-serif text-[14px] italic leading-relaxed text-ink">
              The Hot House World scenario sits <b className="not-italic">{headlinePp} pp</b> above Net Zero 2050 in loss ratio
              ({(ref2.lr * 100).toFixed(0)}% vs {(netZero.lr * 100).toFixed(0)}%),
              implying a <b className="not-italic">USD {Math.round(fullSwing)} m</b> swing in expected loss at ε = {elasticity.toFixed(2)}.
              The proposed mitigation strategy recovers
              <b className="not-italic"> ~{recoveryPct} %</b> of that swing.
            </p>
          );
        })()}
      </Card>

      <p className="px-1 text-[11px] text-muted">
        Headline at base parameters: USD {HEADLINE.lossSwingUsdM} m / +{HEADLINE.lrSwingPp} pp. Slider above lets you stress-test ε directly.
      </p>

      <EvidenceModal entry={entry} onClose={() => setEvidenceId(null)} />
    </div>
    <AgentPanel
      screen="stress"
      currentState={{ scenario, elasticity, gwp_usdm: PORTFOLIO.gwpUsdM }}
      onUpdate={applyAgentUpdates}
    />
    </div>
  );
}
