import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';

const META: Record<string, { code: string; title: string; eyebrow: string }> = {
  '/':         { code: '00', title: 'PRISM',      eyebrow: 'Home' },

  // Engagement — Discovery (phase1) replaces the former Phases 1–3.
  '/phase1':   { code: '01', title: 'Discovery',     eyebrow: 'Engagement · Scope · Taxonomy · Indicators' },
  '/phase4':   { code: '02', title: 'Data Pipeline', eyebrow: 'Engagement · Phase 4' },
  '/phase5':   { code: '03', title: 'Modeling',      eyebrow: 'Engagement · Phase 5' },
  '/phase6':   { code: '04', title: 'Strategy',      eyebrow: 'Engagement · Phase 6' },

  // Appendix — the 14 legacy chart-driven screens.
  '/appendix/story':      { code: 'a1',  title: 'Story',      eyebrow: 'Appendix' },
  '/appendix/pipeline':   { code: 'a2',  title: 'Pipeline',   eyebrow: 'Appendix' },
  '/appendix/pricing':    { code: 'a3',  title: 'Pricing',    eyebrow: 'Appendix' },
  '/appendix/report':     { code: 'a4',  title: 'Report',     eyebrow: 'Appendix' },
  '/appendix/stress':     { code: 'a5',  title: 'Stress',     eyebrow: 'Appendix' },
  '/appendix/cedent':     { code: 'a6',  title: 'Cedent',     eyebrow: 'Appendix' },
  '/appendix/brief':      { code: 'a7',  title: 'Brief',      eyebrow: 'Appendix' },
  '/appendix/model':      { code: 'a8',  title: 'Model',      eyebrow: 'Appendix' },
  '/appendix/diagnostic': { code: 'a9',  title: 'Diagnostic', eyebrow: 'Appendix' },
  '/appendix/hotspots':   { code: 'a10', title: 'Hot Spots',  eyebrow: 'Appendix' },
  '/appendix/sectoral':   { code: 'a11', title: 'Sectoral',   eyebrow: 'Appendix' },
  '/appendix/compare':    { code: 'a12', title: 'Compare',    eyebrow: 'Appendix' },
  '/appendix/actions':    { code: 'a13', title: 'Actions',    eyebrow: 'Appendix' },
  '/appendix/evidence':   { code: 'a14', title: 'Evidence',   eyebrow: 'Appendix' },

  // Legacy top-level paths — kept for deep-link survival; same eyebrow as appendix.
  '/pipeline':   { code: 'a2',  title: 'Pipeline',   eyebrow: 'Appendix' },
  '/pricing':    { code: 'a3',  title: 'Pricing',    eyebrow: 'Appendix' },
  '/report':     { code: 'a4',  title: 'Report',     eyebrow: 'Appendix' },
  '/story':      { code: 'a1',  title: 'Story',      eyebrow: 'Appendix' },
  '/stress':     { code: 'a5',  title: 'Stress',     eyebrow: 'Appendix' },
  '/cedent':     { code: 'a6',  title: 'Cedent',     eyebrow: 'Appendix' },
  '/brief':      { code: 'a7',  title: 'Brief',      eyebrow: 'Appendix' },
  '/model':      { code: 'a8',  title: 'Model',      eyebrow: 'Appendix' },
  '/diagnostic': { code: 'a9',  title: 'Diagnostic', eyebrow: 'Appendix' },
  '/hotspots':   { code: 'a10', title: 'Hot Spots',  eyebrow: 'Appendix' },
  '/sectoral':   { code: 'a11', title: 'Sectoral',   eyebrow: 'Appendix' },
  '/compare':    { code: 'a12', title: 'Compare',    eyebrow: 'Appendix' },
  '/actions':    { code: 'a13', title: 'Actions',    eyebrow: 'Appendix' },
  '/evidence':   { code: 'a14', title: 'Evidence',   eyebrow: 'Appendix' },
};

export function Layout() {
  const loc = useLocation();
  const nav = useNavigate();
  const meta = META[loc.pathname] ?? { code: '—', title: 'PRISM', eyebrow: '' };
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isLanding = loc.pathname === '/';
  // Wide screens — drop the canvas constraint so the 5-card pipeline row +
  // pricing simulator can use the full viewport.
  const isFullBleed =
    isLanding ||
    loc.pathname === '/pipeline' ||
    loc.pathname === '/pricing' ||
    loc.pathname === '/appendix/pipeline' ||
    loc.pathname === '/appendix/pricing' ||
    loc.pathname === '/phase1' ||
    loc.pathname === '/phase4';

  useEffect(() => {
    document.title = `${meta.title} — PRISM · SEA Climate Risk`;
    headingRef.current?.focus();
  }, [loc.pathname, meta.title]);

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />

      {!isLanding && (
        <div className="border-b border-rule bg-paper print:hidden">
          <div className="mx-auto flex max-w-shell items-center gap-4 px-5 py-4 lg:px-10 lg:py-5">
            <button
              onClick={() => nav(-1)}
              aria-label="Back"
              className="grid min-h-[36px] min-w-[36px] shrink-0 place-items-center border border-rule text-ink hover:bg-ink/5"
            >
              <span aria-hidden="true">←</span>
            </button>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase leading-none tracking-eyebrow text-muted">
                {meta.code} · {meta.eyebrow}
              </span>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="display text-[22px] leading-none text-ink lg:text-[28px] focus:outline-none"
              >
                {meta.title}
              </h1>
            </div>
          </div>
        </div>
      )}

      <main
        className={
          isLanding
            ? ''
            : isFullBleed
              ? 'w-full px-5 pb-12 pt-5 lg:px-8 lg:pt-8'
              : 'mx-auto w-full max-w-shell px-5 pb-12 pt-5 lg:px-10 lg:pt-8'
        }
      >
        <div className={isLanding || isFullBleed ? '' : 'mx-auto max-w-canvas'}>
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-rule px-5 py-4 lg:px-10 print:hidden">
        <div className="mx-auto flex max-w-shell items-baseline justify-between font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          <span>PRISM · MASA Hackathon 2026</span>
          <span className="tab-num">Pipeline v1.0 · Seed 2026</span>
        </div>
      </footer>
    </div>
  );
}
