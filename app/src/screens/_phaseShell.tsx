// Shared chrome for Phase 2-6 screens — currently the soft-gate banner that
// appears at the top of every phase when the Phase 1 scoping interview hasn't
// completed. Reads getScopingSnapshot() (sync localStorage read) so render is
// SSR-safe and the gate is purely visual; phase content always renders with
// default SEA × all-LOB scope.

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
