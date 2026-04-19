import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { ethers } from 'ethers';
import { useOrderStore } from '../store/order.store';
import { useWeb3Store } from '../store/web3.store';

// ─── Step machine ─────────────────────────────────────────────────────────────
type Step =
  | 'dial'           // User enters INR amount
  | 'creating'       // Placing order / finding merchant
  | 'waitingAccept'  // Auto-matched — waiting for merchant to tap Accept
  | 'scanQr'         // Merchant accepted — user scans/enters receiver UPI
  | 'waitingPay'     // Receiver submitted — merchant paying
  | 'done'           // COMPLETED
  | 'cancelled';     // Order cancelled

// ─── UPI QR parser ───────────────────────────────────────────────────────────
function parseUpiQr(text: string): { upiId: string; name?: string } | null {
  try {
    if (text.startsWith('upi://')) {
      const url = new URL(text.replace('upi://', 'https://x/'));
      const pa = url.searchParams.get('pa');
      const pn = url.searchParams.get('pn') || undefined;
      if (pa) return { upiId: pa, name: pn };
    }
    if (/^[\w.\-]+@[\w]+$/.test(text.trim())) return { upiId: text.trim() };
    return null;
  } catch { return null; }
}

// ─── Dial Pad ─────────────────────────────────────────────────────────────────
const KEYS = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];

function DialPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
      {KEYS.map((k) => (
        <motion.button
          key={k}
          whileTap={{ scale: 0.88 }}
          onClick={() => onKey(k)}
          style={{
            height: 64, borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: k === '⌫' ? 22 : 24,
            fontWeight: 600, fontFamily: "'SF Mono', 'Roboto Mono', monospace",
            background: k === '⌫'
              ? 'rgba(255,80,80,0.12)'
              : 'rgba(255,255,255,0.07)',
            color: k === '⌫' ? '#f87171' : 'white',
            transition: 'background 0.15s',
          }}
        >
          {k}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Status poller ───────────────────────────────────────────────────────────
function useOrderPoller(
  orderId: string,
  active: boolean,
  onStatus: (status: string) => void,
) {
  const fetchOrder = useOrderStore((s) => s.fetchOrder);
  useEffect(() => {
    if (!active || !orderId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const o = await fetchOrder(orderId);
        if (!cancelled) onStatus(o.status);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [orderId, active]);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ScanPayPage() {
  const navigate = useNavigate();
  const { createScanPayOrder, submitReceiver, activeOrder } = useOrderStore();
  const { wallet, balanceEth } = useWeb3Store();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('dial');
  const [digits, setDigits] = useState('');
  const [crypto, setCrypto] = useState<'ETH' | 'USDT'>('USDT');

  const [orderId, setOrderId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState(0);

  const [upiId, setUpiId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const SCAN_DIV = 'sp-qr-div';

  const fiatAmount = parseFloat(digits) || 0;
  
  // Rough estimate rates for UI before matched
  const INR_PER_USD = 87;
  const USD_PER_ETH = 3000;
  const INR_PER_ETH = INR_PER_USD * USD_PER_ETH;
  
  const ethEstimate = pricePerUnit > 0
    ? (fiatAmount / pricePerUnit).toFixed(6)
    : (fiatAmount / (crypto === 'ETH' ? INR_PER_ETH : INR_PER_USD)).toFixed(6);

  const handleMax = () => {
    const availableEth = Math.max(parseFloat(balanceEth || '0') - 0.0005, 0); // leave exact gas
    if (availableEth <= 0) { setError('Insufficient balance'); return; }
    
    // For USDT UI, we use the display translation logic: 1 ETH = 3000 USDT
    const available = crypto === 'ETH' ? availableEth : availableEth * USD_PER_ETH;
    const rate = crypto === 'ETH' ? INR_PER_ETH : INR_PER_USD;
    const maxInr = Math.floor(available * rate);
    
    if (maxInr > 0) setDigits(String(maxInr));
    setError('');
  };

  // ── QR scanner helpers ────────────────────────────────────────────────────
  const submitRef = useRef<any>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError('');
    setScanning(true);
    try {
      const s = new Html5Qrcode(SCAN_DIV);
      scannerRef.current = s;
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          const parsed = parseUpiQr(text);
          if (parsed) {
            setUpiId(parsed.upiId);
            if (parsed.name) setReceiverName(parsed.name);
            stopScanner();
            if (submitRef.current) submitRef.current(parsed.upiId, parsed.name);
          } else {
            setError('Not a valid UPI QR. Try again or upload an image.');
          }
        },
        () => {},
      );
    } catch {
      setScanning(false);
      setError('Camera access denied. Please upload an image instead.');
    }
  }, [stopScanner]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setError('');
    try {
      const html5QrCode = new Html5Qrcode(SCAN_DIV);
      const text = await html5QrCode.scanFile(file, false);
      const parsed = parseUpiQr(text);
      if (parsed) {
        setUpiId(parsed.upiId);
        if (parsed.name) setReceiverName(parsed.name);
        if (submitRef.current) submitRef.current(parsed.upiId, parsed.name);
      } else {
        setError('Not a valid UPI QR.');
      }
    } catch (err) {
      setError('Could not find QR code in image.');
    }
  };

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  useEffect(() => {
    if (step === 'scanQr' && !scanning) {
      const t = setTimeout(() => {
        startScanner();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [step]); // Auto start scanner when reaching scanQr step

  // ── Polling ────────────────────────────────────────────────────────────────
  useOrderPoller(orderId, step === 'waitingAccept', (status) => {
    if (status === 'MERCHANT_ACCEPTED') setStep('scanQr');
    if (status === 'CANCELLED') setStep('cancelled');
  });
  useOrderPoller(orderId, step === 'waitingPay', (status) => {
    if (status === 'COMPLETED') setStep('done');
    if (status === 'CANCELLED') setStep('cancelled');
  });

  // ── Dial handlers ──────────────────────────────────────────────────────────
  const handleKey = (key: string) => {
    setError('');
    if (key === '⌫') { setDigits(d => d.slice(0, -1)); return; }
    if (key === '.' && digits.includes('.')) return;
    if (digits.length >= 7) return;
    if (digits === '0' && key !== '.') { setDigits(key); return; }
    setDigits(d => d + key);
  };

  // ── Place order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (fiatAmount < 10) { setError('Minimum amount is ₹10'); return; }

    const availableEth = Math.max(parseFloat(balanceEth || '0') - 0.0005, 0); // Need ETH for gas!
    const estimatedRequired = parseFloat(ethEstimate);
    if (crypto === 'ETH' && availableEth <= estimatedRequired) {
      setError(`Insufficient balance. You need approx ${estimatedRequired.toFixed(4)} ETH plus gas.`);
      return;
    }
    if (crypto === 'USDT' && availableEth * USD_PER_ETH <= estimatedRequired) {
      setError(`Insufficient balance. You need approx ${estimatedRequired.toFixed(4)} USDT equivalent.`);
      return;
    }

    setError('');
    setLoading(true);
    setStep('creating');
    try {
      const order = await createScanPayOrder({ crypto: 'ETH', fiatAmount });
      setOrderId(order.id);
      setOrderRef(order.referenceCode);
      setCryptoAmount(parseFloat('' + order.cryptoAmount).toFixed(6));
      setPricePerUnit(+order.pricePerUnit);
      setStep('waitingAccept');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No merchant available right now. Try again.');
      setStep('dial');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReceiver = async (scannedUpi?: string, scannedName?: string) => {
    const finalUpi = scannedUpi || upiId.trim();
    const finalName = scannedName || receiverName.trim();

    if (!finalUpi) { setError('Enter or scan a valid UPI ID'); return; }
    if (!wallet) { setError('Web3 wallet not initialized'); return; }
    setError('');
    setLoading(true);
    try {
      // 1. Send Crypto On-Chain directly to Merchant (Trust-based flow)
      const merchantAddress = activeOrder?.merchant?.web3Address;
      if (!merchantAddress) throw new Error('Merchant Web3 address missing');

      // (In prototype, all Scan & Pay orders are forcefully matched against ETH internally)
      // So activeOrder.cryptoAmount is strictly in native ETH! No conversions needed.
      const realEthAmount = String(activeOrder.cryptoAmount);

      const tx = await wallet.sendTransaction({
        to: merchantAddress,
        value: ethers.parseEther(realEthAmount)
      });
      // Wait for mining to ensure it actually went through successfully
      await tx.wait();
      
      // 2. Transmit receiver info
      await submitReceiver(orderId, finalUpi, finalName || undefined);
      setStep('waitingPay');
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.info?.error?.message || e?.response?.data?.message || 'Transaction failed. Check balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    submitRef.current = handleSubmitReceiver;
  });

  // ── Quick amount presets ───────────────────────────────────────────────────
  const PRESETS = [100, 200, 500, 1000];

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {step !== 'done' && (
        <>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => { stopScanner(); navigate('/'); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: 99,
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transform: 'translateX(-4px)'
              }}
            >
              <span style={{ color: 'var(--accent)', fontSize: 16 }}>←</span> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <div style={{ background: 'rgba(251, 191, 36, 0.15)', height: 40, width: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>⚡</span>
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'white' }}>Scan &amp; Pay</h1>
                <p className="body-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                  Pay anyone with your crypto
                </p>
              </div>
            </div>
          </motion.div>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 5 }}>
            {(['dial','waitingAccept','scanQr','waitingPay','done'] as Step[]).map((s, i) => {
              const stepIdx = ['dial','creating','waitingAccept','scanQr','waitingPay','done'].indexOf(step);
              const sIdx = ['dial','waitingAccept','scanQr','waitingPay','done'].indexOf(s);
              return (
                <div key={s} style={{
                  flex: 1, height: 3, borderRadius: 99,
                  background: stepIdx > sIdx ? 'var(--accent)' : stepIdx === sIdx + 1 || (s === 'dial' && stepIdx >= 0) ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.4s',
                }} />
              );
            })}
          </div>
        </>
      )}

      <AnimatePresence mode="wait">

        {/* ══ STEP: DIAL ════════════════════════════════════════════════════ */}
        {(step === 'dial' || step === 'creating') && (
          <motion.div key="dial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {/* Amount display */}
            <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
              <p className="label" style={{ marginBottom: 8, color: 'rgba(255,255,255,0.4)' }}>Enter amount in ₹</p>
              <motion.div
                key={digits}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                style={{
                  fontSize: digits.length > 5 ? 40 : 56,
                  fontWeight: 700,
                  fontFamily: "'SF Mono', 'Roboto Mono', monospace",
                  letterSpacing: -2,
                  color: fiatAmount > 0 ? 'white' : 'rgba(255,255,255,0.2)',
                  minHeight: 72,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ₹{digits || '0'}
              </motion.div>
              {fiatAmount > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="body-sm"
                  style={{ color: 'var(--accent)', marginTop: 6, fontFamily: 'monospace' }}
                >
                  ≈ {ethEstimate} {crypto}
                </motion.p>
              )}
            </div>

            {/* Quick presets & Crypto toggle */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              <button
                onClick={() => { setCrypto(crypto === 'ETH' ? 'USDT' : 'ETH'); setError(''); }}
                style={{
                  padding: '6px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)',
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
                }}
              >
                ⇌ {crypto}
              </button>
              {PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { setDigits(String(p)); setError(''); }}
                  style={{
                    padding: '6px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    background: fiatAmount === p ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                    color: fiatAmount === p ? 'var(--bg)' : 'white',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  ₹{p}
                </button>
              ))}
              <button
                onClick={handleMax}
                style={{
                  padding: '6px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                MAX
              </button>
            </div>

            {/* Dial pad */}
            <DialPad onKey={handleKey} />

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#f87171', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                {error}
              </motion.p>
            )}

            {/* CTA */}
            <motion.button
              id="scan-pay-place-order-btn"
              className="btn btn-primary"
              whileTap={{ scale: 0.97 }}
              disabled={fiatAmount < 10 || step === 'creating'}
              onClick={handlePlaceOrder}
              style={{
                marginTop: 20, width: '100%', fontSize: 17, height: 56,
                background: fiatAmount >= 10
                  ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                  : 'rgba(255,255,255,0.08)',
                opacity: fiatAmount < 10 ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {step === 'creating' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'inline-block' }}>⚡</motion.span>
                  Finding merchant…
                </span>
              ) : `Place Order → ₹${fiatAmount.toLocaleString()}`}
            </motion.button>

            <p className="body-sm" style={{ textAlign: 'center', marginTop: 10, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              Merchant pays fiat · you pay {crypto} · direct on-chain transfer
            </p>
          </motion.div>
        )}

        {/* ══ STEP: WAITING FOR MERCHANT TO ACCEPT ═════════════════════════ */}
        {step === 'waitingAccept' && (
          <motion.div key="waitingAccept" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="card card-glow" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: 52, display: 'inline-block', marginBottom: 16 }}
              >
                🔄
              </motion.div>
              <h2 className="title-lg">Finding Merchant…</h2>
              <p className="body-sm" style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>
                A verified merchant is reviewing your request.<br />
                This usually takes under a minute.
              </p>
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                <div className="list-row" style={{ cursor: 'default' }}>
                  <span className="body-sm">Amount</span>
                  <span className="title-sm">₹{fiatAmount.toLocaleString()}</span>
                </div>
                <div className="list-row" style={{ cursor: 'default' }}>
                  <span className="body-sm">You pay ({crypto})</span>
                  <span className="title-sm">{cryptoAmount} {crypto}</span>
                </div>
                <div className="list-row" style={{ cursor: 'default' }}>
                  <span className="body-sm">Ref</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{orderRef}</span>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ textAlign: 'center', marginTop: 12 }}
            >
              <p className="body-sm" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                Checking every 5 seconds…
              </p>
            </motion.div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => navigate(`/orders/${orderId}`)}
            >
              View Order Details
            </button>
          </motion.div>
        )}

        {/* ══ STEP: SCAN RECEIVER QR (after merchant accepts) ══════════════ */}
        {step === 'scanQr' && (
          <motion.div key="scanQr" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            {/* Green accepted banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}
            >
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: '#4ade80' }}>Merchant Accepted!</p>
                <p className="body-sm" style={{ marginTop: 2 }}>Scan receiver QR to pay automatically.</p>
              </div>
            </motion.div>

            <div className="card">
              <p className="label" style={{ marginBottom: 12 }}>Scan Receiver's UPI QR</p>

              {/* QR Scanner area */}
              <div
                id={SCAN_DIV}
                style={{
                  width: '100%', borderRadius: 16, overflow: 'hidden',
                  background: loading ? 'transparent' : 'rgba(0,0,0,0.4)', minHeight: (scanning && !loading) ? 250 : 0,
                }}
              />
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 40, marginBottom: 16, display: 'inline-block' }}>⚡</motion.div>
                  <p className="title-sm">Processing Payment…</p>
                  <p className="body-sm" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Sending {cryptoAmount} {crypto} on-chain</p>
                </div>
              ) : (
                <>
                  {!scanning && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <label className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </>
              )}

              {error && (
                <p style={{ color: '#f87171', fontSize: 13, marginTop: 16, textAlign: 'center' }}>{error}</p>
              )}

            </div>
          </motion.div>
        )}

        {/* ══ STEP: WAITING FOR MERCHANT TO PAY ════════════════════════════ */}
        {step === 'waitingPay' && (
          <motion.div key="waitingPay" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <div className="card card-glow" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ fontSize: 52, marginBottom: 16 }}
              >
                💸
              </motion.div>
              <h2 className="title-lg">Merchant is Paying</h2>
              <p className="body-sm" style={{ marginTop: 8, color: 'rgba(255,255,255,0.6)' }}>
                Your merchant is sending <strong>₹{fiatAmount.toLocaleString()}</strong> to:
              </p>
              <p style={{ fontFamily: 'monospace', color: 'var(--accent)', fontSize: 15, marginTop: 6 }}>{upiId}</p>
              {receiverName && <p className="body-sm" style={{ marginTop: 4 }}>{receiverName}</p>}
              <p className="body-sm" style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)' }}>
                Once done, your <strong>{cryptoAmount} {crypto}</strong> is finalized to the merchant.
              </p>
            </div>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ textAlign: 'center', marginTop: 12 }}>
              <p className="body-sm" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Checking every 5 seconds…</p>
            </motion.div>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 12, width: '100%' }}
              onClick={() => navigate(`/orders/${orderId}`)}
            >
              View Order →
            </button>
          </motion.div>
        )}

        {/* ══ STEP: DONE ════════════════════════════════════════════════════ */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 24, padding: 12, textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff94, #00b4d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 0 40px rgba(0,255,148,0.5)' }}
            >
              ✓
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h1 className="title-lg" style={{ marginBottom: 8 }}>Payment Delivered! 🎉</h1>
              <p className="body-sm" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                ₹{fiatAmount.toLocaleString()} was successfully delivered to <strong>{receiverName || upiId}</strong>.
              </p>
              <p className="body-sm" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Ref: {orderRef}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="card"
              style={{ width: '100%', maxWidth: 340, textAlign: 'left' }}
            >
              <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                <span className="body-sm">You Paid (On-chain)</span>
                <span className="title-sm">{cryptoAmount} {crypto}</span>
              </div>
              <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                <span className="body-sm">Fiat Delivered</span>
                <span className="title-sm">₹{fiatAmount.toLocaleString()}</span>
              </div>
              <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
                <span className="body-sm">Receiver UPI</span>
                <span className="title-sm" style={{ color: 'var(--accent)' }}>{upiId}</span>
              </div>
              <div className="list-row">
                <span className="body-sm">Order Type</span>
                <span className="title-sm" style={{ color: '#fbbf24' }}>SCAN & PAY</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>View Orders</button>
              <button id="sp-done-home-btn" className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>Go Home</button>
            </motion.div>
          </motion.div>
        )}

        {/* ══ STEP: CANCELLED ══════════════════════════════════════════════ */}
        {step === 'cancelled' && (
          <motion.div key="cancelled" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="card" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
              <h2 className="title-lg">Order Cancelled</h2>
              <p className="body-sm" style={{ marginTop: 8, color: 'rgba(255,255,255,0.5)' }}>
                The order was cancelled. No crypto was charged.
              </p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 24, width: '100%' }}
                onClick={() => { setStep('dial'); setDigits(''); setError(''); setOrderId(''); }}
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
