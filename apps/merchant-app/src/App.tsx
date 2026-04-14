import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore }    from './store/auth.store';
import { useWeb3Store }    from './store/web3.store';
import api                 from './api/client';
import MerchantLayout      from './components/MerchantLayout';
import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import AdsPage             from './pages/AdsPage';
import CreateAdPage        from './pages/CreateAdPage';
import OrdersPage          from './pages/OrdersPage';
import OrderDetailPage     from './pages/OrderDetailPage';
import WalletPage          from './pages/WalletPage';
import EarningsPage        from './pages/EarningsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const initWallet = useWeb3Store((s) => s.initWallet);
  const address = useWeb3Store((s) => s.address);
  const user = useAuthStore((s) => s.user);
  
  useEffect(() => {
    initWallet();
  }, [initWallet]);

  useEffect(() => {
    if (user && address) {
      api.patch('/user/profile', { web3Address: address }).catch(() => {});
    }
  }, [user, address]);

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
      </Route>
    </Routes>
  );
}

