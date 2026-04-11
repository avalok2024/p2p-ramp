import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { adminItems } from '../utils/adminApi';

const sColor: Record<string, string> = { COMPLETED:'badge-green', ESCROW_LOCKED:'badge-purple', PAID_MARKED:'badge-warning', DISPUTE:'badge-danger', CANCELLED:'badge-muted', REFUNDED:'badge-muted' };

export default function OrdersPage() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [filter, setFilter]   = useState('');

  useEffect(() => {
    api.get('/admin/orders').then((r) => setOrders(adminItems(r)));
  }, []);

  const filtered = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 className="title-lg">All Orders</h1>
        <select className="input" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {['CREATED','ESCROW_LOCKED','PAID_MARKED','PAYMENT_CONFIRMED','COMPLETED','DISPUTE','CANCELLED','REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>{['#','Ref','UUID','Type','Crypto','Fiat','Status','Created'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <td style={{ fontWeight: 700 }}>{o.orderNumber ?? '—'}</td>
                <td className="mono" style={{ fontSize: 12 }}>{o.referenceCode}</td>
                <td className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }} title={o.id}>{(o.id || '').slice(0, 8)}…</td>
                <td><span className="badge badge-muted">{o.type}</span></td>
                <td>{o.cryptoAmount} {o.crypto}</td>
                <td>₹{parseFloat('' + o.fiatAmount).toLocaleString()}</td>
                <td><span className={`badge ${sColor[o.status] || 'badge-muted'}`}>{o.status.replace(/_/g,' ')}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
