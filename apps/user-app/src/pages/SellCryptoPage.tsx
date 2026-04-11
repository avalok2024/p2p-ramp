import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useOrderStore } from '../store/order.store';

export default function SellCryptoPage() {
  const [amount, setAmount]   = useState('');
  const [adId, setAdId]       = useState('');
  const [loading, setLoading] = useState(false);
  const { createOrder } = useOrderStore();
  const navigate = useNavigate();

  const handleSell = async () => {
    if (!amount) return toast.error('Enter amount to sell');
    setLoading(true);
    try {
      // For sell, we use USDT. User must first select ad or we auto-match
      const adsRes = await api.get('/merchants/ads?crypto=USDT');
      const ads    = adsRes.data;
      if (!ads.length) return toast.error('No merchants available right now');
      const ad = ads[0]; // take best priced

      const order = await createOrder({ type: 'SELL', crypto: 'USDT', fiatAmount: parseFloat(amount) * ad.pricePerUnit, adId: ad.id });
      toast.success('Sell order created! Crypto locked in escrow.');
      navigate(`/orders/${order.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">←</button>
        <h1 className="title-md">Sell USDT</h1>
      </div>

      <motion.div className="card card-purple" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm" style={{ color: '#a78bfa' }}>
          🔒 Your USDT will be locked in escrow. Once merchant pays fiat, escrow releases automatically.
        </p>
      </motion.div>

      <div className="card">
        <div className="input-group">
          <label className="input-label">USDT Amount to Sell</label>
          <input
            id="sell-amount"
            type="number"
            className="input"
            placeholder="e.g. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
        {amount && (
          <p className="body-sm" style={{ marginTop: 8, color: 'var(--accent)' }}>
            You receive ≈ ₹{(parseFloat(amount) * 85).toLocaleString()} INR
          </p>
        )}
      </div>

      <div className="sticky-cta">
        <motion.button
          id="confirm-sell-btn"
          className="btn btn-primary btn-full btn-lg"
          style={{ background: 'var(--purple)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}
          onClick={handleSell}
          disabled={loading || !amount}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? 'Creating sell order…' : `Sell ${amount || '0'} USDT →`}
        </motion.button>
      </div>
    </div>
  );
}
