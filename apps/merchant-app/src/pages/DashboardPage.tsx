import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [orders, setOrders]   = useState<any[]>([]);
  const [wallet, setWallet]   = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data));
    api.get('/wallet').then(r => setWallet(r.data.find((w: any) => w.crypto === 'USDT')));
  }, []);

  const pending = orders.filter(o => o.status === 'PAID_MARKED').length;
  const completed = orders.filter(o => o.status === 'COMPLETED').length;
  const volume = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + +o.fiatAmount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm">Welcome back 👋</p>
        <h1 className="title-lg">{user?.displayName || 'Merchant'}</h1>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'USDT Balance', value: wallet ? (+wallet.availableBalance).toFixed(2) : '—', unit: 'USDT', cls: 'card-glow' },
          { label: 'Locked',       value: wallet ? (+wallet.lockedBalance).toFixed(2) : '—',    unit: 'USDT', cls: '' },
          { label: 'Pending',      value: pending,    unit: 'orders', cls: pending > 0 ? 'card-warning' : '' },
          { label: 'Completed',    value: completed,  unit: 'orders', cls: 'card-glow' },
        ].map((s, i) => (
          <motion.div key={s.label} className={`card ${s.cls}`}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}>
            <p className="label">{s.label}</p>
            <p className="title-lg" style={{ margin: '6px 0' }}>{s.value}</p>
            <p className="body-sm">{s.unit}</p>
          </motion.div>
        ))}
      </div>

      {/* Volume */}
      <div className="card card-purple">
        <p className="label">Total Volume</p>
        <p className="title-xl gradient-text">₹{volume.toLocaleString()}</p>
        <p className="body-sm">from {completed} completed trades</p>
      </div>

      {/* Pending orders alert */}
      {pending > 0 && (
        <motion.div className="card card-warning" onClick={() => navigate('/orders')}
          style={{ cursor: 'pointer' }} whileTap={{ scale: 0.98 }}>
          <p className="title-sm">⚠️ {pending} order{pending > 1 ? 's' : ''} waiting for confirmation</p>
          <p className="body-sm" style={{ marginTop: 4 }}>Tap to review and confirm →</p>
        </motion.div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button id="dash-create-ad" className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/ads/create')}>
          + Create Ad
        </button>
        <button id="dash-view-orders" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>
          View Orders
        </button>
      </div>
    </div>
  );
}
