import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',        label: 'Home',    icon: '🏠' },
  { to: '/buy',     label: 'Trade',   icon: '💱' },
  { to: '/orders',  label: 'Orders',  icon: '📋' },
  { to: '/wallet',  label: 'Wallet',  icon: '💰' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
