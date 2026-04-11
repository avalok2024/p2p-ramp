import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useOrderStore } from '../store/order.store';

export default function SellCryptoPage() {
  const [amount, setAmount]         = useState('');
  const [ads, setAds]               = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [adLoading, setAdLoading]   = useState(true);
  const [loading, setLoading]       = useState(false);
  const { createOrder }             = useOrderStore();
  const navigate                    = useNavigate();

  // Fetch active ads from approved merchants
  useEffect(() => {
    setAdLoading(true);
    api.get('/merchants/ads?crypto=USDT')
      .then((r) => {
        setAds(r.data);
        if (r.data.length) setSelectedAd(r.data[0]);
      })
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setAdLoading(false));
  }, []);

  const inrReceived = selectedAd && amount
    ? (parseFloat(amount) * +selectedAd.pricePerUnit).toFixed(2)
    : null;

  const handleSell = async () => {
    if (!amount) return toast.error('Enter USDT amount to sell');
    if (!selectedAd) return toast.error('No merchant available');
    const fiatAmount = parseFloat(amount) * +selectedAd.pricePerUnit;
    setLoading(true);
    try {
      const order = await createOrder({
        type: 'SELL',
        crypto: 'USDT',
        fiatAmount,
        adId: selectedAd.id,
      });
      toast.success('Sell order created! Your USDT is locked in escrow.');
      navigate(`/orders/${order.id}`);
    } catch (e: any) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">←</button>
        <h1 className="title-md">Sell USDT</h1>
      </div>

      <motion.div className="card card-purple" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm" style={{ color: '#a78bfa' }}>
          🔒 Your USDT will be locked in escrow. Once the merchant pays fiat and you confirm, funds are released.
        </p>
      </motion.div>

      {/* Amount input */}
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
        {inrReceived && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="body-sm"
            style={{ marginTop: 8, color: 'var(--accent)' }}
          >
            You receive ≈ ₹{parseFloat(inrReceived).toLocaleString()} INR
          </motion.p>
        )}
      </div>

      {/* Merchant selection */}
      <div>
        <p className="label" style={{ marginBottom: 8 }}>SELECT BUYER MERCHANT</p>
        {adLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" /></div>
        ) : ads.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No approved merchants buying USDT right now. Try again later.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ads.map((ad) => (
              <motion.div
                key={ad.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: selectedAd?.id === ad.id
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  transition: 'border-color 0.15s',
                }}
                onClick={() => setSelectedAd(ad)}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="title-sm">{ad.merchant?.displayName || 'Merchant'}</p>
                    <p className="body-sm" style={{ color: 'var(--warning)' }}>
                      ★ {parseFloat(ad.merchant?.rating ?? 5).toFixed(2)} · {ad.merchant?.completedTrades ?? 0} trades
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="title-sm" style={{ color: 'var(--accent)' }}>
                      ₹{parseFloat(ad.pricePerUnit).toFixed(2)}
                    </p>
                    <p className="body-sm">per USDT</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {ad.paymentMethods?.map((m: string) => (
                    <span key={m} className="badge badge-secondary">{m}</span>
                  ))}
                  <span className="badge badge-secondary">
                    ₹{parseFloat(ad.minAmount).toFixed(0)}–₹{parseFloat(ad.maxAmount).toFixed(0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky-cta">
        <motion.button
          id="confirm-sell-btn"
          className="btn btn-primary btn-full btn-lg"
          style={{ background: 'var(--purple)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}
          onClick={handleSell}
          disabled={loading || !amount || !selectedAd}
          whileTap={{ scale: 0.97 }}
        >
          {loading
            ? 'Creating sell order…'
            : `Sell ${amount || '0'} USDT → ₹${inrReceived ? parseFloat(inrReceived).toLocaleString() : '—'}`
          }
        </motion.button>
      </div>
    </div>
  );
}
