import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useOrderStore } from '../store/order.store';

function useCountdown(deadline: string | undefined) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return { display: `${m}:${s}`, secs, expired: secs === 0 };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const copy = () => { navigator.clipboard.writeText(value); toast.success(`${label} copied!`); };
  return (
    <div>
      <p className="label" style={{ marginBottom: 6 }}>{label}</p>
      <div className="copy-row">
        <span className="value mono">{value}</span>
        <button className="copy-btn" onClick={copy}>Copy</button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { orderId }     = useParams<{ orderId: string }>();
  const navigate        = useNavigate();
  const { fetchOrder, markPaid } = useOrderStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { display, secs, expired } = useCountdown(order?.paymentDeadline);

  useEffect(() => {
    if (orderId) fetchOrder(orderId).then(setOrder);
  }, [orderId]);

  const handlePaid = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      await markPaid(orderId);
      toast.success('Payment marked! Waiting for merchant confirmation…');
      navigate(`/orders/${orderId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  if (!order) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>;

  const countdownClass = secs > 300 ? '' : secs > 60 ? 'warning' : 'danger';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 120 }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">←</button>
        <h1 className="title-md">Make Payment</h1>
      </div>

      {/* Countdown */}
      <motion.div className="card" style={{ textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="label">Time Remaining</p>
        <div className={`countdown ${countdownClass}`} style={{ marginTop: 8 }}>
          {expired ? 'EXPIRED' : display}
        </div>
        <p className="body-sm" style={{ marginTop: 4 }}>Pay before the timer runs out</p>
      </motion.div>

      {/* Amount to pay */}
      <motion.div className="card card-glow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p className="label">Exact Amount to Pay</p>
        <h2 className="title-xl" style={{ margin: '8px 0', color: 'var(--accent)' }}>
          ₹{parseFloat(order.uniqueFiatAmount).toFixed(2)}
        </h2>
        <p className="body-sm">⚠️ Pay the <b>exact</b> amount shown — unique paise helps merchant identify your payment</p>
      </motion.div>

      {/* QR Code */}
      {order.upiQr && (
        <motion.div className="card" style={{ alignItems: 'center', textAlign: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className="label" style={{ marginBottom: 16 }}>Scan UPI QR Code</p>
          <div style={{ background: 'white', padding: 16, borderRadius: 12, display: 'inline-block' }}>
            <QRCodeSVG value={order.upiQr} size={220} />
          </div>
          <p className="body-sm" style={{ marginTop: 12 }}>Open any UPI app and scan</p>
        </motion.div>
      )}

      {/* Payment details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {order.merchantAd?.upiId && <CopyRow label="UPI ID" value={order.merchantAd.upiId} />}
        <CopyRow label="Reference Code" value={order.referenceCode} />
        <CopyRow label="Amount (₹)" value={parseFloat(order.uniqueFiatAmount).toFixed(2)} />
      </div>

      {/* Method badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {order.merchantAd?.paymentMethods?.map((m: string) => (
          <span key={m} className="badge badge-purple">{m}</span>
        ))}
      </div>

      {/* Sticky I Paid CTA */}
      <div className="sticky-cta">
        <motion.button
          id="i-paid-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={handlePaid}
          disabled={loading || expired || order.status !== 'ESCROW_LOCKED'}
          whileTap={{ scale: 0.96 }}
          style={{ fontSize: 18 }}
        >
          {loading ? 'Marking…' : expired ? 'Order Expired' : '✅ I Have Paid'}
        </motion.button>
      </div>
    </div>
  );
}
