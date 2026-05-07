// Phase 6 — pure interactive pricing simulator. Final phase; back-only nav.
import { Pricing } from './Pricing';
import { PhaseFooterNav } from './_phaseShell';

export function Phase6Strategy() {
  return (
    <>
      <Pricing />
      <PhaseFooterNav
        prev={{ to: '/phase4', label: 'Phase 4 · Pipeline' }}
        next={{ to: '/', label: 'Done · Home' }}
      />
    </>
  );
}
