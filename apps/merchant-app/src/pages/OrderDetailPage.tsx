import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!orderId) return Promise.resolve();
    setLoadError(null);
    return api
      .get(`/orders/${orderId}`)
      .then((r) => setOrder(r.data))
      .catch((e) => {
        setOrder(null);
        setLoadError(apiErrorMessage(e));
      });
  };
  useEffect(() => {
    if (orderId) load();
  }, [orderId]);

  const confirm = async () => {
    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/confirm`);
      toast.success('Payment confirmed! Escrow released ✅');
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  if (loadError) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <p className="body-sm" style={{ marginBottom: 16 }}>{loadError}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>← Back to orders</button>
      </div>
    );
  }

  if (!order) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>;

  const canConfirm = order.status === 'PAID_MARKED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <button onClick={() => navigate('/orders')} className="btn btn-secondary btn-sm">←</button>
        <div>
          <h1 className="title-md">Order Detail</h1>
          <p className="body-sm mono" style={{ fontSize: 10 }} title={order.id}>Order ID: {order.id}</p>
          <p className="body-sm mono">{order.referenceCode}</p>
        </div>
      </div>

      {/* Payment alert */}
      {canConfirm && (
        <motion.div className="card card-warning" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <p className="title-sm">⚠️ Buyer has marked payment</p>
          <p className="body-sm" style={{ marginTop: 4 }}>
            Verify you received ₹{parseFloat(order.uniqueFiatAmount).toFixed(2)} with ref <b>{order.referenceCode}</b> before confirming.
          </p>
        </motion.div>
      )}

      {/* Order details */}
      <div className="card">
        {[
          ['Order #',    order.orderNumber != null ? `#${order.orderNumber}` : '—'],
          ['Order UUID', order.id],
          ['Type',       order.type],
          ['Crypto',     `${order.cryptoAmount} ${order.crypto}`],
          ['Fiat',       `₹${parseFloat(order.fiatAmount).toLocaleString()}`],
          ['Exact Pay',  `₹${parseFloat(order.uniqueFiatAmount).toFixed(2)}`],
          ['Method',     order.paymentMethod],
          ['Status',     order.status.replace(/_/g,' ')],
        ].map(([k, v]) => (
          <div key={k} className="list-row">
            <span className="body-sm">{k}</span>
            <span className="title-sm">{v}</span>
          </div>
        ))}
      </div>

      {/* Proof of payment */}
      {order.paymentProofUrl && (
        <div className="card">
          <p className="label" style={{ marginBottom: 8 }}>Payment Proof</p>
          <img src={order.paymentProofUrl} alt="Payment proof" style={{ borderRadius: 8, width: '100%' }} />
        </div>
      )}

      {/* Confirm button — the most important action */}
      {canConfirm && (
        <motion.button
          id="confirm-payment-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={confirm}
          disabled={loading}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          style={{ marginTop: 8, fontSize: 18 }}
        >
          {loading ? 'Confirming…' : '✅ Confirm Payment Received'}
        </motion.button>
      )}
    </div>
  );
}
