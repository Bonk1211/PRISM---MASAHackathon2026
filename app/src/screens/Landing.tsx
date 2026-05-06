import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { HEADLINE, PORTFOLIO } from '../data/keyNumbers';
import { getMeta } from '../lib/pipeline';

// Landing — SaaS-style cover for PRISM. Editorial broadsheet aesthetic
// (consultancy / Financial Times feel), not gradient tech-startup. Sells the
// demo to a cold judge in 30 seconds: hero → demo arc → live data feeds.

type FeedStatus = 'live' | 'stub' | 'vintage';

function StatusPill({ status, label }: { status: FeedStatus; label: string }) {
  const dot =
    status === 'live'
      ? 'text-sea'
      : status === 'stub'
        ? 'text-amber'
        : 'text-muted';
  const glyph = status === 'live' ? '●' : '○';
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-ink">
      <span className={dot}>{glyph}</span>
      {label}
    </span>
  );
}

function FeedRow({
  name,
  endpoint,
  description,
  status,
  pillLabel,
}: {
  name: string;
  endpoint: string;
  description: string;
  status: FeedStatus;
  pillLabel: string;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-b border-rule py-3 last:border-b-0 lg:grid-cols-[1.2fr_2fr_auto] lg:gap-6 lg:py-4">
      <div>
        <p className="text-[14px] font-semibold text-ink lg:text-[15px]">{name}</p>
        <p className="font-mono text-[10px] tab-num text-muted">{endpoint}</p>
      </div>
      <p className="col-span-2 text-[12px] leading-snug text-muted lg:col-span-1 lg:text-[12px]">
        {description}
      </p>
      <div className="col-start-2 row-start-1 justify-self-end lg:col-start-3">
        <StatusPill status={status} label={pillLabel} />
      </div>
    </li>
  );
}

function DemoTile({
  glyph,
  eyebrow,
  title,
  blurb,
  to,
  cta,
}: {
  glyph: ReactNode;
  eyebrow: string;
  title: string;
  blurb: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col border border-rule bg-paper px-5 py-6 transition hover:border-ink hover:bg-ink hover:text-paper lg:px-7 lg:py-8"
    >
      <div className="flex items-start justify-between">
        <span
          aria-hidden="true"
          className="display text-[40px] leading-none text-ink/80 group-hover:text-paper lg:text-[56px]"
        >
          {glyph}
        </span>
        <span className="eyebrow text-muted group-hover:text-paper/70">{eyebrow}</span>
      </div>
      <h3 className="display mt-6 text-[26px] leading-[1.05] text-ink group-hover:text-paper lg:mt-8 lg:text-[34px]">
        {title}
      </h3>
      <p className="mt-3 text-[13px] leading-relaxed text-muted group-hover:text-paper/75 lg:text-[14px]">
        {blurb}
      </p>
      <div className="mt-auto flex items-baseline justify-between pt-6 lg:pt-8">
        <span className="text-[12px] font-semibold uppercase tracking-eyebrow text-ink group-hover:text-paper">
          {cta}
        </span>
        <span aria-hidden="true" className="font-mono text-[14px] text-ink group-hover:text-paper">
          →
        </span>
      </div>
    </Link>
  );
}

export function Landing() {
  const today = new Date().toISOString().slice(0, 10);
  const [climateTraceAsOf, setClimateTraceAsOf] = useState<string>(today);

  useEffect(() => {
    let cancelled = false;
    getMeta()
      .then((m) => {
        if (cancelled) return;
        if (m.data_as_of) setClimateTraceAsOf(m.data_as_of.slice(0, 10));
      })
      .catch(() => {
        /* keep today's date as graceful fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 lg:space-y-10">
      {/* HERO — broadsheet 2-col on lg */}
      <section className="border border-rule bg-paper">
        <div className="grid lg:grid-cols-[1.6fr_1fr]">
          {/* Left: pitch */}
          <div className="px-5 pt-6 pb-6 lg:px-12 lg:pt-12 lg:pb-10 lg:border-r lg:border-rule">
            <div className="flex items-center justify-between">
              <Eyebrow>PRISM — Portfolio Risk via Identified Scenario Modeling</Eyebrow>
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                MASA 2026 · Folio 00
              </span>
            </div>

            <h1 className="display mt-5 text-[42px] leading-[0.94] text-ink lg:mt-7 lg:text-[76px]">
              Climate risk is a
              <span className="italic"> structural driver </span>
              of expected loss in
              <span className="italic"> South-East Asia</span>.
            </h1>

            <Hairline className="mt-6 lg:mt-8" strong />

            <p className="mt-5 font-serif text-[16px] italic leading-relaxed text-ink lg:mt-7 lg:text-[20px]">
              On a notional <span className="not-italic font-semibold">USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</span> SEA reinsurance book, the gap between Net Zero 2050 and Hot House 2030 is{' '}
              <span className="not-italic font-semibold">USD {HEADLINE.lossSwingUsdM} m</span> in expected loss — an{' '}
              <span className="not-italic font-semibold">{HEADLINE.lrSwingPp} pp</span> loss-ratio swing.
            </p>

            <p className="mt-4 text-[12px] text-muted lg:mt-6 lg:text-[13px]">
              PRISM turns World Bank, NGFS and Climate TRACE feeds into a hold-out-tested 2024 forecast,
              a 2030 NGFS stress test, and a Hannover Re-ready cedent screen. Built for the underwriter, not the data scientist.
            </p>
          </div>

          {/* Right: KPI plate */}
          <div className="px-5 pt-5 pb-6 lg:px-9 lg:pt-12 lg:pb-10">
            <Eyebrow>Headline · base case</Eyebrow>
            <div className="mt-4 space-y-4 lg:mt-6">
              <div className="border-b border-rule pb-4">
                <StatBig
                  value={`USD ${HEADLINE.lossSwingUsdM}m`}
                  label="Loss swing 2030"
                  accent="rust"
                  size="hero"
                />
              </div>
              <div className="border-b border-rule pb-4">
                <StatBig
                  value={`+${HEADLINE.lrSwingPp}pp`}
                  label="LR delta"
                  accent="amber"
                  size="lg"
                />
              </div>
              <StatBig
                value={`${HEADLINE.mapeXGBPct}%`}
                label="MAPE 2024"
                accent="sea"
                size="lg"
                hint="XGBoost hold-out · seed 2026"
              />
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule lg:grid-cols-4">
        {[
          { k: '10', l: 'SEA economies' },
          { k: '16', l: 'WDI indicators' },
          { k: '35', l: 'Years · 1990 – 2024' },
          { k: '2026', l: 'Seed · reproducible' },
        ].map((it) => (
          <div key={it.l} className="bg-paper px-4 py-5 lg:px-6 lg:py-6">
            <div className="display tab-num text-[28px] text-ink lg:text-[40px]">{it.k}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-eyebrow text-muted">
              {it.l}
            </div>
          </div>
        ))}
      </section>

      {/* DEMO ARC — three tiles */}
      <section className="border border-rule bg-paper px-5 py-6 lg:px-12 lg:py-10">
        <div className="flex items-baseline justify-between">
          <Eyebrow>The demo · 3 acts · ~5 minutes</Eyebrow>
          <span className="hidden font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:inline">
            Method → Pricing → Delivery
          </span>
        </div>
        <h2 className="display mt-2 text-[28px] leading-[1.05] text-ink lg:text-[44px]">
          From <span className="italic">raw indicator</span> to <span className="italic">priced cedent</span>, in three tiles.
        </h2>

        <div className="mt-7 grid gap-4 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          <DemoTile
            glyph="I"
            eyebrow="Act I · Method"
            title="Explore the pipeline"
            blurb="Five live stages — inputs, features, XGBoost, NGFS scenario, loss mapping. Every cell traceable to a dataset row."
            to="/pipeline"
            cta="Run the model"
          />
          <DemoTile
            glyph="II"
            eyebrow="Act II · Pricing"
            title="Run a pricing simulation"
            blurb="Natural-language scenario via Gemini. Slide elasticity, swap NGFS pathway, see the loss ratio move in real time."
            to="/pricing"
            cta="Price a cedent"
          />
          <DemoTile
            glyph="III"
            eyebrow="Act III · Delivery"
            title="Read the assessment report"
            blurb="The 10-page Hannover Re memo: cedent tiering, capital ask, parametric product, 2027 cat-bond window."
            to="/report"
            cta="Open the report"
          />
        </div>
      </section>

      {/* LIVE DATA FEEDS */}
      <section className="border border-rule bg-paper px-5 py-6 lg:px-12 lg:py-10">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Powered by · live data feeds</Eyebrow>
          <span className="font-mono text-[10px] tab-num uppercase tracking-eyebrow text-muted">
            04 sources
          </span>
        </div>
        <h2 className="display mt-2 text-[24px] leading-[1.1] text-ink lg:text-[34px]">
          Real APIs, not slideware.
        </h2>

        <ul className="mt-6 lg:mt-8">
          <FeedRow
            name="Climate TRACE"
            endpoint="api.climatetrace.org/v7"
            description="Monthly national emissions inventory. Streamed daily into the 2024 hold-out and forward-looking trace."
            status="live"
            pillLabel={`Live · ${climateTraceAsOf}`}
          />
          <FeedRow
            name="Google Gemini"
            endpoint="gemini-2.5-flash"
            description="Natural-language scenario input on the Pricing screen — type a memo, get a stressed loss ratio."
            status="live"
            pillLabel="Live"
          />
          <FeedRow
            name="NGFS-IIASA Phase V"
            endpoint="data.ene.iiasa.ac.at/ngfs"
            description="Scenario growth rates for Net Zero 2050, Delayed Transition, Current Policies. Direct API for Grand Final."
            status="stub"
            pillLabel="Stub · Grand Final"
          />
          <FeedRow
            name="World Bank WDI"
            endpoint="data360files.worldbank.org/wb_wdi"
            description="Base panel — 16 indicators × 10 SEA economies × 1990 – 2024. The reproducibility anchor."
            status="vintage"
            pillLabel="Vintage 2024"
          />
        </ul>
      </section>

      {/* PERSISTENT CTA — primary path */}
      <Link
        to="/pipeline"
        className="group flex items-center justify-between border border-ink bg-ink px-5 py-4 text-paper transition active:bg-ink/95 lg:px-10 lg:py-6"
      >
        <span className="flex items-baseline gap-4 lg:gap-6">
          <span className="font-mono text-[11px] uppercase tracking-eyebrow text-paper/70">
            Begin
          </span>
          <span className="display text-[20px] italic lg:text-[28px]">
            See the model run live
          </span>
        </span>
        <span aria-hidden="true" className="font-mono text-[14px] lg:text-[18px]">
          →
        </span>
      </Link>

      {/* FOOTER */}
      <Card tone="paper">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-6">
          <div>
            <Eyebrow>Strategic partner</Eyebrow>
            <p className="mt-1 text-[13px] text-ink lg:text-[14px]">
              Hannover Re · MASA Hackathon 2026 · PRISM team
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:text-right">
            Pipeline Python v1.0 · Seed 2026 · Data {climateTraceAsOf}
          </p>
        </div>
      </Card>
    </div>
  );
}
