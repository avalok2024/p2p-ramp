import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();
  const { formatEth } = useFormatCurrency();

  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)); }, []);

  if (!stats) return <div className="spinner" style={{ marginTop: 80 }} />;

  const cards = [
    { label: 'Total Users',     value: stats.totalUsers,     color: 'card', icon: '👥' },
    { label: 'Merchants',       value: stats.totalMerchants, color: 'card-purple', icon: '🏪' },
    { label: 'Total Orders',    value: stats.totalOrders,    color: 'card', icon: '📋' },
    { label: 'Open Disputes',   value: stats.openDisputes,   color: stats.openDisputes > 0 ? 'card-danger' : 'card', icon: '⚖️' },
    { label: 'Completed',       value: stats.completedOrders,color: 'card-glow', icon: '✅' },
    { label: 'Total Volume',    value: formatEth(stats.totalVolumeCrypto || 0).formatted, color: 'card-glow', icon: '📈' },
  ];

  return (
    <div>
      <h1 className="title-lg" style={{ marginBottom: 8 }}>Platform Dashboard</h1>
      <p className="body-sm" style={{ marginBottom: 24 }}>Live overview of RampX operations</p>

      <div className="stats-grid">
        {cards.map((c, i) => (
          <motion.div key={c.label} className={`card ${c.color}`}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
            <p className="label">{c.label}</p>
            <p className="title-lg" style={{ marginTop: 4 }}>{c.value}</p>
          </motion.div>
        ))}
      </div>

      {stats.openDisputes > 0 && (
        <motion.div className="card card-danger" style={{ cursor: 'pointer', marginTop: 8 }}
          onClick={() => navigate('/disputes')} whileHover={{ scale: 1.01 }}>
          <p className="title-sm">⚠️ {stats.openDisputes} open dispute{stats.openDisputes > 1 ? 's' : ''} need attention</p>
          <p className="body-sm" style={{ marginTop: 4 }}>Review and resolve → </p>
        </motion.div>
      )}
    </div>
  );
}
