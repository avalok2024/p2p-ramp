import { Outlet, NavLink } from 'react-router-dom';
import { useAdminStore } from '../store/admin.store';
import { useNavigate }   from 'react-router-dom';

const links = [
  { to: '/',           label: 'Dashboard',  icon: '📊' },
  { to: '/disputes',   label: 'Disputes',   icon: '⚖️' },
  { to: '/orders',     label: 'Orders',     icon: '📋' },
  { to: '/users',      label: 'Users',      icon: '👥' },
  { to: '/merchants',  label: 'Merchants',  icon: '🏪' },
  { to: '/audit',      label: 'Audit Logs', icon: '📜' },
  { to: '/wallet',     label: 'Wallet',     icon: '💳' },
];

export default function AdminLayout() {
  const { logout, user } = useAdminStore();
  const navigate = useNavigate();

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <p className="title-sm gradient-text">⚡ RampX Admin</p>
          <p className="body-sm" style={{ marginTop: 4 }}>{user?.email}</p>
        </div>
        <nav className="sidebar-nav">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 10px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-danger" style={{ width: '100%', fontSize: 13 }}
            onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
