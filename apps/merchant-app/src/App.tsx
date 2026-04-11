import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore }    from './store/auth.store';
import MerchantLayout      from './components/MerchantLayout';
import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import AdsPage             from './pages/AdsPage';
import CreateAdPage        from './pages/CreateAdPage';
import OrdersPage          from './pages/OrdersPage';
import OrderDetailPage     from './pages/OrderDetailPage';
import WalletPage          from './pages/WalletPage';
import EarningsPage        from './pages/EarningsPage';
import SettingsPage        from './pages/SettingsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><MerchantLayout /></RequireAuth>}>
        <Route index              element={<DashboardPage />} />
        <Route path="/ads"        element={<AdsPage />} />
        <Route path="/ads/create" element={<CreateAdPage />} />
        <Route path="/orders"     element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/wallet"     element={<WalletPage />} />
        <Route path="/earnings"   element={<EarningsPage />} />
        <Route path="/settings"   element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

