import { useEffect, useState } from 'react';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { Ticker } from '../components/Ticker';
import { HEADLINE, PORTFOLIO, RECOMMENDATIONS } from '../data/keyNumbers';
import { POLICY_BY_ID } from '../data/policy';

const TICKER_TONE: Record<string, 'sea' | 'sage' | 'amber' | 'rust'> = {
  PT: 'sea', ES: 'sage', CB: 'amber', CL: 'rust',
};

const STORAGE_KEY = 'r-ignite.savedCedents.v1';

type SavedCedent = { name: string; country: string; comp: string; loading: number; savedAt: string };

export function Brief() {
  const [saved, setSaved] = useState<SavedCedent[]>([]);
  const [scenario] = useState('Mitigation (proposed)');
  const [picked, setPicked] = useState<Record<string, boolean>>({
    parametric: true, 'esg-screen': true, 'cat-bond': false, 'capital-buffer': true,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const featured = saved[0];
  const selected = RECOMMENDATIONS.filter((r) => picked[r.id]);

  const memoText = buildMemo({ saved: featured, scenario, recs: selected });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(memoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {}
  };

  const printPdf = () => window.print();
  const share = () => {
    if ((navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        title: 'R-Ignite Executive Memo',
        text: memoText,
      }).catch(() => {});
    } else {
      copy();
    }
  };

  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Executive memo · 09_hannover_re_executive_memo.md</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          One memo. <span className="italic">One CRO desk.</span>
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink">
          Populated from the saved cedent profile, the chosen scenario, and the picked recommendations. Ready to send.
        </p>
      </section>

      {/* Recommendation picker */}
      <Card title="Include recommendations" subtitle="Tick the actions to feature in the memo.">
        <ul className="divide-y divide-rule">
          {RECOMMENDATIONS.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <input
                id={`pick-${r.id}`}
                type="checkbox"
                checked={!!picked[r.id]}
                onChange={(e) => setPicked({ ...picked, [r.id]: e.target.checked })}
                className="mt-1 h-4 w-4 accent-sea"
              />
              <label htmlFor={`pick-${r.id}`} className="flex-1 cursor-pointer">
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">{r.ticker}</span>
                <span className="ml-2 text-[13px] text-ink">{r.title}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      {/* Recommended actions — folded from Actions screen */}
      <section className="border border-rule bg-paper px-5 py-5 lg:px-7 lg:py-6">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Recommended actions · {RECOMMENDATIONS.length}</Eyebrow>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Detail rows
          </span>
        </div>
        <Hairline className="mt-3" />
        <ul className="mt-3 divide-y divide-rule">
          {RECOMMENDATIONS.map((r) => {
            const policy = POLICY_BY_ID[r.policyId];
            return (
              <li key={r.id} className="grid grid-cols-[auto_1fr] gap-4 py-4">
                <Ticker code={r.ticker} tone={TICKER_TONE[r.ticker] ?? 'ink'} size="lg" />
                <div>
                  <h3 className="text-[14px] font-semibold leading-tight text-ink">{r.title}</h3>
                  <p className="mt-1 text-[12px] leading-snug text-muted">{r.detail}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <Row label="KPI" value={r.kpi} />
                    <Row label="Target" value={r.target} />
                    <Row label="Owner" value={r.owner} />
                    <Row label="Milestone" value={r.milestone} />
                  </dl>
                  {policy && (
                    <p className="mt-2 border-t border-rule pt-2 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
                      Anchor · {policy.short} — {policy.full}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Memo preview — print-clean */}
      <article className="border border-rule bg-paper px-6 py-7 print-only:bg-white">
        <header className="border-b border-rule pb-3">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Memorandum · Confidential
          </p>
          <p className="mt-1 font-mono text-[10px] tab-num text-muted">
            From: R-Ignite Analytics &nbsp;·&nbsp; Date: {new Date().toISOString().slice(0, 10)}
          </p>
        </header>

        <h2 className="display mt-4 text-[28px] leading-[1.05] text-ink">
          South-East Asia climate-risk repricing,
          <span className="italic"> 2030 horizon</span>.
        </h2>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          To · Hannover Re APAC P&amp;C Underwriting
        </p>

        <Hairline className="mt-4" />

        <section className="mt-4">
          <p className="eyebrow text-muted">Headline</p>
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-ink">
            On the notional <b>USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</b> SEA portfolio, the gap between the Net Zero 2050 and Hot House World pathway by 2030 is <b>USD {HEADLINE.lossSwingUsdM} m</b> in expected loss — a <b>{HEADLINE.lrSwingPp} pp</b> loss-ratio swing. Forecast accuracy on the 2024 hold-out is {HEADLINE.mapeXGBPct}% MAPE.
          </p>
        </section>

        {featured && (
          <section className="mt-4 border-t border-rule pt-4">
            <p className="eyebrow text-muted">Featured cedent · saved profile</p>
            <p className="mt-1 font-serif text-[14px] italic leading-relaxed text-ink">
              {featured.name} ({featured.country}) — composite tier <b className="not-italic">{featured.comp}</b>, premium loading <b className="not-italic">{featured.loading >= 0 ? '+' : ''}{featured.loading}%</b>.
            </p>
          </section>
        )}

        <section className="mt-4 border-t border-rule pt-4">
          <p className="eyebrow text-muted">Scenario base case</p>
          <p className="mt-1 font-serif text-[14px] leading-relaxed text-ink">
            We recommend the {scenario.replace('(proposed)', '').trim()} pathway for management base-case planning, with elasticity ε = {PORTFOLIO.elasticity} per Swiss Re sigma 1/2024.
          </p>
        </section>

        <section className="mt-4 border-t border-rule pt-4">
          <p className="eyebrow text-muted">Recommendations</p>
          <ol className="mt-2 space-y-2 list-decimal pl-5 text-[14px] text-ink">
            {selected.map((r) => (
              <li key={r.id}>
                <b>{r.title}.</b> {r.detail}
                <span className="block mt-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                  Owner · {r.owner} &nbsp;·&nbsp; Milestone · {r.milestone} &nbsp;·&nbsp; Anchor · {POLICY_BY_ID[r.policyId]?.short}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <Hairline className="mt-5" />

        <footer className="mt-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          Methodology · Python pipeline v1.0 · Seed 2026 · Sources WDI, EM-DAT, ND-GAIN, NGFS Phase V, BNM CRST 2024.
        </footer>
      </article>

      {/* CTA tray — no-print */}
      <div className="no-print grid grid-cols-3 gap-2">
        <CTA label="Copy" sub={copied ? 'Copied ✓' : 'to clipboard'} onClick={copy} />
        <CTA label="PDF" sub="Print-ready" onClick={printPdf} />
        <CTA label="Share" sub="WhatsApp / SMS" onClick={share} />
      </div>

      {!featured && (
        <Card title="Save a cedent first" tone="sand">
          <p className="text-[12px] text-muted">
            Open Cedent (08), pick a preset, then tap “Save cedent →”. The memo will populate automatically.
          </p>
        </Card>
      )}
    </div>
  );
}

function CTA({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border border-ink bg-paper px-4 py-3 text-left transition hover:bg-ink hover:text-paper"
    >
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">{sub}</p>
      <p className="display mt-1 text-[20px] leading-none italic">{label}</p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function buildMemo({ saved, scenario, recs }: { saved?: SavedCedent; scenario: string; recs: typeof RECOMMENDATIONS }) {
  const lines: string[] = [];
  lines.push('MEMORANDUM — Confidential');
  lines.push('From: R-Ignite Analytics');
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('To: Hannover Re APAC P&C Underwriting');
  lines.push('');
  lines.push('Subject: South-East Asia climate-risk repricing, 2030 horizon.');
  lines.push('');
  lines.push(`Headline: On a notional USD ${(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn SEA portfolio, the Net Zero vs Hot House gap in 2030 is USD ${HEADLINE.lossSwingUsdM} m / +${HEADLINE.lrSwingPp} pp.`);
  if (saved) {
    lines.push('');
    lines.push(`Featured cedent: ${saved.name} (${saved.country}) — composite ${saved.comp}, premium loading ${saved.loading >= 0 ? '+' : ''}${saved.loading}%.`);
  }
  lines.push('');
  lines.push(`Recommended base case: ${scenario.replace('(proposed)', '').trim()} (elasticity ε = ${PORTFOLIO.elasticity}).`);
  lines.push('');
  lines.push('Recommendations:');
  recs.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.title}. ${r.detail} Owner: ${r.owner}. Milestone: ${r.milestone}. Anchor: ${POLICY_BY_ID[r.policyId]?.short}.`);
  });
  lines.push('');
  lines.push('Methodology: Python pipeline v1.0, seed 2026. Sources: WDI, EM-DAT, ND-GAIN, NGFS Phase V, BNM CRST 2024.');
  return lines.join('\n');
}
