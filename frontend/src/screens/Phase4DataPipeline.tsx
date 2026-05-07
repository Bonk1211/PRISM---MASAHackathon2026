// Phase 4 — pure interactive data pipeline. The Pipeline screen already has
// the live /predict feature sliders + 5-stage trace. PhaseFooterNav adds the
// floating Continue button so judges advance without typing URLs.
import { Pipeline } from './Pipeline';
import { PhaseFooterNav } from './_phaseShell';

export function Phase4DataPipeline() {
  return (
    <>
      <Pipeline />
      <PhaseFooterNav
        prev={{ to: '/phase3', label: 'Phase 3' }}
        next={{ to: '/phase5', label: 'Phase 5 · Modeling' }}
      />
    </>
  );
}
