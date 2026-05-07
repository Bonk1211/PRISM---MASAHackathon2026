import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { Landing } from './screens/Landing';
import { Onboarding } from './screens/Onboarding';
import { Pipeline } from './screens/Pipeline';

// Engagement Phase 1–6 screens (lazy).
// Phase 1 = Discovery — consolidated chat + taxonomy + indicators in one tab.
const Phase1Discovery = lazy(() =>
  import('./screens/Phase1Discovery').then((m) => ({ default: m.Phase1Discovery })),
);
const Phase4DataPipeline = lazy(() =>
  import('./screens/Phase4DataPipeline').then((m) => ({ default: m.Phase4DataPipeline })),
);
const Phase6Strategy = lazy(() =>
  import('./screens/Phase6Strategy').then((m) => ({ default: m.Phase6Strategy })),
);

// Appendix — the 14 chart-driven screens, demoted under /appendix/*.
const Pricing = lazy(() => import('./screens/Pricing').then((m) => ({ default: m.Pricing })));
const Report = lazy(() => import('./screens/Report').then((m) => ({ default: m.Report })));
const Story = lazy(() => import('./screens/Story').then((m) => ({ default: m.Story })));
const Model = lazy(() => import('./screens/Model').then((m) => ({ default: m.Model })));
const Diagnostic = lazy(() => import('./screens/Diagnostic').then((m) => ({ default: m.Diagnostic })));
const HotSpots = lazy(() => import('./screens/HotSpots').then((m) => ({ default: m.HotSpots })));
const Sectoral = lazy(() => import('./screens/Sectoral').then((m) => ({ default: m.Sectoral })));
const Compare = lazy(() => import('./screens/Compare').then((m) => ({ default: m.Compare })));
const Stress = lazy(() => import('./screens/Stress').then((m) => ({ default: m.Stress })));
const Cedent = lazy(() => import('./screens/Cedent').then((m) => ({ default: m.Cedent })));
const Actions = lazy(() => import('./screens/Actions').then((m) => ({ default: m.Actions })));
const Evidence = lazy(() => import('./screens/Evidence').then((m) => ({ default: m.Evidence })));

function Loading() {
  return (
    <div role="status" aria-live="polite" className="px-1 py-12 text-center font-mono text-[11px] uppercase tracking-eyebrow text-muted">
      Loading…
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public — onboarding has no chrome and no auth requirement. */}
        <Route path="onboarding" element={<Onboarding />} />

        {/* Everything below the AuthGuard requires a Supabase session. */}
        <Route element={<AuthGuard />}>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />

          {/* Engagement — primary navigation. Discovery (phase1) consolidates the
              former Phase 1 (scoping), Phase 2 (taxonomy), and Phase 3 (indicators)
              into a single LLM-driven flow. Legacy /phase2 + /phase3 deep-links
              redirect back to discovery to keep external bookmarks alive. */}
          <Route path="phase1" element={<L><Phase1Discovery /></L>} />
          <Route path="phase2" element={<Navigate to="/phase1" replace />} />
          <Route path="phase3" element={<Navigate to="/phase1" replace />} />
          <Route path="phase4" element={<L><Phase4DataPipeline /></L>} />
          <Route path="phase5" element={<Navigate to="/phase6" replace />} />
          <Route path="phase6" element={<L><Phase6Strategy /></L>} />

          {/* Appendix — the 14 legacy chart-driven screens */}
          <Route path="appendix/pipeline"   element={<Pipeline />} />
          <Route path="appendix/pricing"    element={<L><Pricing /></L>} />
          <Route path="appendix/report"     element={<L><Report /></L>} />
          <Route path="appendix/story"      element={<L><Story /></L>} />
          <Route path="appendix/model"      element={<L><Model /></L>} />
          <Route path="appendix/diagnostic" element={<L><Diagnostic /></L>} />
          <Route path="appendix/hotspots"   element={<L><HotSpots /></L>} />
          <Route path="appendix/sectoral"   element={<L><Sectoral /></L>} />
          <Route path="appendix/compare"    element={<L><Compare /></L>} />
          <Route path="appendix/stress"     element={<L><Stress /></L>} />
          <Route path="appendix/cedent"     element={<L><Cedent /></L>} />
          <Route path="appendix/actions"    element={<L><Actions /></L>} />
          <Route path="appendix/brief"      element={<Navigate to="/appendix/report" replace />} />
          <Route path="appendix/evidence"   element={<L><Evidence /></L>} />

          {/* Legacy top-level paths — preserve deep-link survival via redirect. */}
          <Route path="pipeline"   element={<Navigate to="/appendix/pipeline" replace />} />
          <Route path="pricing"    element={<Navigate to="/appendix/pricing" replace />} />
          <Route path="report"     element={<Navigate to="/appendix/report" replace />} />
          <Route path="story"      element={<Navigate to="/appendix/story" replace />} />
          <Route path="model"      element={<Navigate to="/appendix/model" replace />} />
          <Route path="diagnostic" element={<Navigate to="/appendix/diagnostic" replace />} />
          <Route path="hotspots"   element={<Navigate to="/appendix/hotspots" replace />} />
          <Route path="sectoral"   element={<Navigate to="/appendix/sectoral" replace />} />
          <Route path="compare"    element={<Navigate to="/appendix/compare" replace />} />
          <Route path="stress"     element={<Navigate to="/appendix/stress" replace />} />
          <Route path="cedent"     element={<Navigate to="/appendix/cedent" replace />} />
          <Route path="actions"    element={<Navigate to="/appendix/actions" replace />} />
          <Route path="brief"      element={<Navigate to="/appendix/report" replace />} />
          <Route path="evidence"   element={<Navigate to="/appendix/evidence" replace />} />

          <Route path="*" element={<Landing />} />
        </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
