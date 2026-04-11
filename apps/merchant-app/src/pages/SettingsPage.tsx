import { useAuthStore } from '../store/auth.store';
import { useNavigate }  from 'react-router-dom';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg" style={{ paddingTop: 16 }}>Settings</h1>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--accent-dim)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {user?.displayName?.[0]?.toUpperCase() || '🏪'}
        </div>
        <p className="title-md">{user?.displayName}</p>
        <p className="body-sm">{user?.email}</p>
        <span className="badge badge-purple" style={{ marginTop: 8 }}>MERCHANT</span>
      </div>
      <button id="m-logout-btn" className="btn btn-danger btn-full" onClick={() => { logout(); navigate('/login'); }}>
        Sign Out
      </button>
    </div>
  );
}
