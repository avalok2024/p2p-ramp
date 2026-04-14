import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../api/client';
import { useOrderStore } from '../store/order.store';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { useWeb3Store } from '../store/web3.store';

export default function SellCryptoPage() {
  const [amountInput, setAmount] = useState('');
  const [userUpiId, setUserUpiId] = useState('');
  const [ads, setAds] = useState<any[]>([]);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [adLoading, setAdLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const { createOrder } = useOrderStore();
  const { formatEth, symbol } = useFormatCurrency();
  const { balanceEth } = useWeb3Store();
  const navigate = useNavigate();

  // Fetch active ads from approved merchants
  useEffect(() => {
    setAdLoading(true);
    api.get('/merchants/ads?crypto=ETH')
      .then((r) => {
        setAds(r.data);
        if (r.data.length) setSelectedAd(r.data[0]);
      })
      .catch((e) => toast.error(apiErrorMessage(e)))
      .finally(() => setAdLoading(false));
  }, []);

  const rate = formatEth(1).rate;
  const amountEth = amountInput ? (parseFloat(amountInput) / rate) : 0;

  const inrReceived = selectedAd && amountEth > 0
    ? (amountEth * +selectedAd.pricePerUnit).toFixed(2)
    : null;

  const maxFormattedNum = (Number(balanceEth) * rate);

  const handlePercentClick = (percent: number) => {
    const val = (maxFormattedNum * (percent / 100)).toFixed(symbol === 'ETH' ? 4 : 2);
    setAmount(val);
  };

  const handleSell = async () => {
    if (!amountInput) return toast.error(`Enter ${symbol} amount to sell`);
    if (!selectedAd) return toast.error('No merchant available');
    if (!userUpiId.trim()) return toast.error('Please enter your UPI ID so the merchant can pay you.');
    
    const fiatAmount = amountEth * +selectedAd.pricePerUnit;
    setLoading(true);
    try {
      const order = await createOrder({
        type: 'SELL',
        crypto: 'ETH',
        fiatAmount,
        adId: selectedAd.id,
        userUpiId: userUpiId.trim()
      });
      toast.success(`Sell order created! Your Match is locked in escrow.`);
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
        <h1 className="title-md">Sell {symbol}</h1>
      </div>

      <motion.div className="card card-purple" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="body-sm" style={{ color: '#a78bfa' }}>
          🔒 Your Match will be locked in escrow. Once the merchant pays fiat and you confirm, funds are released.
        </p>
      </motion.div>

      {/* Amount input */}
      <div className="card">
        <div className="input-group">
          <label className="input-label">Amount to Sell ({symbol})</label>
          <input
            id="sell-amount"
            type="number"
            className="input"
            placeholder={`e.g. ${symbol === 'BTC' ? '0.01' : symbol === 'ETH' ? '0.05' : '100'}`}
            value={amountInput}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[0, 20, 30, 50, 100].map(pct => (
            <button
              key={pct}
              className="badge badge-secondary"
              style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
              onClick={() => handlePercentClick(pct)}
            >
              {pct}%
            </button>
          ))}
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

      {/* UPI Input */}
      <div className="card">
        <label className="input-label">Your UPI ID (Receive Fiat Here)</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. yourname@okicici"
          value={userUpiId}
          onChange={(e) => setUserUpiId(e.target.value)}
        />
      </div>

      {/* Merchant selection */}
      <div>
        <p className="label" style={{ marginBottom: 8 }}>SELECT BUYER MERCHANT</p>
        {adLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" /></div>
        ) : ads.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            No approved merchants buying ETH right now. Try again later.
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
                      ₹{Math.floor(ad.pricePerUnit / rate)}
                    </p>
                    <p className="body-sm">per {symbol}</p>
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
          disabled={loading || !amountInput || !selectedAd || !userUpiId}
          whileTap={{ scale: 0.97 }}
        >
          {loading
            ? 'Creating sell order…'
            : `Sell ${amountInput || '0'} ${symbol} → ₹${inrReceived ? parseFloat(inrReceived).toLocaleString() : '—'}`
          }
        </motion.button>
      </div>
    </div>
  );
}
