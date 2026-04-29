import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
  const loc = useLocation();
  const nav = useNavigate();
  const titleByPath: Record<string, string> = {
    '/': 'R-Ignite',
    '/model': 'Model & Forecast',
    '/hotspots': 'SEA Hot Spots',
    '/stress': '2030 Stress Test',
    '/cedent': 'Cedent Screening',
    '/actions': 'Recommendations',
  };
  const title = titleByPath[loc.pathname] ?? 'R-Ignite';
  const showBack = loc.pathname === '/actions';

  return (
    <div className="mx-auto flex min-h-full max-w-app flex-col bg-paper">
      <header
        className="sticky top-0 z-20 border-b border-black/5 bg-paper/95 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {showBack ? (
              <button
                onClick={() => nav(-1)}
                aria-label="Back"
                className="rounded-full p-1 text-ink hover:bg-black/5"
              >
                ←
              </button>
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[11px] font-bold text-paper">
                R·I
              </span>
            )}
            <span className="text-sm font-semibold tracking-tight text-ink">{title}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted">
            MASA · 2026
          </span>
        </div>
      </header>

      <main
        className="flex-1 px-4 pb-28 pt-3"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0))' }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
