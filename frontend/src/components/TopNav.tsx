import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DataFreshnessPill } from './DataFreshnessPill';
import { UserMenu } from './UserMenu';
import { useFocusTrap } from '../lib/useFocusTrap';

type Tab = { to: string; code: string; label: string; tag?: string };

// PRIMARY = the consulting engagement, condensed. Discovery (phase1) merges
// the former Scoping + Taxonomy + Indicators tabs into one ILMU-driven step.
const PRIMARY: Tab[] = [
  { to: '/',                code: '00', label: 'Home' },
  { to: '/phase1',          code: '01', label: 'Discovery',  tag: 'Scope · taxonomy · indicators' },
  { to: '/phase4',          code: '02', label: 'Pipeline',   tag: 'Phase 4' },
  { to: '/phase5',          code: '03', label: 'Modeling',   tag: 'Phase 5' },
  { to: '/phase6',          code: '04', label: 'Strategy',   tag: 'Phase 6' },
  { to: '/appendix/report', code: '05', label: 'Report',     tag: 'Memo' },
];

// APPENDIX hidden from primary nav. Routes still resolve for deep links and
// for screens embedded inside Phase shells. Surface only via "more" overflow
// when needed in the future — for now PRIMARY is the entire user journey.
const APPENDIX: Tab[] = [];

export function TopNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setMoreOpen(false);
    setDrawerOpen(false);
  }, [loc.pathname]);

  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const trapRef = useFocusTrap<HTMLDivElement>(drawerOpen, () => setDrawerOpen(false));

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-5 py-3 lg:px-10 lg:py-4">
        <NavLink to="/" end className="flex shrink-0 items-baseline gap-2">
          <span className="display italic text-[22px] leading-none text-ink">PRISM</span>
        </NavLink>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {PRIMARY.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-baseline gap-2 px-3 py-2 transition',
                  isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.04]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'font-mono text-[10px] tab-num',
                      isActive ? 'text-paper/70' : 'text-muted',
                    ].join(' ')}
                  >
                    {t.code}
                  </span>
                  <span className="text-[13px]">{t.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={[
                'flex items-baseline gap-1 px-3 py-2 transition',
                moreOpen ? 'bg-ink/[0.06] text-ink' : 'text-ink hover:bg-ink/[0.04]',
              ].join(' ')}
            >
              <span className="text-[13px]">Appendix</span>
              <span aria-hidden="true" className="font-mono text-[10px]">▾</span>
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-[300px] border border-rule bg-paper shadow-plate"
              >
                <p className="eyebrow border-b border-rule px-3 py-2 text-muted">Appendix · 14 legacy screens</p>
                <ul className="max-h-[60vh] overflow-y-auto">
                  {APPENDIX.map((t) => (
                    <li key={t.to}>
                      <NavLink
                        to={t.to}
                        role="menuitem"
                        className={({ isActive }) =>
                          [
                            'grid grid-cols-[34px_1fr] items-baseline gap-2 px-3 py-2',
                            isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.04]',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={[
                                'font-mono text-[10px] tab-num',
                                isActive ? 'text-paper/70' : 'text-muted',
                              ].join(' ')}
                            >
                              {t.code}
                            </span>
                            <span className="flex flex-col leading-tight">
                              <span className="text-[13px]">{t.label}</span>
                              {t.tag && (
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
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <DataFreshnessPill />
          <UserMenu />
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="grid min-h-[36px] min-w-[36px] place-items-center border border-rule text-ink hover:bg-ink/5 lg:hidden"
          >
            <span aria-hidden="true" className="font-mono text-[14px] leading-none">≡</span>
          </button>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 cursor-pointer bg-ink/45 backdrop-blur-[2px] lg:hidden"
          />
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 right-0 z-50 w-[300px] overflow-y-auto border-l border-rule bg-paper px-5 py-7 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow text-muted">Engagement</p>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="font-mono text-[14px] text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            <nav aria-label="Primary mobile" className="mt-4">
              <ul className="space-y-px">
                {PRIMARY.map((t) => (
                  <li key={t.to}>
                    <NavLink
                      to={t.to}
                      end={t.to === '/'}
                      className={({ isActive }) =>
                        [
                          'grid grid-cols-[34px_1fr] items-baseline gap-2 px-2 py-2',
                          isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.04]',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={[
                              'font-mono text-[10px] tab-num',
                              isActive ? 'text-paper/70' : 'text-muted',
                            ].join(' ')}
                          >
                            {t.code}
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className="text-[13px]">{t.label}</span>
                            {t.tag && (
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

              <div className="mt-5 border-t border-rule pt-4 opacity-80">
                <p className="eyebrow text-muted">Appendix · legacy screens</p>
                <ul className="mt-2 space-y-px">
                  {APPENDIX.map((t) => (
                    <li key={t.to}>
                      <NavLink
                        to={t.to}
                        className={({ isActive }) =>
                          [
                            'grid grid-cols-[34px_1fr] items-baseline gap-2 px-2 py-1.5',
                            isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/[0.04]',
                          ].join(' ')
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={[
                                'font-mono text-[10px] tab-num',
                                isActive ? 'text-paper/70' : 'text-muted',
                              ].join(' ')}
                            >
                              {t.code}
                            </span>
                            <span className="text-[12px]">{t.label}</span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            <p className="mt-6 border-t border-rule pt-4 font-mono text-[9px] uppercase tracking-eyebrow text-muted">
              Hannover Re · Strategic Partner
            </p>
          </div>
        </>
      )}
    </header>
  );
}
