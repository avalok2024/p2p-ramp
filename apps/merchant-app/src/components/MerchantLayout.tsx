import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import ProfileModal from './ProfileModal';

const tabs = [
  { to: '/',         label: 'Dashboard', icon: '📊' },
  { to: '/ads',      label: 'Ads',       icon: '📢' },
  { to: '/orders',   label: 'Orders',    icon: '📋' },
  { to: '/earnings', label: 'Earnings',  icon: '💹' },
  { to: '/wallet',   label: 'Wallet',    icon: '💰' },
];

export default function MerchantLayout() {
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="app-shell">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', zIndex: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0, background: 'linear-gradient(90deg, #6ee7b7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>MERCHANT RAMP</h2>
        
        <button 
          onClick={() => setShowProfile(true)}
          style={{ 
            width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', 
            border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', fontSize: 18, cursor: 'pointer', padding: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          {user?.displayName?.[0]?.toUpperCase() || '🏪'}
        </button>
      </div>
      
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      
      <div className="page" style={{ paddingTop: 0 }}><Outlet /></div>
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
