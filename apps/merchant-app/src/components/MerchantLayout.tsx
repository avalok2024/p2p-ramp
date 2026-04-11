import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',         label: 'Dashboard', icon: '📊' },
  { to: '/ads',      label: 'Ads',       icon: '📢' },
  { to: '/orders',   label: 'Orders',    icon: '📋' },
  { to: '/earnings', label: 'Earnings',  icon: '💹' },
  { to: '/wallet',   label: 'Wallet',    icon: '💰' },
];

export default function MerchantLayout() {
  return (
    <div className="app-shell">
      <div className="page"><Outlet /></div>
      <nav className="bottom-nav">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
