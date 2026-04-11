import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useOrderStore } from '../store/order.store';
import { useAuthStore }  from '../store/auth.store';
import { apiErrorMessage } from '../api/client';

function num(v: unknown): string {
  const n = parseFloat('' + (v ?? 0));
  return Number.isFinite(n) ? n.toLocaleString() : String(v ?? '');
}

const STATUS_STEPS = [
  'CREATED','MATCHED','ESCROW_LOCKED','PAYMENT_PENDING',
  'PAID_MARKED','PAYMENT_CONFIRMED','COMPLETED',
];

const statusColor: Record<string, string> = {
  COMPLETED:'badge-green', ESCROW_LOCKED:'badge-purple',
  PAID_MARKED:'badge-warning', DISPUTE:'badge-danger',
  CANCELLED:'badge-muted', REFUNDED:'badge-muted',
};

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const { fetchOrder, markPaid, cancelOrder, raiseDispute } = useOrderStore();
  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoadError(null);
    fetchOrder(orderId)
      .then(setOrder)
      .catch((e) => {
        setOrder(null);
        setLoadError(apiErrorMessage(e));
      });
  }, [orderId]);

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    setLoading(true);
    try { const o = await fn(); setOrder(o); toast.success(msg); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const submitDispute = async () => {
    if (!orderId || !reason) return;
    setLoading(true);
    try {
      await raiseDispute(orderId, reason);
      toast.success('Dispute raised');
      fetchOrder(orderId).then(setOrder);
      setShowDispute(false);
    } catch (e: unknown) { toast.error(apiErrorMessage(e)); }
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

  const isBuyer    = order.userId === user?.id;
  const stepIdx    = STATUS_STEPS.indexOf(order.status);
  const isActive   = !['COMPLETED','CANCELLED','REFUNDED','DISPUTE'].includes(order.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header">
        <button onClick={() => navigate('/orders')} className="btn btn-secondary btn-sm">←</button>
        <div>
          <h1 className="title-md">Order Detail</h1>
          <p className="body-sm mono">{order.referenceCode}</p>
        </div>
        <span className={`badge ${statusColor[order.status] || 'badge-muted'}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Order summary card */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {[
          ['Order #',      order.orderNumber != null ? `#${order.orderNumber}` : '—'],
          ['Order ID (UUID)', order.id],
          ['Type',         order.type],
          ['Crypto',       `${order.cryptoAmount} ${order.crypto}`],
          ['Fiat Amount',  `₹${num(order.fiatAmount)}`],
          ['Pay Exact',    `₹${parseFloat('' + order.uniqueFiatAmount).toFixed(2)}`],
          ['Rate',         `₹${num(order.pricePerUnit)} / USDT`],
          ['Method',       order.paymentMethod],
        ].map(([k, v]) => (
          <div className="list-row" key={k}>
            <span className="body-sm">{k}</span>
            <span className="title-sm">{v}</span>
          </div>
        ))}
      </motion.div>

      {/* State timeline */}
      <div className="card">
        <p className="label" style={{ marginBottom: 12 }}>Order Progress</p>
        {STATUS_STEPS.map((step, i) => {
          const done    = i < stepIdx;
          const current = i === stepIdx;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: done || current ? 'var(--accent)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: done || current ? '#0f0f1a' : 'var(--text-muted)',
              }}>{done ? '✓' : i + 1}</div>
              <p className={current ? 'title-sm' : 'body-sm'} style={{ color: done ? 'var(--accent)' : current ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {step.replace(/_/g, ' ')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {isActive && isBuyer && order.status === 'ESCROW_LOCKED' && (
        <motion.button id="pay-btn" className="btn btn-primary btn-full btn-lg"
          onClick={() => navigate(`/payment/${order.id}`)} whileTap={{ scale: 0.97 }}>
          Make Payment →
        </motion.button>
      )}
      {isBuyer && order.status === 'PAID_MARKED' && (
        <motion.button id="dispute-btn" className="btn btn-danger btn-full"
          onClick={() => setShowDispute(true)} whileTap={{ scale: 0.97 }}>
          ⚖️ Raise Dispute
        </motion.button>
      )}
      {isActive && order.status === 'ESCROW_LOCKED' && (
        <button id="cancel-btn" className="btn btn-secondary btn-full"
          disabled={loading} onClick={() => doAction(() => cancelOrder(order.id), 'Order cancelled')}>
          Cancel Order
        </button>
      )}

      {/* Dispute form */}
      {showDispute && (
        <motion.div className="card card-danger" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="title-sm" style={{ marginBottom: 12 }}>⚖️ Raise Dispute</p>
          <div className="input-group">
            <label className="input-label">Reason</label>
            <textarea
              className="input" style={{ minHeight: 80, resize: 'vertical' }}
              placeholder="Describe the issue…" value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDispute(false)}>Cancel</button>
            <button id="submit-dispute-btn" className="btn btn-danger btn-sm" onClick={submitDispute} disabled={loading || !reason}>
              Submit Dispute
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
