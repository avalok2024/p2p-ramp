import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useOrderStore } from '../store/order.store';

interface Ad {
  id: string; pricePerUnit: number; minAmount: number; maxAmount: number;
  paymentMethods: string[]; upiId?: string;
  merchant: { displayName: string; rating: number; completedTrades: number };
}

export default function BuyCryptoPage() {
  const [ads, setAds]           = useState<Ad[]>([]);
  const [selectedAd, setAd]     = useState<Ad | null>(null);
  const [fiatAmount, setFiat]   = useState('');
  const [isLoading, setLoading] = useState(false);
  const { createOrder } = useOrderStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/merchants/ads?crypto=USDT').then((r) => setAds(r.data));
  }, []);

  const handleBuy = async () => {
    if (!selectedAd || !fiatAmount) return;
    const amt = parseFloat(fiatAmount);
    if (amt < selectedAd.minAmount || amt > selectedAd.maxAmount) {
      return toast.error(`Amount must be ₹${selectedAd.minAmount}–₹${selectedAd.maxAmount}`);
    }
    setLoading(true);
    try {
      const order = await createOrder({ type: 'BUY', crypto: 'USDT', fiatAmount: amt, adId: selectedAd.id });
      toast.success('Order created! Escrow locked ✅');
      navigate(`/payment/${order.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">←</button>
        <h1 className="title-md">Buy USDT</h1>
      </div>

      {/* Amount input */}
      <div className="card">
        <div className="input-group">
          <label className="input-label">You Pay (₹ INR)</label>
          <input
            id="buy-amount"
            type="number"
            className="input"
            placeholder="Enter amount"
            value={fiatAmount}
            onChange={(e) => setFiat(e.target.value)}
            inputMode="numeric"
          />
        </div>
        {selectedAd && fiatAmount && (
          <p className="body-sm" style={{ marginTop: 8, color: 'var(--accent)' }}>
            You receive ≈ {(parseFloat(fiatAmount) / selectedAd.pricePerUnit).toFixed(4)} USDT
          </p>
        )}
      </div>

      {/* Ad list */}
      <div>
        <p className="label" style={{ marginBottom: 10 }}>Select Merchant</p>
        {ads.length === 0 && (
          <div className="empty-state"><div className="icon">🔍</div><p>No merchants available</p></div>
        )}
        {ads.map((ad) => (
          <motion.div
            key={ad.id}
            className={`card ${selectedAd?.id === ad.id ? 'card-glow' : ''}`}
            style={{ marginBottom: 10, cursor: 'pointer' }}
            onClick={() => setAd(ad)}
            whileTap={{ scale: 0.98 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="title-sm">{ad.merchant.displayName || 'Merchant'}</p>
                <p className="body-sm">⭐ {ad.merchant.rating} · {ad.merchant.completedTrades} trades</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="title-sm" style={{ color: 'var(--accent)' }}>₹{ad.pricePerUnit}</p>
                <p className="body-sm">per USDT</p>
              </div>
            </div>
            <div className="divider" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ad.paymentMethods.map((m) => (
                <span key={m} className="badge badge-purple">{m}</span>
              ))}
              <span className="badge badge-muted">₹{ad.minAmount}–₹{ad.maxAmount}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky buy button */}
      {selectedAd && (
        <div className="sticky-cta">
          <motion.button
            id="confirm-buy-btn"
            className="btn btn-primary btn-full btn-lg"
            onClick={handleBuy}
            disabled={isLoading || !fiatAmount}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          >
            {isLoading ? 'Creating order…' : `Buy USDT from ${selectedAd.merchant.displayName || 'Merchant'} →`}
          </motion.button>
        </div>
      )}
    </div>
  );
}
