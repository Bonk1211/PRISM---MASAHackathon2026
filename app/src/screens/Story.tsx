import { Link } from 'react-router-dom';
import { Card, StatBig } from '../components/Card';
import { HEADLINE, PORTFOLIO } from '../data/keyNumbers';

export function Story() {
  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">
          Hannover Re · Strategic Partner
        </p>
        <h1 className="mt-1 text-xl font-bold leading-tight">
          Climate risk is a structural driver of expected loss in SEA.
        </h1>
        <p className="mt-2 text-sm opacity-90">
          On the client&apos;s notional <b>USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</b> SEA portfolio, the gap between
          a Net-Zero and a Hot-House transition pathway by 2030 is
          <b> USD {HEADLINE.lossSwingUsdM} m</b> in expected loss — an
          <b> {HEADLINE.lrSwingPp} pp</b> loss-ratio swing.
        </p>
      </Card>

      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-card">
        <StatBig value={`USD ${HEADLINE.lossSwingUsdM} m`} label="Loss swing" accent="rust" />
        <StatBig value={`${HEADLINE.lrSwingPp} pp`} label="LR delta" accent="amber" />
        <StatBig value={`${HEADLINE.mapeXGBPct}%`} label="MAPE 2024" accent="sea" hint="XGBoost hold-out" />
      </div>

      <Card title="What this app shows" subtitle="Five swipes across the analytical journey.">
        <ol className="space-y-2 text-sm">
          <li className="flex gap-2"><span className="text-sea font-bold">1</span><span><b>Model</b> — STIRPAT drivers (population + GDP carry 85 % of variance) and the 2024 hold-out forecast leaderboard.</span></li>
          <li className="flex gap-2"><span className="text-sea font-bold">2</span><span><b>Hot Spots</b> — Vietnam vs Philippines on real EM-DAT 2018-23 disaster damage and ND-GAIN adaptive scores.</span></li>
          <li className="flex gap-2"><span className="text-sea font-bold">3</span><span><b>Stress</b> — pick an NGFS scenario and watch the loss ratio re-price.</span></li>
          <li className="flex gap-2"><span className="text-sea font-bold">4</span><span><b>Cedent</b> — pick country + sector mix and read the composite tier and premium loading live.</span></li>
        </ol>
      </Card>

      <Card title="Portfolio assumptions" tone="sand">
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-muted text-[11px] uppercase tracking-wider">GWP</dt><dd className="font-semibold">USD {PORTFOLIO.gwpUsdM} m</dd></div>
          <div><dt className="text-muted text-[11px] uppercase tracking-wider">Base LR</dt><dd className="font-semibold">{(PORTFOLIO.baseLossRatio * 100).toFixed(0)}%</dd></div>
          <div><dt className="text-muted text-[11px] uppercase tracking-wider">Elasticity</dt><dd className="font-semibold">{PORTFOLIO.elasticity}</dd></div>
        </dl>
        <p className="mt-2 text-[11px] text-muted">
          Elasticity from Swiss Re <i>sigma</i> 1/2024. Base loss ratio illustrative — replace with cedent-supplied book in production.
        </p>
      </Card>

      <Link
        to="/actions"
        className="block rounded-2xl border border-ink bg-paper p-4 text-center text-sm font-semibold text-ink shadow-card transition active:scale-[0.99]"
      >
        See the four recommended actions →
      </Link>

      <p className="px-1 pb-4 text-[10px] leading-relaxed text-muted">
        Sources: World Bank WDI (Wide format); EM-DAT Country Profiles via OCHA HDX (snapshot 2026-04-24); ND-GAIN Country Index 2026 release; Swiss Re <i>sigma</i> 1/2024; NGFS Phase V; BNM CRST 2024.
      </p>
    </div>
  );
}
