import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './screens/Landing';
import { Pipeline } from './screens/Pipeline';

// Chart-heavy / large screens lazy-loaded.
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
const Brief = lazy(() => import('./screens/Brief').then((m) => ({ default: m.Brief })));
const Evidence = lazy(() => import('./screens/Evidence').then((m) => ({ default: m.Evidence })));

function Loading() {
  return (
    <div role="status" aria-live="polite" className="px-1 py-12 text-center font-mono text-[11px] uppercase tracking-eyebrow text-muted">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="pricing" element={<Suspense fallback={<Loading />}><Pricing /></Suspense>} />
          <Route path="report" element={<Suspense fallback={<Loading />}><Report /></Suspense>} />
          <Route path="story" element={<Suspense fallback={<Loading />}><Story /></Suspense>} />
          <Route path="model" element={<Suspense fallback={<Loading />}><Model /></Suspense>} />
          <Route path="diagnostic" element={<Suspense fallback={<Loading />}><Diagnostic /></Suspense>} />
          <Route path="hotspots" element={<Suspense fallback={<Loading />}><HotSpots /></Suspense>} />
          <Route path="sectoral" element={<Suspense fallback={<Loading />}><Sectoral /></Suspense>} />
          <Route path="compare" element={<Suspense fallback={<Loading />}><Compare /></Suspense>} />
          <Route path="stress" element={<Suspense fallback={<Loading />}><Stress /></Suspense>} />
          <Route path="cedent" element={<Suspense fallback={<Loading />}><Cedent /></Suspense>} />
          <Route path="actions" element={<Suspense fallback={<Loading />}><Actions /></Suspense>} />
          <Route path="brief" element={<Suspense fallback={<Loading />}><Brief /></Suspense>} />
          <Route path="evidence" element={<Suspense fallback={<Loading />}><Evidence /></Suspense>} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
