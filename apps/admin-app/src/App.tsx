import { Routes, Route, Navigate } from 'react-router-dom';
import { useAdminStore }   from './store/admin.store';
import AdminLayout         from './components/AdminLayout';
import LoginPage           from './pages/LoginPage';
import DashboardPage       from './pages/DashboardPage';
import DisputesPage        from './pages/DisputesPage';
import DisputeDetailPage   from './pages/DisputeDetailPage';
import OrdersPage          from './pages/OrdersPage';
import UsersPage           from './pages/UsersPage';
import MerchantsPage       from './pages/MerchantsPage';
import AuditLogsPage       from './pages/AuditLogsPage';
import WalletPage          from './pages/WalletPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = useAdminStore((s: any) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index                    element={<DashboardPage />} />
        <Route path="/disputes"         element={<DisputesPage />} />
        <Route path="/disputes/:id"     element={<DisputeDetailPage />} />
        <Route path="/orders"           element={<OrdersPage />} />
        <Route path="/users"            element={<UsersPage />} />
        <Route path="/merchants"        element={<MerchantsPage />} />
        <Route path="/audit"            element={<AuditLogsPage />} />
        <Route path="/wallet"           element={<WalletPage />} />
      </Route>
    </Routes>
  );
}
