// Shared chrome for Phase 2-6 screens.
// - ScopeBanner: top soft-gate when Phase 1 is incomplete.
// - PhaseFooterNav: floating Continue-to-next-phase CTA so the judge can walk
//   the engagement linearly without typing routes.

import { Link } from 'react-router-dom';
import { getScopingSnapshot } from '../lib/scoping';

export function ScopeBanner() {
  const profile = getScopingSnapshot();
  if (profile.complete) return null;

  return (
    <div className="border border-amber/60 bg-amber/5 px-4 py-3 text-[12px] text-ink lg:px-5 lg:py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-amber">
            Demo mode ·
          </span>{' '}
          using default <b>SEA × all-LOB</b> scope.
        </p>
        <Link
          to="/phase1"
          className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
        >
          Run Phase 1 to customize →
        </Link>
      </div>
    </div>
  );
}

type PhaseFooterNavProps = {
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
};

// Floating bottom bar used by phases that wrap an existing standalone screen
// (Phase 4/5/6). Sticky to viewport so it follows long scroll. Clicks the
// route — no URL knowledge required from the user.
export function PhaseFooterNav({ prev, next }: PhaseFooterNavProps) {
  if (!prev && !next) return null;
  return (
    <div className="pointer-events-none sticky bottom-3 z-30 mt-4 flex justify-end px-3 lg:bottom-5 lg:px-5">
      <div className="pointer-events-auto flex items-center gap-2 border border-ink bg-paper px-2 py-1.5 shadow-[0_4px_18px_rgba(10,26,42,0.10)]">
        {prev && (
          <Link
            to={prev.to}
            className="border border-rule bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-ink transition hover:border-ink"
          >
            ← {prev.label}
          </Link>
        )}
        {next && (
          <Link
            to={next.to}
            className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-paper transition hover:bg-paper hover:text-ink"
          >
            {next.label} →
          </Link>
        )}
      </div>
    </div>
  );
}
