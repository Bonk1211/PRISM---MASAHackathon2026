import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Story } from './screens/Story';
import { Model } from './screens/Model';
import { HotSpots } from './screens/HotSpots';
import { Stress } from './screens/Stress';
import { Cedent } from './screens/Cedent';
import { Actions } from './screens/Actions';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Story />} />
          <Route path="model" element={<Model />} />
          <Route path="hotspots" element={<HotSpots />} />
          <Route path="stress" element={<Stress />} />
          <Route path="cedent" element={<Cedent />} />
          <Route path="actions" element={<Actions />} />
          <Route path="*" element={<Story />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
