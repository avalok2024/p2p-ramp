import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 20px', zIndex: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #fbcfe8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>RampX</h2>
      </div>
      <div className="page" style={{ paddingTop: 0 }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
