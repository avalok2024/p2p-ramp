import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import AppLayout      from './components/AppLayout';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import HomePage       from './pages/HomePage';
import BuyCryptoPage  from './pages/BuyCryptoPage';
import SellCryptoPage from './pages/SellCryptoPage';
import PaymentPage    from './pages/PaymentPage';
import OrdersPage     from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WalletPage     from './pages/WalletPage';
import ProfilePage    from './pages/ProfilePage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected — all wrapped in AppLayout with bottom nav */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index             element={<HomePage />} />
        <Route path="/buy"       element={<BuyCryptoPage />} />
        <Route path="/sell"      element={<SellCryptoPage />} />
        <Route path="/payment/:orderId" element={<PaymentPage />} />
        <Route path="/orders"    element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        <Route path="/wallet"    element={<WalletPage />} />
        <Route path="/profile"   element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
