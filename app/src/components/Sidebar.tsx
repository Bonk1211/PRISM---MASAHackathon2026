import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useFocusTrap } from '../lib/useFocusTrap';

type Tab = { to: string; code: string; label: string; tag?: string };
type Section = { name: string; tabs: Tab[]; dim?: boolean };

const SECTIONS: Section[] = [
  {
    name: 'Frame',
    tabs: [
      { to: '/',           code: '01', label: 'Story',     tag: 'Front page' },
    ],
  },
  {
    name: 'Method',
    tabs: [
      { to: '/pipeline',   code: '02', label: 'Pipeline',  tag: 'Live model · 5 stages' },
    ],
  },
  {
    name: 'Pricing',
    tabs: [
      { to: '/stress',     code: '03', label: 'Stress',    tag: 'NGFS · ε live' },
      { to: '/cedent',     code: '04', label: 'Cedent',    tag: 'Composite tier' },
    ],
  },
  {
    name: 'Delivery',
    tabs: [
      { to: '/brief',      code: '05', label: 'Brief',     tag: 'Memo export' },
    ],
  },
  {
    name: 'Appendix',
    dim: true,
    tabs: [
      { to: '/model',      code: 'a', label: 'Model',      tag: 'Forecast' },
      { to: '/diagnostic', code: 'b', label: 'Diagnostic', tag: 'Sign-flips' },
      { to: '/hotspots',   code: 'c', label: 'Hot Spots',  tag: 'VN vs PH' },
      { to: '/sectoral',   code: 'd', label: 'Sectoral',   tag: '10 × 8 heatmap' },
      { to: '/compare',    code: 'e', label: 'Compare',    tag: 'Side-by-side' },
      { to: '/actions',    code: 'f', label: 'Actions',    tag: 'Four recs' },
      { to: '/evidence',   code: 'g', label: 'Evidence',   tag: 'Trace-back' },
    ],
  },
];

export function Sidebar({
  isDrawerOpen = false,
  onCloseDrawer,
}: {
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
} = {}) {
  const loc = useLocation();

  // Auto-close drawer on route change
  useEffect(() => {
    if (isDrawerOpen && onCloseDrawer) onCloseDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.pathname]);

  // Focus-trap is only active for the mobile drawer (when isDrawerOpen). On
  // desktop the sidebar is part of the layout and shouldn't trap.
  const trapRef = useFocusTrap<HTMLElement>(isDrawerOpen, onCloseDrawer);

  return (
    <>
      {/* Mobile drawer scrim */}
      {isDrawerOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseDrawer}
          className="fixed inset-0 z-30 cursor-pointer bg-ink/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        ref={trapRef as React.RefObject<HTMLElement>}
        aria-label="Sections"
        role={isDrawerOpen ? 'dialog' : undefined}
        aria-modal={isDrawerOpen || undefined}
        className={[
          // Mobile: slide-out drawer
          'fixed inset-y-0 left-0 z-40 w-[280px] flex-col border-r border-rule bg-paper px-5 py-7 transition-transform',
          isDrawerOpen ? 'flex translate-x-0' : 'hidden -translate-x-full',
          // Desktop: always visible sticky rail
          'lg:sticky lg:top-0 lg:z-10 lg:flex lg:h-screen lg:translate-x-0 lg:bg-paper/70',
        ].join(' ')}
      >
        {/* Masthead */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="display text-[26px] leading-none text-ink">R</span>
              <span aria-hidden="true" className="h-[18px] w-[1px] bg-rule-strong" />
              <span className="display italic text-[26px] leading-none text-ink">Ignite</span>
            </div>
            {onCloseDrawer && (
              <button
                onClick={onCloseDrawer}
                aria-label="Close"
                className="font-mono text-[14px] text-muted hover:text-ink lg:hidden"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            SEA Climate Risk · 2026
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-rule pt-3">
            <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
              Hannover Re
            </span>
            <span className="h-[1px] flex-1 bg-rule" />
            <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
              Strategic
            </span>
          </div>
        </div>

        {/* Sections */}
        <nav className="mt-6 flex-1 overflow-y-auto no-scrollbar">
          {SECTIONS.map((s) => (
            <div key={s.name} className={['mb-5 last:mb-0', s.dim ? 'mt-3 border-t border-rule pt-4 opacity-70' : ''].join(' ')}>
              <p className="eyebrow text-muted">{s.name}</p>
              <ul className="mt-2 space-y-px">
                {s.tabs.map((t) => (
                  <li key={t.to}>
                    <NavLink
                      to={t.to}
                      end={t.to === '/'}
                      className={({ isActive }) =>
                        [
                          'group grid grid-cols-[28px_1fr] items-baseline gap-2 px-2 py-2 transition',
                          isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.04]',
                          s.dim ? 'py-1' : '',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={['font-mono text-[10px] tab-num', isActive ? 'text-paper/80' : 'text-muted'].join(' ')}>
                            {t.code}
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className={s.dim ? 'text-[12px]' : 'text-[13px]'}>{t.label}</span>
                            {t.tag && !s.dim && (
                              <span
                                className={[
                                  'mt-0.5 text-[10px]',
                                  isActive ? 'text-paper/60' : 'text-muted',
                                ].join(' ')}
                              >
                                {t.tag}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <footer className="border-t border-rule pt-4">
          <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
            Folio 2026/05 · MASA Grand Final
          </p>
          <p className="mt-1 font-mono text-[9px] tab-num text-muted">
            Pipeline · Python v1.0 · Seed 2026
          </p>
        </footer>
      </aside>
    </>
  );
}
