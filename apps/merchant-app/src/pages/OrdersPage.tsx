import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

const sColor: Record<string, string> = {
  PAID_MARKED:'badge-warning', COMPLETED:'badge-green',
  ESCROW_LOCKED:'badge-purple', DISPUTE:'badge-danger', CANCELLED:'badge-muted',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const navigate = useNavigate();
  const { formatEth, symbol } = useFormatCurrency();

  useEffect(() => {
    api.get('/orders').then((r) => {
      const list = r.data;
      setOrders(Array.isArray(list) ? list : []);
    });
  }, []);

  const pending = orders.filter(o => o.status === 'PAID_MARKED');
  const rest    = orders.filter(o => o.status !== 'PAID_MARKED');

  return (
    <div>
      <h1 className="title-lg" style={{ paddingTop: 16, marginBottom: 20 }}>Orders</h1>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="label" style={{ marginBottom: 10 }}>⚠️ Needs Confirmation ({pending.length})</p>
          {pending.map((o, i) => (
            <motion.div key={o.id} className="card card-warning" style={{ marginBottom: 10, cursor: 'pointer' }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => o.id && navigate(`/orders/${o.id}`)} whileTap={{ scale: 0.98 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p className="title-sm">{o.type} {formatEth(parseFloat(o.cryptoAmount)).formatted}</p>
                  <p className="body-sm" style={{ fontFamily: 'monospace', fontSize: 10 }} title={o.id}>
                    ₹{parseFloat('' + o.uniqueFiatAmount).toFixed(2)} exact · {o.referenceCode} · ID {o.id?.slice(0, 8)}…
                  </p>
                </div>
                <span className="badge badge-warning">CONFIRM</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div>
        <p className="label" style={{ marginBottom: 10 }}>All Orders</p>
        {rest.map((o, i) => (
          <motion.div key={o.id} className="card" style={{ marginBottom: 8, cursor: 'pointer' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
            onClick={() => o.id && navigate(`/orders/${o.id}`)} whileTap={{ scale: 0.98 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p className="title-sm">{o.type} {formatEth(parseFloat(o.cryptoAmount)).formatted}</p>
                <p className="body-sm" style={{ fontFamily: 'monospace', fontSize: 10 }} title={o.id}>
                  ₹{parseFloat('' + o.fiatAmount).toLocaleString()} · ID {o.id?.slice(0, 8)}…
                </p>
              </div>
              <span className={`badge ${sColor[o.status] || 'badge-muted'}`}>{o.status.replace(/_/g,' ')}</span>
            </div>
          </motion.div>
        ))}
        {orders.length === 0 && <div className="empty-state"><div className="icon">📋</div><p>No orders yet</p></div>}
      </div>
    </div>
  );
}
