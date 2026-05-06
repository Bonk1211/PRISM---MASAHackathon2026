import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopNav } from './TopNav';

const META: Record<string, { code: string; title: string; eyebrow: string }> = {
  '/':           { code: '00', title: 'R-Ignite',   eyebrow: 'Home' },
  '/pipeline':   { code: '01', title: 'Pipeline',   eyebrow: 'Method' },
  '/pricing':    { code: '02', title: 'Pricing',    eyebrow: 'Simulator' },
  '/report':     { code: '03', title: 'Report',     eyebrow: 'Delivery' },
  '/story':      { code: 'a', title: 'Story',      eyebrow: 'Appendix' },
  '/stress':     { code: 'b', title: 'Stress',     eyebrow: 'Appendix' },
  '/cedent':     { code: 'c', title: 'Cedent',     eyebrow: 'Appendix' },
  '/brief':      { code: 'd', title: 'Brief',      eyebrow: 'Appendix' },
  '/model':      { code: 'e', title: 'Model',      eyebrow: 'Appendix' },
  '/diagnostic': { code: 'f', title: 'Diagnostic', eyebrow: 'Appendix' },
  '/hotspots':   { code: 'g', title: 'Hot Spots',  eyebrow: 'Appendix' },
  '/sectoral':   { code: 'h', title: 'Sectoral',   eyebrow: 'Appendix' },
  '/compare':    { code: 'i', title: 'Compare',    eyebrow: 'Appendix' },
  '/actions':    { code: 'j', title: 'Actions',    eyebrow: 'Appendix' },
  '/evidence':   { code: 'k', title: 'Evidence',   eyebrow: 'Appendix' },
};

export function Layout() {
  const loc = useLocation();
  const nav = useNavigate();
  const meta = META[loc.pathname] ?? { code: '—', title: 'R-Ignite', eyebrow: '' };
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isLanding = loc.pathname === '/';
  // Wide screens — drop the canvas constraint so the 5-card pipeline row +
  // pricing simulator can use the full viewport.
  const isFullBleed = isLanding || loc.pathname === '/pipeline' || loc.pathname === '/pricing';

  useEffect(() => {
    document.title = `${meta.title} — R-Ignite · SEA Climate Risk`;
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
          <span>R·Ignite · MASA Hackathon 2026</span>
          <span className="tab-num">Pipeline v1.0 · Seed 2026</span>
        </div>
      </footer>
    </div>
  );
}
