import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Icon } from './components/Icon';
import { isDemoMode } from './lib/supabase';
import RepReview from './pages/RepReview';
import ZoneGame from './pages/ZoneGame';
import BlockingMap from './pages/BlockingMap';
import CatcherPage from './pages/CatcherPage';
import ModelPlan from './pages/ModelPlan';

const NAV = [
  { to: '/review', label: 'Rep Review', icon: 'review' },
  { to: '/zone', label: 'Zone Game', icon: 'zone' },
  { to: '/blocking', label: 'Blocking Map', icon: 'block' },
  { to: '/catcher', label: 'Catcher Page', icon: 'person' },
  { to: '/model', label: 'Strike/Ball Model', icon: 'model' },
];

export default function App() {
  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark"><Icon name="target" /></div>
          <div><b>BATTERY LAB</b><small>CATCHING DEVELOPMENT</small></div>
        </div>
        <nav className="nav" aria-label="Sections">
          <div className="eyebrow">Catcher tools</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}><Icon name={n.icon} />{n.label}</NavLink>
          ))}
        </nav>
        {isDemoMode && (
          <div className="rail-foot">
            <div className="eyebrow">Demo mode</div>
            Sample data. Uploads and logs stay in this tab until Supabase is connected.
          </div>
        )}
      </aside>
      <main>
        <Routes>
          <Route path="/review" element={<RepReview />} />
          <Route path="/zone" element={<ZoneGame />} />
          <Route path="/blocking" element={<BlockingMap />} />
          <Route path="/catcher" element={<CatcherPage />} />
          <Route path="/model" element={<ModelPlan />} />
          <Route path="*" element={<Navigate to="/review" replace />} />
        </Routes>
      </main>
    </div>
  );
}
