import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <div className="page">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
