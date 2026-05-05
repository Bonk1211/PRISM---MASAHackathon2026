import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const META: Record<string, { code: string; title: string; eyebrow: string }> = {
  '/':           { code: '01', title: 'Story',      eyebrow: 'Frame' },
  '/pipeline':   { code: '02', title: 'Pipeline',   eyebrow: 'Method' },
  '/stress':     { code: '03', title: 'Stress',     eyebrow: 'Pricing' },
  '/cedent':     { code: '04', title: 'Cedent',     eyebrow: 'Pricing' },
  '/brief':      { code: '05', title: 'Brief',      eyebrow: 'Delivery' },
  '/model':      { code: 'a', title: 'Model',      eyebrow: 'Appendix' },
  '/diagnostic': { code: 'b', title: 'Diagnostic', eyebrow: 'Appendix' },
  '/hotspots':   { code: 'c', title: 'Hot Spots',  eyebrow: 'Appendix' },
  '/sectoral':   { code: 'd', title: 'Sectoral',   eyebrow: 'Appendix' },
  '/compare':    { code: 'e', title: 'Compare',    eyebrow: 'Appendix' },
  '/actions':    { code: 'f', title: 'Actions',    eyebrow: 'Appendix' },
  '/evidence':   { code: 'g', title: 'Evidence',   eyebrow: 'Appendix' },
};

export function Layout() {
  const loc = useLocation();
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meta = META[loc.pathname] ?? { code: '—', title: 'R-Ignite', eyebrow: '' };
  const showBack = loc.pathname !== '/';
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Per-route document.title and SR focus on heading after navigation.
  useEffect(() => {
    document.title = `${meta.title} — R-Ignite · SEA Climate Risk`;
    headingRef.current?.focus();
  }, [loc.pathname, meta.title]);

  return (
    <div className="mx-auto min-h-full max-w-shell lg:grid lg:grid-cols-shell">
      <Sidebar isDrawerOpen={drawerOpen} onCloseDrawer={() => setDrawerOpen(false)} />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-rule bg-paper/92 backdrop-blur">
          {/* Compact top bar — hamburger + wordmark on mobile, hidden on lg (sidebar handles masthead) */}
          <div className="flex items-center justify-between px-5 py-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                className="grid min-h-[36px] min-w-[36px] place-items-center border border-rule text-ink hover:bg-ink/5"
              >
                <span aria-hidden="true" className="font-mono text-[14px] leading-none">≡</span>
              </button>
              <Wordmark />
            </div>
            <div className="flex items-center gap-2 text-[9px] uppercase tracking-eyebrow text-muted">
              <span>Hannover Re</span>
              <span aria-hidden="true" className="h-[1px] w-3 bg-rule-strong" />
              <span>Strategic</span>
            </div>
          </div>

          {/* Section line */}
          <div className="flex items-center justify-between border-t border-rule px-5 py-2.5 lg:border-t-0 lg:px-10 lg:py-4">
            <div className="flex items-center gap-3 lg:gap-5">
              {showBack && (
                <button
                  onClick={() => nav(-1)}
                  aria-label="Back"
                  className="grid min-h-[36px] min-w-[36px] place-items-center border border-rule text-ink hover:bg-ink/5"
                >
                  <span aria-hidden="true">←</span>
                </button>
              )}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                  {meta.code} · {meta.eyebrow}
                </p>
                <h1 ref={headingRef} tabIndex={-1} className="display text-[22px] leading-none text-ink lg:text-[28px] focus:outline-none">
                  {meta.title}
                </h1>
              </div>
            </div>
            <FolioStamp />
          </div>
        </header>

        <main className="flex-1 px-5 pb-12 pt-5 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-canvas">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-rule px-5 py-4 lg:px-10">
          <div className="mx-auto flex max-w-canvas items-baseline justify-between font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            <span>R·Ignite · MASA Hackathon 2026</span>
            <span className="tab-num">Pipeline v1.0 · Seed 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="display text-[20px] leading-none text-ink">R</span>
      <span aria-hidden="true" className="h-[14px] w-[1px] bg-rule-strong" />
      <span className="display italic text-[20px] leading-none text-ink">Ignite</span>
    </span>
  );
}

function FolioStamp() {
  return (
    <div className="text-right">
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">Folio</p>
      <p className="font-mono text-[11px] tab-num text-ink">SEA · 2026</p>
    </div>
  );
}
