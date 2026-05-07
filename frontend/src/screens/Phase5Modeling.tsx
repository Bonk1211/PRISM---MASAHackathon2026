// Phase 5 — pure interactive NGFS scenario stress.
import { Stress } from './Stress';
import { PhaseFooterNav } from './_phaseShell';

export function Phase5Modeling() {
  return (
    <>
      <Stress />
      <PhaseFooterNav
        prev={{ to: '/phase4', label: 'Phase 4' }}
        next={{ to: '/phase6', label: 'Phase 6 · Strategy' }}
      />
    </>
  );
}
