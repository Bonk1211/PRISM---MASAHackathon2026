import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  ScatterChart, Scatter, ZAxis, ReferenceLine, Legend as RLegend,
} from 'recharts';
import { Eyebrow, Hairline } from '../components/Card';
import { CoverPage } from '../components/report/CoverPage';
import { ReportSection, Subhead, P } from '../components/report/ReportSection';
import { ReportTable } from '../components/report/ReportTable';
import { ReportFigure } from '../components/report/ReportFigure';
import {
  HEADLINE, PORTFOLIO, STRESS_2030, RECOMMENDATIONS, MAPE, FORECAST_2024,
} from '../data/keyNumbers';
import { POLICY_BY_ID, POLICY_REFS } from '../data/policy';
import { LOADING } from '../data/cedent';
import canon from '../data/key_numbers_python.json';

const SCENARIO_COLOURS: Record<string, string> = {
  'Net Zero 2050':      '#3F8A66',
  'Mitigation':         '#0E7C86',
  'Delayed Transition': '#B8761C',
  'Current Policies':   '#8B2E1F',
};

const TIER_BG: Record<string, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#8B2E1F', E: '#0A1A2A',
};

const PRETTY_FEATURE: Record<string, string> = {
  CO2_intensity_GDP:    'CO₂ intensity / GDP',
  forest_area_pct:      'Forest area %',
  energy_use_pc:        'Energy use / capita',
  industry_pct_GDP:     'Industry % GDP',
  agri_land_pct:        'Agri land %',
  urban_pop_pct:        'Urban pop %',
  renewable_energy_pct: 'Renewable energy %',
};

const STORAGE_KEY = 'prism.savedCedents.v1';
const REPORT_ID = 'RI-2026-001';

type SavedCedent = {
  name: string;
  country: string;
  comp: string;
  loading: number;
  savedAt: string;
};

export function Report() {
  const [saved, setSaved] = useState<SavedCedent[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSaved(parsed);
      }
    } catch (_) {
      // localStorage may be unavailable (private mode, SSR) — fall through to empty list
    }
  }, []);

  const tierTally = useMemo(() => {
    const order: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    return order.map((t) => ({
      tier: t,
      count: saved.filter((c) => c.comp === t).length,
      loadingPct: LOADING[t].pct,
    }));
  }, [saved]);

  const today = new Date().toISOString().slice(0, 10);
  const printPdf = () => window.print();
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (_) {}
  };
  const share = () => {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      nav.share({
        title: 'PRISM — SEA Climate-Risk Underwriting Review',
        text: `Hot House → Net Zero swing: USD ${HEADLINE.lossSwingUsdM} m / +${HEADLINE.lrSwingPp} pp`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  // Hot House baseline used for relative loss-swing column
  const hotHouseRow = STRESS_2030.find((s) => s.scenario.includes('Current Policies'));
  const hotHouseLoss = hotHouseRow?.lossUsdM ?? 744;

  return (
    <article className="report-root mx-auto max-w-canvas pb-20 print:max-w-none">
      {/* Inline print stylesheet — overrides body grain + tightens type for A4. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1in; }
          html, body { background: #fff !important; }
          body { color: #000 !important; }
          .report-root { color: #000; }
          .report-root section,
          .report-root h1,
          .report-root h2,
          .report-root h3,
          .report-root p,
          .report-root td,
          .report-root th,
          .report-root li {
            color: #000 !important;
          }
          .report-root .border, .report-root .border-t, .report-root .border-b {
            border-color: #000 !important;
          }
          .report-root .bg-paper, .report-root .bg-bone\\/40 { background: transparent !important; }
          .report-cover { min-height: calc(100vh - 2in) !important; }
          .report-section { page-break-before: always; break-before: page; }
          h1.display { font-size: 24pt !important; line-height: 1.05 !important; }
          h2.display { font-size: 18pt !important; }
          h3 { font-size: 12pt !important; }
          p, td, th, li { font-size: 11pt !important; line-height: 1.55 !important; }
          .print\\:hidden { display: none !important; }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
        .report-root p { hyphens: auto; }
      `}</style>

      {/* Toolbar — never prints. */}
      <div className="print:hidden sticky top-0 z-10 -mx-2 mb-4 flex items-center justify-between border-b border-rule bg-bone/95 px-4 py-3 backdrop-blur lg:mx-0">
        <div>
          <Eyebrow>Professional Assessment Report</Eyebrow>
          <p className="mt-0.5 font-mono text-[10px] tab-num text-muted">
            {REPORT_ID} · {today} · v1.0
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={share}
            className="border border-rule bg-paper px-3 py-2 text-[11px] font-medium text-ink transition hover:bg-ink hover:text-paper"
          >
            Share
          </button>
          <button
            onClick={copyLink}
            className="border border-rule bg-paper px-3 py-2 text-[11px] font-medium text-ink transition hover:bg-ink hover:text-paper"
          >
            Copy link
          </button>
          <button
            onClick={printPdf}
            className="border border-ink bg-ink px-4 py-2 text-[11px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
          >
            Print PDF →
          </button>
        </div>
      </div>

      {/* §0 Cover */}
      <CoverPage reportId={REPORT_ID} date={today} client="Hannover Re APAC" />

      {/* §1 Document control */}
      <ReportSection eyebrow="Front matter" title="Document Control" number="1">
        <P>
          This assessment is the principal deliverable of the PRISM engagement under the MASA Hackathon
          2026 Strategic Partner programme with Hannover Re. It compiles the analytical pipeline, the
          stress-test exhibit, the cedent-screening artefacts, and the regulatory crosswalk into a single
          underwriting record. Every numerical claim is traceable to the canonical pipeline output
          (<span className="font-mono">key_numbers_python.json</span>) — refer to Appendix A for the full
          provenance map.
        </P>
        <ReportTable
          headers={['Field', 'Value']}
          align={['left', 'left']}
          rows={[
            ['Report identifier', <span className="font-mono">{REPORT_ID}</span>],
            ['Version', '1.0'],
            ['Date of issue', today],
            ['Prepared by', 'PRISM Analytics — MASA Hackathon 2026'],
            ['Reviewed by', 'Climate Quant Desk · APAC'],
            ['Approved by', 'APAC Chief Risk Officer'],
            ['Distribution', 'Hannover Re APAC P&C Underwriting · Group Capital · ILS Treasury'],
            ['Classification', <span className="text-rust">Confidential — Internal Use Only</span>],
            [
              'Pipeline source',
              <span className="font-mono text-[11px]">analysis/python/analysis.ipynb · seed 2026</span>,
            ],
            [
              'Canonical numbers',
              <span className="font-mono text-[11px]">exhibits/results/key_numbers_python.json</span>,
            ],
          ]}
        />
      </ReportSection>

      {/* §2 Executive summary */}
      <ReportSection eyebrow="Executive briefing" title="Executive Summary" number="2">
        <P>
          The PRISM engagement quantifies how four NGFS Phase V transition pathways re-price
          Hannover Re's notional <b>USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</b> South-East Asia gross
          written premium book on a 2030 horizon. Holding the base loss ratio at <b>{(PORTFOLIO.baseLossRatio * 100).toFixed(0)} %</b> and
          applying the Swiss Re <i>sigma</i> 1/2024 emissions-loss elasticity (<span className="font-mono">ε = {PORTFOLIO.elasticity}</span>),
          the spread between the Net Zero 2050 and the Hot House World pathway is <b>USD {HEADLINE.lossSwingUsdM} m</b> of
          expected loss — a <b>{HEADLINE.lrSwingPp} pp</b> loss-ratio swing. The 2024 hold-out MAPE on the panel
          XGBoost autoregressive forecast is <b>{HEADLINE.mapeXGBPct} %</b>.
        </P>
        <P>
          The exposure does not concentrate in country residuals alone. Vietnam's aggregate STIRPAT
          residual of +24 % decomposes into a <b>+280 % Power Industry residual</b> and <b>+276 % Industrial
          Combustion residual</b> — material under-pricing risk for any cedent with a thermal-power-heavy
          treaty book. The Philippines under-emits at the country level (residual −49 %) but anchors the
          larger insured-asset base, with insurance penetration 1.7 % of GDP and a protection gap of 85 %.
        </P>

        <ReportFigure
          caption={`Figure 2.1 · 2030 expected loss · 4 NGFS Phase V pathways · ε = ${PORTFOLIO.elasticity}`}
          source="Source: stress_test_2030_aggregate · GWP × baseLR × (1 + ε × Δemissions)"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STRESS_2030} margin={{ top: 24, right: 24, left: 8, bottom: 12 }}>
              <XAxis
                dataKey="scenario"
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.2)' }}
                fontSize={10}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={62}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={62}
                tickFormatter={(v) => `USD ${(v / 1000).toFixed(1)}b`}
              />
              <Tooltip
                formatter={(v) => [`USD ${Math.round(Number(v))}m`, 'Expected loss']}
                cursor={{ fill: 'rgba(10,26,42,0.04)' }}
              />
              <ReferenceLine
                y={PORTFOLIO.gwpUsdM * PORTFOLIO.baseLossRatio}
                stroke="rgba(10,26,42,0.45)"
                strokeDasharray="3 3"
                label={{
                  value: `Base · USD ${Math.round(PORTFOLIO.gwpUsdM * PORTFOLIO.baseLossRatio)}m`,
                  fontSize: 9,
                  fill: 'rgba(10,26,42,0.7)',
                  position: 'insideTopLeft',
                }}
              />
              <Bar dataKey="lossUsdM" radius={[3, 3, 0, 0]}>
                {STRESS_2030.map((s) => (
                  <Cell key={s.scenario} fill={SCENARIO_COLOURS[s.scenario] ?? '#0E7C86'} />
                ))}
                <LabelList
                  dataKey="lr"
                  position="top"
                  fontSize={9}
                  fill="#0A1A2A"
                  formatter={(v) => `${(Number(v) * 100).toFixed(1)}% LR`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportFigure>

        <Subhead>Three actions for the Underwriting Committee</Subhead>
        <ol className="list-decimal space-y-2 pl-5 font-serif text-[14px] leading-relaxed text-ink print:text-[11pt]">
          {RECOMMENDATIONS.slice(0, 3).map((r) => (
            <li key={r.id}>
              <b>{r.title}.</b> {r.detail}{' '}
              <span className="block mt-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                Owner · {r.owner} · Milestone · {r.milestone} · Anchor · {POLICY_BY_ID[r.policyId]?.short}
              </span>
            </li>
          ))}
        </ol>

        <P className="mt-4">
          A fourth recommendation — a <b>+8 % regional risk-capital buffer</b> under the Hot House pathway
          per BNM CRST 2024 §6.3 — is laid out in §8 alongside the full action register.
        </P>
      </ReportSection>

      {/* §3 Methodology */}
      <ReportSection eyebrow="Analytical foundation" title="Methodology" number="3">
        <P>
          The engagement is a single Python pipeline — 41 cells, ~3 minutes wall-clock on raw WDI — that
          curates the World Bank Wide-format release into a <b>16-indicator panel of 10 SEA economies, 1990
          to 2024</b>, joins external EM-DAT and ND-GAIN signals for context, and emits the canonical
          numerical record consumed by every downstream artefact. Reproducibility anchors on
          <span className="font-mono"> seed 2026</span>, forward-only interpolation (no 2024 leakage), and
          a held-out 2024 calendar for unbiased model selection.
        </P>

        <Subhead number="3.1">Modelling architecture</Subhead>
        <P>
          Three benchmark families are fit and reported side-by-side. <b>M1</b> — per-country log-linear
          trend — provides a transparent baseline. <b>M2</b> — auto-ARIMA per country — cross-checks
          autocorrelation and the COVID-19 break. <b>M3a</b> — panel XGBoost with lagged emissions —
          delivers the 2024-hold-out forecast. <b>M3b</b> — panel XGBoost without lags, structural-only —
          carries the driver-attribution exhibit. The dual M3a/M3b specification is deliberate: lags
          dominate gain in M3a and would crowd out the structural narrative if collapsed into a single
          model.
        </P>

        <ReportTable
          caption="Table 3.1 · 2024 hold-out MAPE by model"
          source="Source: key_numbers_python.json → mape_summary"
          headers={['Model', '2024 MAPE (%)', 'Role']}
          align={['left', 'right', 'left']}
          rows={[
            ['M1 — Log-linear trend', MAPE.log_linear.toFixed(2), 'Transparent baseline'],
            ['M2 — Auto-ARIMA', MAPE.ARIMA.toFixed(2), 'Autocorrelation cross-check'],
            ['M3a — XGBoost autoregressive', MAPE.XGBoost.toFixed(2), 'Forecast (selected)'],
            ['M3b — XGBoost structural-only', MAPE.XGBoost_M3b.toFixed(2), 'Driver attribution'],
          ]}
        />

        <ReportFigure
          caption="Figure 3.1 · 2024 hold-out MAPE by model · lower is better"
          source="Source: key_numbers_python.json → mape_summary · 10 SEA economies, 2024 hold-out"
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { model: 'M3a · XGBoost AR',         mape: MAPE.XGBoost,    role: 'Forecast' },
                { model: 'M2 · Auto-ARIMA',          mape: MAPE.ARIMA,      role: 'Cross-check' },
                { model: 'M3b · XGBoost structural', mape: MAPE.XGBoost_M3b, role: 'Driver attribution' },
                { model: 'M1 · Log-linear',          mape: MAPE.log_linear, role: 'Baseline' },
              ]}
              layout="vertical"
              margin={{ top: 8, right: 56, left: 8, bottom: 8 }}
            >
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.18)]}
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="model"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={150}
              />
              <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey="mape" fill="#0E7C86" radius={[0, 3, 3, 0]}>
                <LabelList dataKey="mape" position="right" fontSize={10} fill="#0A1A2A" formatter={(v) => `${Number(v).toFixed(2)}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportFigure>

        <ReportFigure
          caption="Figure 3.2 · 2024 hold-out · M3a predicted vs actual (Mt CO₂e, log–log)"
          source="Source: m3a_per_country · y = x line shows perfect calibration · all 10 economies within ±5 % MAPE"
          height={300}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 76, left: 16, bottom: 32 }}>
              <XAxis
                type="number"
                dataKey="actual"
                name="Actual 2024"
                scale="log"
                domain={[8, 4000]}
                allowDataOverflow={false}
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                tickFormatter={(v) => `${v}`}
                ticks={[10, 30, 100, 300, 1000, 3000]}
                label={{ value: 'Actual GHG 2024 (Mt)', position: 'insideBottom', offset: -10, fontSize: 10, fill: 'rgba(10,26,42,0.65)' }}
              />
              <YAxis
                type="number"
                dataKey="pred"
                name="Predicted 2024"
                scale="log"
                domain={[8, 4000]}
                allowDataOverflow={false}
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                width={48}
                tickFormatter={(v) => `${v}`}
                ticks={[10, 30, 100, 300, 1000, 3000]}
                label={{ value: 'Predicted', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'rgba(10,26,42,0.65)', offset: 0 }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ stroke: 'rgba(10,26,42,0.12)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { country: string; actual: number; pred: number; errPct: number };
                  return (
                    <div className="border border-rule bg-paper px-2 py-1 text-[11px]">
                      <div className="font-semibold text-ink">{d.country}</div>
                      <div className="font-mono tab-num text-muted">
                        actual {d.actual.toFixed(0)} · pred {d.pred.toFixed(0)} · err {d.errPct >= 0 ? '+' : ''}{d.errPct.toFixed(2)}%
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                segment={[
                  { x: 10, y: 10 },
                  { x: 3000, y: 3000 },
                ]}
                stroke="rgba(10,26,42,0.35)"
                strokeDasharray="3 3"
              />
              <Scatter data={FORECAST_2024} fill="#0E7C86">
                <LabelList
                  dataKey="country"
                  position="right"
                  fontSize={9}
                  fill="rgba(10,26,42,0.75)"
                  offset={8}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ReportFigure>

        <Subhead number="3.2">From emissions to loss ratio</Subhead>
        <P>
          The 2030 emissions trajectories are perturbed by NGFS Phase V scenario growth deltas relative to
          the M3a baseline. Each emissions delta is then mapped to a loss-ratio delta via the
          Swiss Re <i>sigma</i> 1/2024 emissions-loss elasticity{' '}
          <span className="font-mono">ε = {PORTFOLIO.elasticity}</span>; expected loss is the product of
          GWP and the implied loss ratio. The pairwise vs partial correlation diagnostic — three sign
          flips on forest area, industry share, and energy use per capita once log-GDP and log-population
          are partialled out — is reported as a headline diagnostic rather than a trim, per §3.2 of the
          companion report.
        </P>

        <ReportFigure
          caption="Figure 3.3 · Pairwise vs partial correlation with log-GHG · 1990–2023"
          source="Source: partial_correlations · log-GDP and log-population partialled out for partial-r · ◆ = sign flip"
          height={320}
        >
          {(() => {
            const rows = [...canon.partial_correlations].sort(
              (a, b) => Math.abs(b.partial_r) - Math.abs(a.partial_r),
            );
            const data = rows.map((r) => ({
              feature: PRETTY_FEATURE[r.feature] ?? r.feature,
              pairwise: r.pairwise_r,
              partial: r.partial_r,
              flip: r.flag === 'SIGN-FLIP',
            }));
            return (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 12, right: 24, left: 8, bottom: 24 }}
                  barCategoryGap={6}
                >
                  <XAxis
                    type="number"
                    domain={[-1, 1]}
                    ticks={[-1, -0.5, 0, 0.5, 1]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                    fontSize={10}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    width={150}
                    tick={({ x, y, payload }) => {
                      const d = data.find((dd) => dd.feature === payload.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text x={-6} y={0} dy={3} textAnchor="end" fontSize={10} fill="#0A1A2A">
                            {payload.value}
                            {d?.flip ? <tspan fill="#B8761C" fontWeight={700}>{'  ◆'}</tspan> : null}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <ReferenceLine x={0} stroke="rgba(10,26,42,0.45)" />
                  <Tooltip
                    formatter={(v, name) => [
                      `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}`,
                      name === 'pairwise' ? 'Pairwise r' : 'Partial r',
                    ]}
                    cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                  />
                  <RLegend
                    verticalAlign="top"
                    align="right"
                    height={20}
                    wrapperStyle={{ fontSize: 10, paddingBottom: 4 }}
                    iconType="square"
                  />
                  <Bar dataKey="pairwise" name="Pairwise r" fill="rgba(14,124,134,0.65)" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="partial" name="Partial r" fill="#8B2E1F" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </ReportFigure>

        <P className="mt-3">
          The full pipeline diagram, cell-level provenance, and DAG trace are walked through in the
          interactive build at{' '}
          <Link to="/pipeline" className="text-sea underline underline-offset-2">
            /pipeline
          </Link>
          .
        </P>
      </ReportSection>

      {/* §4 Scenario analysis */}
      <ReportSection eyebrow="Stress-test exhibit" title="Scenario Analysis · 2030" number="4">
        <P>
          The four NGFS Phase V pathways are run against the notional book at the parameters fixed in §3.
          The Hot House World pathway anchors the upper tail; Net Zero 2050 anchors the lower; Mitigation
          and Delayed Transition occupy the centre of the spread. Read the table along the <i>vs Hot
          House</i> column: each row is the saving (or shortfall) the cedent realises if the actual world
          lands on that scenario rather than the Current-Policies baseline.
        </P>

        <ReportTable
          caption="Table 4.1 · 2030 stress-test exhibit · USD 1.2 bn notional book"
          source="Source: NGFS Phase V via PRISM pipeline · key_numbers_python.json → stress_test_2030_aggregate"
          headers={[
            'Scenario',
            'Family',
            'Emissions (Mt)',
            'vs Hot House',
            'Loss ratio',
            'Expected loss (USD m)',
            'Loss swing vs Hot House (USD m)',
          ]}
          align={['left', 'left', 'right', 'right', 'right', 'right', 'right']}
          rows={STRESS_2030.map((s) => {
            const hotHouseEmissions =
              STRESS_2030.find((r) => r.scenario.includes('Current Policies'))?.emissionsMt ??
              s.emissionsMt;
            const emissionsDelta = ((s.emissionsMt - hotHouseEmissions) / hotHouseEmissions) * 100;
            const swing = s.lossUsdM - hotHouseLoss;
            return [
              <span className="font-medium">{s.scenario}</span>,
              <span className="text-muted">{s.family}</span>,
              s.emissionsMt.toLocaleString(),
              `${emissionsDelta >= 0 ? '+' : ''}${emissionsDelta.toFixed(1)} %`,
              `${(s.lr * 100).toFixed(1)} %`,
              s.lossUsdM.toLocaleString(),
              <span className={swing < 0 ? 'text-sage' : swing > 0 ? 'text-rust' : 'text-muted'}>
                {swing > 0 ? '+' : ''}
                {swing.toLocaleString()}
              </span>,
            ];
          })}
        />

        <ReportFigure
          caption="Figure 4.1 · 2030 emissions trajectory by scenario · Mt CO₂e"
          source="Source: stress_test_2030_aggregate.emissions · Hot House anchors the upper tail"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[...STRESS_2030].sort((a, b) => b.emissionsMt - a.emissionsMt)}
              margin={{ top: 24, right: 24, left: 8, bottom: 12 }}
            >
              <XAxis
                dataKey="scenario"
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={62}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={48}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip formatter={(v) => `${Math.round(Number(v)).toLocaleString()} Mt`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey="emissionsMt" radius={[3, 3, 0, 0]}>
                {STRESS_2030.map((s) => (
                  <Cell key={s.scenario} fill={SCENARIO_COLOURS[s.scenario] ?? '#0E7C86'} />
                ))}
                <LabelList
                  dataKey="emissionsMt"
                  position="top"
                  fontSize={9}
                  fill="#0A1A2A"
                  formatter={(v) => `${(Number(v) / 1000).toFixed(2)}k`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportFigure>

        <ReportFigure
          caption="Figure 4.2 · Loss swing vs Hot House · USD m · negative = saving on the notional book"
          source="Source: derived from stress_test_2030_aggregate · GWP × baseLR × ε × Δemissions"
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={STRESS_2030
                .filter((s) => s.scenario !== 'Current Policies')
                .map((s) => ({
                  scenario: s.scenario,
                  swing: s.lossUsdM - hotHouseLoss,
                }))
                .sort((a, b) => a.swing - b.swing)}
              layout="vertical"
              margin={{ top: 16, right: 56, left: 56, bottom: 8 }}
            >
              <XAxis
                type="number"
                domain={[
                  (dataMin: number) => Math.floor(dataMin * 1.18),
                  (dataMax: number) => Math.ceil(Math.max(dataMax, 0) * 1.18 + 8),
                ]}
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}`}
              />
              <YAxis
                type="category"
                dataKey="scenario"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={150}
              />
              <ReferenceLine
                x={0}
                stroke="rgba(10,26,42,0.55)"
                label={{
                  value: 'Hot House baseline',
                  fontSize: 9,
                  fill: 'rgba(10,26,42,0.7)',
                  position: 'top',
                }}
              />
              <Tooltip formatter={(v) => `USD ${Number(v) >= 0 ? '+' : ''}${Math.round(Number(v))} m`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey="swing" radius={[0, 3, 3, 0]}>
                {STRESS_2030
                  .filter((s) => s.scenario !== 'Current Policies')
                  .sort((a, b) => (a.lossUsdM - hotHouseLoss) - (b.lossUsdM - hotHouseLoss))
                  .map((s) => (
                    <Cell key={s.scenario} fill={SCENARIO_COLOURS[s.scenario] ?? '#3F8A66'} />
                  ))}
                <LabelList
                  dataKey="swing"
                  fontSize={10}
                  fill="#0A1A2A"
                  content={(props) => {
                    const x = Number(props.x ?? 0);
                    const y = Number(props.y ?? 0);
                    const width = Number(props.width ?? 0);
                    const height = Number(props.height ?? 0);
                    const num = Number(props.value ?? 0);
                    const labelText = `${num >= 0 ? '+' : ''}${Math.round(num)}m`;
                    const tx = num >= 0 ? x + width + 6 : x - 6;
                    const anchor = num >= 0 ? 'start' : 'end';
                    return (
                      <text x={tx} y={y + height / 2} dy={3} fontSize={10} fill="#0A1A2A" textAnchor={anchor}>
                        {labelText}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportFigure>

        <P>
          The headline reads off the table: Hot House minus Net Zero is{' '}
          <b>USD {HEADLINE.lossSwingUsdM} m / +{HEADLINE.lrSwingPp} pp</b>. The two intermediate scenarios
          are not equally spaced — the Mitigation pathway sits closer to Net Zero than to Delayed
          Transition because the proposed mitigation deploys the same renewable-energy share trajectory as
          Net Zero on the SEA emissions base.
        </P>
      </ReportSection>

      {/* §5 Cedent screening annex */}
      <ReportSection eyebrow="Operational annex" title="Cedent Screening Annex" number="5">
        <P>
          Active cedent profiles saved from the pricing workbench are listed below. Each profile records
          the composite tier (mode of country, sector and adaptive components, with sector D/E overrides),
          the indicative premium loading, and the timestamp at which the profile was committed to the
          local audit trail.
        </P>

        {saved.length > 0 ? (
          <>
            <ReportTable
              caption={`Table 5.1 · Saved cedent profiles · ${saved.length} record${saved.length === 1 ? '' : 's'}`}
              source="Source: localStorage key prism.savedCedents.v1 · written from /pricing"
              headers={['Cedent', 'Country', 'Composite tier', 'Premium loading', 'Saved']}
              align={['left', 'left', 'center', 'right', 'right']}
              rows={saved.map((c) => {
                const tierData = LOADING[c.comp as keyof typeof LOADING];
                const loadingLabel = `${c.loading >= 0 ? '+' : ''}${c.loading} %`;
                const savedDate =
                  c.savedAt && c.savedAt.length >= 10 ? c.savedAt.slice(0, 10) : c.savedAt ?? '—';
                return [
                  <span className="font-medium">{c.name}</span>,
                  c.country,
                  <span className="font-mono font-semibold tab-num">{c.comp}</span>,
                  <span title={tierData?.label ?? ''}>{loadingLabel}</span>,
                  <span className="font-mono text-[11px] text-muted">{savedDate}</span>,
                ];
              })}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <ReportFigure
                caption="Figure 5.1 · Premium loading by saved cedent · % vs reference rate"
                source="Source: prism.savedCedents.v1 · ordered by loading"
                height={Math.max(220, saved.length * 32 + 80)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...saved]
                      .sort((a, b) => a.loading - b.loading)
                      .map((c) => ({ name: c.name, loading: c.loading, comp: c.comp }))}
                    layout="vertical"
                    margin={{ top: 12, right: 56, left: 56, bottom: 8 }}
                  >
                    <XAxis
                      type="number"
                      domain={[
                        (dataMin: number) => Math.floor(Math.min(dataMin, 0) * 1.18 - 4),
                        (dataMax: number) => Math.ceil(Math.max(dataMax, 0) * 1.18 + 4),
                      ]}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                      fontSize={10}
                      tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={10}
                      width={140}
                    />
                    <ReferenceLine x={0} stroke="rgba(10,26,42,0.55)" />
                    <Tooltip
                      formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v)}%`}
                      cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                    />
                    <Bar dataKey="loading" radius={[0, 3, 3, 0]}>
                      {[...saved]
                        .sort((a, b) => a.loading - b.loading)
                        .map((c) => (
                          <Cell key={c.name} fill={TIER_BG[c.comp] ?? '#0E7C86'} />
                        ))}
                      <LabelList
                        dataKey="loading"
                        content={(props) => {
                          const x = Number(props.x ?? 0);
                          const y = Number(props.y ?? 0);
                          const width = Number(props.width ?? 0);
                          const height = Number(props.height ?? 0);
                          const num = Number(props.value ?? 0);
                          const labelText = `${num >= 0 ? '+' : ''}${num}%`;
                          const tx = num >= 0 ? x + width + 6 : x - 6;
                          const anchor = num >= 0 ? 'start' : 'end';
                          return (
                            <text x={tx} y={y + height / 2} dy={3} fontSize={10} fill="#0A1A2A" textAnchor={anchor}>
                              {labelText}
                            </text>
                          );
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportFigure>

              <ReportFigure
                caption="Figure 5.2 · Composite-tier distribution"
                source="Source: tier mode of country, sector, adaptive · count of saved profiles per tier"
                height={260}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierTally} margin={{ top: 24, right: 24, left: 8, bottom: 16 }}>
                    <XAxis dataKey="tier" tickLine={false} axisLine={false} fontSize={11} fontWeight={600} />
                    <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
                    <Tooltip
                      formatter={(v, _n, p) => {
                        const tier = (p as { payload?: { tier?: string; loadingPct?: number } })?.payload;
                        return [
                          `${Number(v)} · loading ${tier?.loadingPct ?? 0 >= 0 ? '+' : ''}${tier?.loadingPct ?? 0}%`,
                          `Tier ${tier?.tier}`,
                        ];
                      }}
                      cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {tierTally.map((t) => (
                        <Cell key={t.tier} fill={TIER_BG[t.tier]} fillOpacity={t.count > 0 ? 1 : 0.18} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        fontSize={10}
                        formatter={(v) => (Number(v) === 0 ? '' : String(v))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportFigure>
            </div>
          </>
        ) : (
          <div className="my-4 border border-dashed border-rule bg-bone/30 px-5 py-6 text-center print:bg-transparent">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              No cedent profiles on file
            </p>
            <p className="mt-2 font-serif text-[13px] italic text-ink">
              Open{' '}
              <Link to="/pricing" className="text-sea underline underline-offset-2">
                /pricing
              </Link>{' '}
              to score a candidate cedent. Saved profiles populate this annex automatically on the next
              report refresh.
            </p>
          </div>
        )}

        <P>
          The five-tier loading table — −5 % discount through +45 % facultative-only loading — is
          published in the cedent-screening framework (<span className="font-mono">deliverables/05_cedent_screening_framework.md</span>).
          Composite ratings of D or E require bespoke wording; capacity decisions remain with the APAC
          Treaty desk.
        </P>
      </ReportSection>

      {/* §6 Compliance crosswalk */}
      <ReportSection eyebrow="Regulatory hooks" title="Compliance Crosswalk" number="6">
        <P>
          The recommendations and supporting analysis anchor on eight policy and prudential instruments.
          The four most material for this engagement are summarised below; the full crosswalk is published
          in <span className="font-mono">deliverables/06_policy_crosswalk.md</span>.
        </P>

        <ReportTable
          caption="Table 6.1 · Compliance anchors · how the analysis satisfies each instrument"
          headers={['Instrument', 'Jurisdiction', 'How PRISM satisfies it']}
          align={['left', 'left', 'left']}
          rows={POLICY_REFS.filter((p) =>
            ['bnm-crst-2024', 'ngfs-phaseV', 'paris-2-1c', 'sigma-1-2024'].includes(p.id),
          ).map((p) => [
            <div>
              <span className="font-medium">{p.short}</span>
              <span className="block font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                {p.full}
              </span>
            </div>,
            p.jurisdiction,
            <span className="text-[12px] leading-snug text-ink">{p.relevance}</span>,
          ])}
        />

        <P>
          IFRS S2 — Climate-related Disclosures takes effect across ASEAN markets in 2026–27 and is the
          fifth gating instrument for any 2026 cedent disclosure. The audit trail in Appendix A is
          structured to satisfy IFRS S2 §29 (risk-management disclosure) without re-keying.
        </P>
      </ReportSection>

      {/* §7 Recommendations full */}
      <ReportSection eyebrow="Action register" title="Recommendations" number="7">
        <P>
          Four prioritised actions follow. Each line carries an owner, a quantified key performance
          indicator, the 90-day milestone, and the policy anchor against which delivery will be assessed.
          The first three were summarised in the Executive Summary; the fourth — the +8 % capital buffer —
          is the regulatory hook for the BNM CRST submission.
        </P>

        <RecommendationTimeline />

        <ol className="mt-2 space-y-5 list-decimal pl-5 font-serif text-[14px] leading-relaxed text-ink print:text-[11pt]">
          {RECOMMENDATIONS.map((r) => {
            const policy = POLICY_BY_ID[r.policyId];
            return (
              <li key={r.id} className="break-inside-avoid">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-semibold not-italic text-ink print:text-[12pt]">
                    {r.title}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                    {r.ticker}
                  </span>
                </div>
                <p className="mt-1 font-serif text-[13px] leading-relaxed text-ink print:text-[11pt]">
                  {r.detail}
                </p>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
                  <Row label="Owner" value={r.owner} />
                  <Row label="KPI" value={r.kpi} />
                  <Row label="Target" value={r.target} />
                  <Row label="90-day milestone" value={r.milestone} />
                </dl>
                {policy && (
                  <p className="mt-2 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
                    Anchor · {policy.short} — {policy.cite}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </ReportSection>

      {/* §8 Limitations */}
      <ReportSection eyebrow="Methodological honesty" title="Limitations & Open Questions" number="8">
        <P>
          The model is reduced-form: it does not embed explicit climate-physical feedback (sea-level rise,
          tropical-cyclone genesis frequency, monsoon shifts). The translation from emissions to loss
          ratio is a single-elasticity calibration drawn from Swiss Re <i>sigma</i> 1/2024 and aggregates
          across peril types. WDI 2024 estimates are revisable; the next April release will trigger the
          quarterly refresh playbook (<span className="font-mono">deliverables/12_stress_refresh_playbook.md</span>).
        </P>
        <ul className="ml-5 mt-3 list-disc space-y-2 font-serif text-[13px] text-ink print:text-[11pt]">
          <li>
            <b>Single-elasticity assumption.</b> A peril-specific elasticity (typhoon, flood, wildfire)
            would refine the Vietnam and Philippines splits; data not yet available at the depth needed.
          </li>
          <li>
            <b>LULUCF excluded.</b> WDI emissions exclude land-use change; the forest-area sign-flip
            reflects this and is documented as a feature rather than a bug.
          </li>
          <li>
            <b>NGFS revision risk.</b> Phase VI is expected in 2027; the playbook freezes the prior
            exhibit on revision and re-runs against new pathways before the next board pack.
          </li>
          <li>
            <b>Cedent disclosure latency.</b> NDC alignment status (Input 3 of the screening framework)
            depends on cedent disclosure cycles that lag treaty renewals by 6–12 months.
          </li>
        </ul>
      </ReportSection>

      {/* §9 Signatures */}
      <ReportSection eyebrow="Authorisation" title="Signature Block" number="9" breakBefore={false}>
        <P>
          This assessment is issued under the joint authority of the analytics team and the APAC risk
          office. Signatures below confirm methodological review, numerical reconciliation, and approval
          for distribution within the Hannover Re APAC perimeter.
        </P>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <SignatureLine role="Prepared by" detail="PRISM Analytics" />
          <SignatureLine role="Reviewed by" detail="Climate Quant Desk · APAC" />
          <SignatureLine role="Approved by" detail="APAC Chief Risk Officer" />
        </div>
      </ReportSection>

      {/* §A Appendix — provenance */}
      <ReportSection eyebrow="Appendix A" title="Numerical Provenance" number="A">
        <P>
          Every headline number cited in this report traces back to a key in the canonical pipeline output
          or a committed deliverable section. The mapping below is the audit trail required for IFRS S2
          §29 and BNM CRST submission.
        </P>
        <ReportTable
          caption="Table A.1 · Headline numbers and their source keys"
          source={`Pipeline generated · ${canon._meta.generated.slice(0, 19)}Z · seed ${canon._meta.seed} · pandas ${canon._meta.pandas} · xgboost ${canon._meta.xgboost}`}
          headers={['Number', 'Value', 'Source key', 'Deliverable']}
          align={['left', 'right', 'left', 'left']}
          rows={[
            [
              'Notional GWP',
              `USD ${(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn`,
              <span className="font-mono text-[11px]">headline.gwp_usdm</span>,
              '01_report.md §6',
            ],
            [
              'Base loss ratio',
              `${(PORTFOLIO.baseLossRatio * 100).toFixed(0)} %`,
              <span className="font-mono text-[11px]">headline.base_lr</span>,
              '01_report.md §6',
            ],
            [
              'Elasticity',
              PORTFOLIO.elasticity.toFixed(2),
              <span className="font-mono text-[11px]">headline.elasticity</span>,
              'Swiss Re sigma 1/2024 §5',
            ],
            [
              'Loss swing (Hot House → Net Zero)',
              `USD ${HEADLINE.lossSwingUsdM} m`,
              <span className="font-mono text-[11px]">headline.loss_swing_usdm</span>,
              '00_executive_one_pager.md',
            ],
            [
              'LR swing',
              `+${HEADLINE.lrSwingPp} pp`,
              <span className="font-mono text-[11px]">headline.lr_swing_pp</span>,
              '00_executive_one_pager.md',
            ],
            [
              '2024 hold-out MAPE — XGBoost M3a',
              `${MAPE.XGBoost.toFixed(2)} %`,
              <span className="font-mono text-[11px]">mape_summary.XGBoost_M3a</span>,
              '01_report.md §4',
            ],
            [
              '2024 hold-out MAPE — XGBoost M3b',
              `${MAPE.XGBoost_M3b.toFixed(2)} %`,
              <span className="font-mono text-[11px]">mape_summary.XGBoost_M3b</span>,
              '01_report.md §4',
            ],
            [
              '2024 hold-out MAPE — ARIMA',
              `${MAPE.ARIMA.toFixed(2)} %`,
              <span className="font-mono text-[11px]">mape_summary.ARIMA</span>,
              '01_report.md §4',
            ],
            [
              '2024 hold-out MAPE — log-linear',
              `${MAPE.log_linear.toFixed(2)} %`,
              <span className="font-mono text-[11px]">mape_summary.log_linear</span>,
              '01_report.md §4',
            ],
            [
              '2030 stress exhibit (4 scenarios)',
              `${STRESS_2030.length} rows`,
              <span className="font-mono text-[11px]">stress_test_2030_aggregate</span>,
              '12_stress_refresh_playbook.md §4',
            ],
            [
              'Saved cedent profiles (this run)',
              `${saved.length} record${saved.length === 1 ? '' : 's'}`,
              <span className="font-mono text-[11px]">localStorage · prism.savedCedents.v1</span>,
              'Live · /pricing',
            ],
          ]}
        />

        <Hairline className="mt-6" />
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          End of report · {REPORT_ID} · {today}
        </p>
      </ReportSection>
    </article>
  );
}

// Quarter math: 2026 Q2 (kick-off) → 2028 Q4 (8 quarters of horizon).
// Each rec maps to a (start, end) quarter index and a hue.
const TIMELINE_START_Q = 0;   // 2026 Q2
const TIMELINE_END_Q   = 11;  // 2029 Q1 (exclusive label cap)

const REC_TIMELINE: Record<string, { startQ: number; endQ: number; tone: string; phase: string }> = {
  // Q index from 2026 Q2 = 0 → 2026 Q3 = 1 → 2026 Q4 = 2 → 2027 Q1 = 3 → 2027 Q3 = 5 → ...
  'parametric':     { startQ: 1, endQ: 5,  tone: '#0E7C86', phase: 'Build · bind Q3 2027' },
  'esg-screen':     { startQ: 0, endQ: 2,  tone: '#3F8A66', phase: 'Underwriting · 2026 renewals' },
  'cat-bond':       { startQ: 2, endQ: 4,  tone: '#B8761C', phase: 'Capital markets · issue Q2 2027' },
  'capital-buffer': { startQ: 0, endQ: 11, tone: '#8B2E1F', phase: 'Annual ICAAP · standing' },
};

function quarterLabel(q: number): string {
  const yearOffset = Math.floor((q + 1) / 4);
  const quarterInYear = ((q + 1) % 4) + 1; // q=0 → Q2 2026, q=1 → Q3 2026 ...
  return `${quarterInYear}Q${(2026 + yearOffset).toString().slice(-2)}`;
}

function RecommendationTimeline() {
  const totalQ = TIMELINE_END_Q - TIMELINE_START_Q + 1;
  const ticks = [0, 2, 4, 6, 8, 10];
  const ROW_H = 44;
  const rows = RECOMMENDATIONS.filter((r) => REC_TIMELINE[r.id]);
  return (
    <ReportFigure
      caption="Figure 7.1 · Action timeline · 2026 Q2 → 2029 Q1"
      source="Source: keyNumbers.RECOMMENDATIONS · milestones from §7 narrative"
      height={rows.length * ROW_H + 56}
    >
      <div className="grid h-full grid-cols-[44px_1fr] gap-2">
        {/* Ticker column */}
        <div className="relative h-full">
          {rows.map((r, i) => (
            <span
              key={r.id}
              className="absolute left-0 font-mono text-[10px] uppercase tracking-eyebrow text-muted"
              style={{ top: `${i * ROW_H + 6}px` }}
            >
              {r.ticker}
            </span>
          ))}
        </div>

        {/* Track column */}
        <div className="relative h-full">
          {/* gridlines */}
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 w-px bg-rule/60 print:bg-black/20"
              style={{
                left: `${(t / (totalQ - 1)) * 100}%`,
                bottom: 24,
              }}
            />
          ))}
          {/* today marker (kick-off) */}
          <div className="absolute top-0 w-[1.5px] bg-ink/70" style={{ left: '0%', bottom: 24 }} />

          {/* bars */}
          {rows.map((r, i) => {
            const tl = REC_TIMELINE[r.id];
            const leftPct = (tl.startQ / (totalQ - 1)) * 100;
            const widthPct = ((tl.endQ - tl.startQ) / (totalQ - 1)) * 100;
            return (
              <div
                key={r.id}
                className="absolute"
                style={{
                  top: `${i * ROW_H + 4}px`,
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                  height: 22,
                }}
                title={`${r.title} · ${tl.phase}`}
              >
                <div
                  className="h-full w-full rounded-sm"
                  style={{ background: tl.tone }}
                />
                <span
                  className="absolute inset-y-0 left-2 right-2 flex items-center text-[10px] font-semibold text-paper"
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                >
                  {r.title}
                </span>
                <span
                  className="absolute left-0 text-[9px] text-muted"
                  style={{ top: 24 }}
                >
                  {tl.phase}
                </span>
              </div>
            );
          })}

          {/* x-axis ticks */}
          <div className="absolute left-0 right-0 bottom-0 h-6 border-t border-rule">
            {ticks.map((t, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === ticks.length - 1;
              const transform = isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';
              return (
                <div
                  key={t}
                  className="absolute top-1 font-mono text-[9px] text-muted"
                  style={{
                    left: `${(t / (totalQ - 1)) * 100}%`,
                    transform,
                  }}
                >
                  {quarterLabel(t)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ReportFigure>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-[11px] print:text-[10pt]">
      <dt className="font-mono uppercase tracking-eyebrow text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function SignatureLine({ role, detail }: { role: string; detail: string }) {
  return (
    <div className="break-inside-avoid">
      <div className="h-12 border-b border-ink" aria-hidden="true" />
      <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">{role}</p>
      <p className="mt-0.5 font-serif text-[12px] italic text-ink">{detail}</p>
      <p className="mt-1 font-mono text-[10px] tab-num text-muted">Date: ____________</p>
    </div>
  );
}
