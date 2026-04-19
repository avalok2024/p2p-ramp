import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useWeb3Store } from '../store/web3.store';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { usePwaInstall } from '../hooks/usePwaInstall';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const [orders, setOrders]   = useState<any[]>([]);
  const navigate = useNavigate();
  const { balanceEth } = useWeb3Store();
  const { formatEth, symbol } = useFormatCurrency();
  const { isInstallable, install } = usePwaInstall();

  useEffect(() => {
    api.get('/orders').then(r => setOrders(r.data));
  }, []);

  const pending = orders.filter(o => o.status === 'PAID_MARKED').length;
  const completed = orders.filter(o => o.status === 'COMPLETED').length;
  const volumeEth = orders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + +o.cryptoAmount, 0);

  const ethOnChain = parseFloat(balanceEth || '0') || 0;
  const displayBal = formatEth(ethOnChain);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm">Welcome back 👋</p>
        <h1 className="title-lg">{user?.displayName || 'Merchant'}</h1>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'On-chain ETH', value: ethOnChain.toFixed(6), unit: 'native Sepolia', cls: 'card-glow' },
          { label: 'Approx. value', value: symbol === 'ETH' ? '—' : displayBal.formatted, unit: symbol === 'ETH' ? '' : 'display', cls: '' },
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
        <p className="title-xl gradient-text">{formatEth(volumeEth).formatted}</p>
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

      {/* Preferences */}
      <div className="card">
        <p className="label" style={{ marginBottom: 12 }}>App Preferences</p>
        
        {isInstallable && (
          <button className="btn btn-primary btn-full" onClick={install} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', marginBottom: 16 }}>
            📱 Install App
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="body-sm">Display Currency</span>
          <CurrencyToggle />
        </div>
        <p className="body-sm" style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>Note: Core transactions always settle in ETH.</p>
      </div>
    </div>
  );
}
