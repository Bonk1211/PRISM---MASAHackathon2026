// Phase 6 — pure interactive pricing simulator. Final phase; back-only nav.
import { Pricing } from './Pricing';
import { PhaseFooterNav } from './_phaseShell';

export function Phase6Strategy() {
  return (
    <>
      <Pricing />
      <PhaseFooterNav
        prev={{ to: '/phase5', label: 'Phase 5' }}
        next={{ to: '/', label: 'Done · Home' }}
      />
    </>
  );
}
