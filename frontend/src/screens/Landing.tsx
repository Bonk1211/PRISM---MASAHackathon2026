import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { HEADLINE, PORTFOLIO } from '../data/keyNumbers';
import { getMeta } from '../lib/pipeline';

// Landing — SaaS-style cover for PRISM. Editorial broadsheet aesthetic
// (consultancy / Financial Times feel), not gradient tech-startup. Sells the
// demo to a cold judge in 30 seconds: hero → demo arc → live data feeds.

type FeedStatus = 'live' | 'stub' | 'vintage';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const onChange = () => setReduced(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Looping typewriter for the hero's "South-East Asia" word. Types → holds →
// erases → pauses → repeats. Caret blinks at the tail. Respects
// prefers-reduced-motion (renders the full word, no animation).
type LoopPhase = 'type' | 'hold' | 'erase' | 'gap';

function LoopWord({
  word,
  italic = false,
  typeMs = 90,
  eraseMs = 45,
  holdMs = 1800,
  gapMs = 550,
}: {
  word: string;
  italic?: boolean;
  typeMs?: number;
  eraseMs?: number;
  holdMs?: number;
  gapMs?: number;
}) {
  const reduced = useReducedMotion();
  const [chars, setChars] = useState(reduced ? word.length : 0);
  const [phase, setPhase] = useState<LoopPhase>(reduced ? 'hold' : 'type');

  useEffect(() => {
    if (reduced) return;
    let id: number | null = null;
    if (phase === 'type') {
      id = window.setInterval(() => {
        setChars((n) => {
          if (n >= word.length) {
            if (id !== null) window.clearInterval(id);
            setPhase('hold');
            return n;
          }
          return n + 1;
        });
      }, typeMs);
    } else if (phase === 'erase') {
      id = window.setInterval(() => {
        setChars((n) => {
          if (n <= 0) {
            if (id !== null) window.clearInterval(id);
            setPhase('gap');
            return 0;
          }
          return n - 1;
        });
      }, eraseMs);
    } else if (phase === 'hold') {
      id = window.setTimeout(() => setPhase('erase'), holdMs);
    } else if (phase === 'gap') {
      id = window.setTimeout(() => setPhase('type'), gapMs);
    }
    return () => {
      if (id === null) return;
      window.clearInterval(id);
      window.clearTimeout(id);
    };
  }, [phase, reduced, word.length, typeMs, eraseMs, holdMs, gapMs]);

  const slice = word.slice(0, chars);
  const full = chars === word.length;

  return (
    <>
      <span className={italic ? 'italic' : undefined}>{slice}</span>
      {full && '.'}
      <span
        aria-hidden="true"
        className="caret-blink ml-[0.05em] inline-block w-[0.08em] translate-y-[0.06em] bg-ink align-baseline"
        style={{ height: '0.78em' }}
      />
      <span className="sr-only">{word}.</span>
    </>
  );
}

// Count-up animator — eases a numeric KPI from 0 → target on mount.
// Honours prefers-reduced-motion (renders the final value, no animation).
function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 1200,
  delayMs = 480,
  className = '',
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [val, setVal] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) { setVal(to); return; }
    let raf = 0;
    let startTs = 0;
    let started = false;
    const id = window.setTimeout(() => {
      const tick = (ts: number) => {
        if (!started) { startTs = ts; started = true; }
        const t = Math.min(1, (ts - startTs) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(to * eased);
        if (t < 1) raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      window.clearTimeout(id);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [to, durationMs, delayMs, reduced]);

  const out = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
  return <span className={`tab-num ${className}`}>{prefix}{out}{suffix}</span>;
}

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
      <span className={[dot, status === 'live' ? 'pulse-mark' : ''].join(' ')}>
        {glyph}
      </span>
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
      className="tile-fold group flex h-full flex-col border border-rule bg-paper px-5 py-6 transition hover:border-ink hover:bg-ink hover:text-paper lg:px-7 lg:py-8"
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
        <span aria-hidden="true" className="tile-arrow font-mono text-[14px] text-ink group-hover:text-paper">
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
      {/* HERO — broadsheet 2-col on lg, with newsprint grain */}
      <section className="paper-grain border border-rule bg-paper">
        {/* Masthead strap — product status line above the hero grid. */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-2.5 lg:px-12">
          <span className="reveal reveal-d1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink">
            <span aria-hidden="true" className="pulse-mark text-sea">●</span>
            Climate-Risk Underwriting Platform · Live
          </span>
          <span className="reveal reveal-d1 hidden font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:inline">
            v1.0 · Updated {climateTraceAsOf.replace(/-/g, '.')}
          </span>
          <span className="reveal reveal-d1 font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:hidden">
            v1.0
          </span>
        </div>

        <div className="grid lg:grid-cols-[1.6fr_1fr]">
          {/* Left: pitch */}
          <div className="px-5 pt-6 pb-6 lg:px-12 lg:pt-12 lg:pb-10 lg:border-r lg:border-rule">
            <div className="reveal reveal-d2 flex items-center justify-between">
              <Eyebrow>PRISM — Portfolio Risk via Identified Scenario Modeling</Eyebrow>
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                For reinsurance underwriters
              </span>
            </div>

            <h1
              aria-label="Climate risk is a structural driver of expected loss in South-East Asia."
              className="reveal reveal-d3 display mt-5 text-[42px] leading-[0.94] text-ink lg:mt-7 lg:text-[76px]"
            >
              Climate risk is a
              <span className="italic"> structural driver </span>
              of expected loss in
              <br />
              <LoopWord word="South-East Asia" italic />
            </h1>

            <div className="reveal reveal-d4">
              <Hairline className="mt-6 lg:mt-8" strong />
            </div>

            <p className="reveal reveal-d5 mt-5 font-serif text-[16px] italic leading-relaxed text-ink lg:mt-7 lg:text-[20px]">
              On a notional <span className="not-italic font-semibold">USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</span> SEA reinsurance book, the gap between Net Zero 2050 and Hot House 2030 is{' '}
              <span className="not-italic font-semibold">USD {HEADLINE.lossSwingUsdM} m</span> in expected loss — an{' '}
              <span className="not-italic font-semibold">{HEADLINE.lrSwingPp} pp</span> loss-ratio swing.
            </p>

            <p className="reveal reveal-d6 mt-4 text-[12px] text-muted lg:mt-6 lg:text-[13px]">
              PRISM turns World Bank, NGFS and Climate TRACE feeds into a hold-out-tested forecast,
              a forward NGFS stress test, and an underwriter-ready cedent screen. Built for the
              underwriter, not the data scientist.
            </p>
          </div>

          {/* Right: KPI plate — count-ups stagger after the headline lands */}
          <div className="px-5 pt-5 pb-6 lg:px-9 lg:pt-12 lg:pb-10">
            <div className="reveal reveal-d3">
              <Eyebrow>Today · base case</Eyebrow>
            </div>
            <div className="mt-4 space-y-4 lg:mt-6">
              <div className="reveal reveal-d4 border-b border-rule pb-4">
                <StatBig
                  value={
                    <CountUp
                      to={HEADLINE.lossSwingUsdM}
                      prefix="USD "
                      suffix="m"
                      durationMs={1300}
                      delayMs={520}
                    />
                  }
                  label="Loss swing 2030"
                  accent="rust"
                  size="hero"
                />
              </div>
              <div className="reveal reveal-d5 border-b border-rule pb-4">
                <StatBig
                  value={
                    <CountUp
                      to={HEADLINE.lrSwingPp}
                      prefix="+"
                      suffix="pp"
                      durationMs={1100}
                      delayMs={680}
                    />
                  }
                  label="LR delta"
                  accent="amber"
                  size="lg"
                />
              </div>
              <div className="reveal reveal-d6">
                <StatBig
                  value={
                    <CountUp
                      to={HEADLINE.mapeXGBPct}
                      decimals={2}
                      suffix="%"
                      durationMs={1100}
                      delayMs={840}
                    />
                  }
                  label="MAPE 2024"
                  accent="sea"
                  size="lg"
                  hint="XGBoost hold-out · seed 2026"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP — counts animate in after hero settles */}
      <section className="reveal reveal-d7 grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule lg:grid-cols-4">
        {[
          { k: 10, l: 'SEA economies',       delay: 1100 },
          { k: 16, l: 'WDI indicators',      delay: 1200 },
          { k: 35, l: 'Years of history',    delay: 1300 },
          { k: 4,  l: 'NGFS pathways',       delay: 1400 },
        ].map((it) => (
          <div key={it.l} className="bg-paper px-4 py-5 lg:px-6 lg:py-6">
            <div className="display tab-num text-[28px] text-ink lg:text-[40px]">
              <CountUp to={it.k} delayMs={it.delay} durationMs={1000} />
            </div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-eyebrow text-muted">
              {it.l}
            </div>
          </div>
        ))}
      </section>

      {/* DEMO ARC — three tiles */}
      <section className="reveal reveal-d8 border border-rule bg-paper px-5 py-6 lg:px-12 lg:py-10">
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
            blurb="Natural-language scenario via PRISM. Slide elasticity, swap NGFS pathway, see the loss ratio move in real time."
            to="/pricing"
            cta="Price a cedent"
          />
          <DemoTile
            glyph="III"
            eyebrow="Act III · Delivery"
            title="Read the assessment report"
            blurb="The 10-page underwriting memo: cedent tiering, capital ask, parametric product, 2027 cat-bond window."
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
            name="PRISM Assistant"
            endpoint="api.prism.app/agent"
            description="Natural-language scenario input on the Pricing screen — type a memo, get a stressed loss ratio."
            status="live"
            pillLabel="Live"
          />
          <FeedRow
            name="NGFS-IIASA Phase V"
            endpoint="data.ene.iiasa.ac.at/ngfs"
            description="Scenario growth rates for Net Zero 2050, Delayed Transition, Current Policies. Direct API integration."
            status="stub"
            pillLabel="Beta"
          />
          <FeedRow
            name="World Bank WDI"
            endpoint="data360files.worldbank.org/wb_wdi"
            description="Base panel — 16 indicators × 10 SEA economies × 35 years. The reproducibility anchor."
            status="vintage"
            pillLabel="Annual"
          />
        </ul>
      </section>

      {/* FOOTER */}
      <Card tone="paper">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-6">
          <div>
            <Eyebrow>Trusted by</Eyebrow>
            <p className="mt-1 text-[13px] text-ink lg:text-[14px]">
              Hannover Re · climate-risk underwriting
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:text-right">
            v1.0 · Last refresh {climateTraceAsOf}
          </p>
        </div>
      </Card>
    </div>
  );
}
