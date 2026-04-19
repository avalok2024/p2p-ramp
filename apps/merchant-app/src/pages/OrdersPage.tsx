import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

const sColor: Record<string, string> = {
  PAID_MARKED:'badge-warning', COMPLETED:'badge-green',
  ESCROW_LOCKED:'badge-purple', DISPUTE:'badge-danger', CANCELLED:'badge-muted',
  SCAN_PAY_MERCHANT_PAID: 'badge-green', MATCHED: 'badge-purple',
  MERCHANT_ACCEPTED: 'badge-purple', RECEIVER_SUBMITTED: 'badge-warning',
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

      {/* Scan & Pay — needs immediate action */}
      {orders.filter(o => o.type === 'SCAN_PAY' && (o.status === 'MATCHED' || o.status === 'RECEIVER_SUBMITTED')).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="label" style={{ marginBottom: 10, color: '#c4b5fd' }}>⚡ Scan &amp; Pay — Action Required ({orders.filter(o => o.type === 'SCAN_PAY' && (o.status === 'MATCHED' || o.status === 'RECEIVER_SUBMITTED')).length})</p>
          {orders.filter(o => o.type === 'SCAN_PAY' && (o.status === 'MATCHED' || o.status === 'RECEIVER_SUBMITTED')).map((o, i) => (
            <motion.div key={o.id}
              className="card"
              style={{ marginBottom: 10, cursor: 'pointer', border: `1px solid ${o.status === 'RECEIVER_SUBMITTED' ? 'rgba(251,191,36,0.5)' : 'rgba(139,92,246,0.4)'}`, background: o.status === 'RECEIVER_SUBMITTED' ? 'rgba(251,191,36,0.06)' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.05))' }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => o.id && navigate(`/orders/${o.id}`)} whileTap={{ scale: 0.98 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {o.status === 'RECEIVER_SUBMITTED' ? (
                    <p className="title-sm" style={{ color: '#fbbf24' }}>💸 Pay ₹{parseFloat('' + o.fiatAmount).toLocaleString()} to {o.receiverUpiId || '...'}</p>
                  ) : (
                    <p className="title-sm" style={{ color: '#c4b5fd' }}>⚡ Accept ₹{parseFloat('' + o.fiatAmount).toLocaleString()} request</p>
                  )}
                  <p className="body-sm" style={{ fontFamily: 'monospace', fontSize: 10 }}>
                    Receive {parseFloat(o.cryptoAmount).toFixed(6)} {o.crypto} · ID {o.id?.slice(0, 8)}…
                  </p>
                </div>
                <span className="badge" style={o.status === 'RECEIVER_SUBMITTED'
                  ? { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)' }
                  : { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                }>{o.status === 'RECEIVER_SUBMITTED' ? 'PAY NOW' : 'ACCEPT'}</span>
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
                <p className="title-sm">
                  {o.type === 'SCAN_PAY' ? <span style={{ color: '#c4b5fd' }}>⚡ Scan &amp; Pay</span> : `${o.type} ${formatEth(parseFloat(o.cryptoAmount)).formatted}`}
                </p>
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
