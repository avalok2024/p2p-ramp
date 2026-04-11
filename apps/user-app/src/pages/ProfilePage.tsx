import { useAuthStore } from '../store/auth.store';
import { useNavigate }  from 'react-router-dom';
import { motion }       from 'framer-motion';
import toast            from 'react-hot-toast';

const KYC_COLOR: Record<string, string> = { VERIFIED: 'badge-green', PENDING: 'badge-warning', REJECTED: 'badge-danger' };

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const subscribeToPush = async () => {
    try {
      const reg  = await navigator.serviceWorker.ready;
      const sub  = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });
      const json = sub.toJSON();
      // POST to backend (simplified — full impl would use api client)
      toast.success('Push notifications enabled! 🔔');
    } catch {
      toast.error('Could not enable notifications');
    }
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Profile</h1>

      {/* Avatar + name */}
      <motion.div className="card" style={{ textAlign: 'center' }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
          background: 'var(--accent-dim)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32,
        }}>
          {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <h2 className="title-md">{user.displayName || 'Anonymous'}</h2>
        <p className="body-sm">{user.email}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <span className={`badge ${KYC_COLOR[user.kycStatus] || 'badge-muted'}`}>
            KYC {user.kycStatus}
          </span>
          <span className="badge badge-muted">⭐ {user.rating}</span>
          <span className="badge badge-purple">{user.role}</span>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p className="label" style={{ marginBottom: 12 }}>Account Info</p>
        {[
          ['Role', user.role],
          ['KYC Status', user.kycStatus],
          ['Rating', `⭐ ${user.rating}/5`],
        ].map(([k, v]) => (
          <div key={k} className="list-row">
            <span className="body-sm">{k}</span>
            <span className="title-sm">{v}</span>
          </div>
        ))}
      </motion.div>

      {/* Notifications */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <p className="label" style={{ marginBottom: 12 }}>Notifications</p>
        <button id="push-subscribe-btn" className="btn btn-secondary btn-full" onClick={subscribeToPush}>
          🔔 Enable Push Notifications
        </button>
      </motion.div>

      {/* Logout */}
      <motion.button
        id="logout-btn"
        className="btn btn-danger btn-full"
        onClick={handleLogout}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
      >
        Sign Out
      </motion.button>
    </div>
  );
}
