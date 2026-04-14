import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import api, { apiErrorMessage } from '../api/client';
import { useWeb3Store } from '../store/web3.store';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

const P2P_ESCROW_ABI = [
  "function deposit(bytes32 orderId, address recipient) external payable",
  "function release(bytes32 orderId) external"
];
const uuidToBytes32 = (uuid: string) => {
  return '0x' + uuid.replace(/-/g, '').padEnd(64, '0');
};

function resolveEscrowAddress(order: { escrowContractAddress?: string }): string {
  const raw =
    order.escrowContractAddress ||
    import.meta.env.VITE_ESCROW_ADDRESS ||
    '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  if (!ethers.isAddress(raw)) throw new Error('Invalid escrow contract address');
  return ethers.getAddress(raw);
}

function depositValueWei(order: { cryptoAmount: number | string }): bigint {
  return ethers.parseEther(Number(order.cryptoAmount).toFixed(18));
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { wallet, fetchBalance, syncProfileAddress, address } = useWeb3Store();
  const { formatEth, symbol } = useFormatCurrency();

  const cancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled');
      load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

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
    if (orderId) {
      void syncProfileAddress();
      load();
    }
  }, [orderId]);

  const sellSettlementMismatch =
    !!order &&
    order.type === 'SELL' &&
    !!address &&
    !!order.merchant?.web3Address &&
    String(order.merchant.web3Address).toLowerCase() !== address.toLowerCase();

  const lockEscrow = async () => {
    if (!wallet) return toast.error('Web3 Wallet not initialized!');
    if (!order.user?.web3Address) return toast.error('Buyer has no web3 address configured map!');
    setLoading(true);
    try {
      await syncProfileAddress();
      const ca = resolveEscrowAddress(order);
      const contract = new ethers.Contract(ca, P2P_ESCROW_ABI, wallet);
      const b32OrderId = uuidToBytes32(order.id);

      const toastId = toast.loading('Sending ETH to Smart Contract...');
      const to = ethers.getAddress(order.user.web3Address);
      const tx = await contract.deposit(b32OrderId, to, { value: depositValueWei(order) });

      toast.loading(`Waiting for confirmation... Tx: ${tx.hash.slice(0, 10)}...`, { id: toastId });
      await tx.wait();

      toast.success('Funds Locked On-chain! Verifying with backend...', { id: toastId });
      await api.post(`/orders/${orderId}/verify-lock`);
      void fetchBalance?.();
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || 'Error locking on-chain');
    }
    finally { setLoading(false); }
  };

  /** Confirms fiat; backend signs contract.release as owner — ETH goes to on-chain recipient. */
  const confirmAndSettle = async () => {
    setLoading(true);
    try {
      const toastId = toast.loading('Settling on-chain (server-signed release)…');
      await api.post(`/orders/${orderId}/confirm`);
      toast.success('ETH released to the buyer on-chain.', { id: toastId });
      void fetchBalance?.();
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'Settlement failed');
    }
    finally { setLoading(false); }
  };

  const markPaid = async () => {
    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/pay`);
      toast.success('Payment marked. Waiting for seller to confirm settlement.');
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || e.message || 'Error marking payment');
    }
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

  // ── COMPLETION SCREEN ──────────────────────────────────────────────────────
  if (order.status === 'COMPLETED') {
    const isBuyOrder = order.type === 'BUY';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 24, padding: 24, textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 0 40px rgba(168,85,247,0.5)' }}
        >
          ✓
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="title-lg" style={{ marginBottom: 8 }}>Trade Settled! 🎉</h1>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            {isBuyOrder
              ? `Crypto has been released to the buyer. Trade is complete.`
              : `Fiat payment has been sent. The user's crypto has been released.`
            }
          </p>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Ref: {order.referenceCode}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card"
          style={{ width: '100%', maxWidth: 340 }}
        >
          <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <span className="body-sm">Amount (USDT)</span>
            <span className="title-sm" style={{ color: 'var(--accent)' }}>≈ {(parseFloat(order.fiatAmount) / 83).toFixed(2)} USDT</span>
          </div>
          <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <span className="body-sm">Crypto ({order.crypto})</span>
            <span className="title-sm">{parseFloat(order.cryptoAmount).toFixed(6)} {order.crypto}</span>
          </div>
          <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <span className="body-sm">Fiat</span>
            <span className="title-sm">₹{parseFloat(order.fiatAmount).toFixed(2)}</span>
          </div>
          <div className="list-row">
            <span className="body-sm">Order Type</span>
            <span className="title-sm" style={{ color: isBuyOrder ? 'var(--accent)' : 'var(--purple)' }}>{order.type}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>View Orders</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>Dashboard</button>
        </motion.div>
      </motion.div>
    );
  }

  const canLock = order.status === 'MATCHED' && order.type === 'BUY';
  const canConfirm = order.status === 'PAID_MARKED' && order.type === 'BUY';
  const canMarkPaid = order.status === 'ESCROW_LOCKED' && order.type === 'SELL';
  const isActive = !['CANCELLED', 'COMPLETED', 'DISPUTED'].includes(order.status);

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

      {sellSettlementMismatch && (
        <div className="card card-danger" style={{ padding: 14 }}>
          <p className="title-sm" style={{ marginBottom: 6 }}>Settlement address mismatch</p>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Your profile address ({String(order.merchant?.web3Address).slice(0, 10)}…) does not match this device&apos;s wallet ({address?.slice(0, 10)}…).
            The buyer&apos;s escrow will release ETH to your <b>profile</b> address. Open Wallet so your address syncs, or use the same device as your account.
          </p>
        </div>
      )}

      {canConfirm && (
        <motion.div className="card card-warning" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <p className="title-sm">⚠️ Buyer has marked payment</p>
          <p className="body-sm" style={{ marginTop: 4 }}>
            Verify you received ₹{parseFloat(order.uniqueFiatAmount).toFixed(2)} with ref <b>{order.referenceCode}</b> before confirming.
          </p>
        </motion.div>
      )}

      <div className="card">
        {[
          ['Order #', order.orderNumber != null ? `#${order.orderNumber}` : '—'],
          ['Order UUID', order.id],
          ['Type', order.type],
          ['Crypto', formatEth(parseFloat(order.cryptoAmount)).formatted],
          ['Fiat', `₹${parseFloat(order.fiatAmount).toLocaleString()}`],
          ['Exact Pay', `₹${parseFloat(order.uniqueFiatAmount).toFixed(2)}`],
          ['Method', order.paymentMethod],
          ['Status', order.status.replace(/_/g, ' ')],
        ].map(([k, v]) => (
          <div key={k} className="list-row">
            <span className="body-sm">{k}</span>
            <span className="title-sm">{v}</span>
          </div>
        ))}
      </div>

      {order.userUpiId && (
        <div className="card card-purple" style={{ padding: 16 }}>
          <p className="label" style={{ marginBottom: 4 }}>Pay to User UPI ID</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="title-md" style={{ color: 'var(--accent)' }}>{order.userUpiId}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              navigator.clipboard.writeText(order.userUpiId || '');
              toast.success('UPI ID copied!');
            }}>Copy</button>
          </div>
          <p className="body-sm" style={{ marginTop: 8, color: 'var(--text-muted)' }}>
            The user is selling their crypto. Transfer ₹{parseFloat(order.uniqueFiatAmount).toFixed(2)} to this UPI ID.
          </p>
          
          {order.upiQr && (
            <div style={{ marginTop: 16 }}>
              {/* QR + Right Info side by side */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* QR Code */}
                <div style={{ background: 'white', padding: 12, borderRadius: 12, textAlign: 'center', flexShrink: 0 }}>
                  <QRCodeSVG value={order.upiQr} size={160} />
                  <p style={{ marginTop: 8, color: '#555', fontSize: 12, fontWeight: 600 }}>Scan to pay User</p>
                </div>

                {/* Right Side Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignSelf: 'center' }}>
                  {/* Total Amount */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>TOTAL AMOUNT</p>
                    <div style={{ background: 'rgba(0,255,150,0.1)', border: '1px solid var(--accent)', padding: '10px 14px', borderRadius: 10 }}>
                      <p style={{ color: 'var(--accent)', margin: 0, fontSize: 22, fontWeight: 700 }}>₹{parseFloat(order.uniqueFiatAmount).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Pay via App Button */}
                  <button
                    onClick={() => toast('External platform integration coming soon!')}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      color: 'white',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Pay via App</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingLeft: 24 }}>GPay, PhonePe, Paytm</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {order.type === 'SELL' && order.status === 'MATCHED' && isActive && (
        <div className="card" style={{ border: '1px solid var(--warning)', background: 'rgba(255, 170, 0, 0.1)' }}>
          <p className="title-sm" style={{ color: 'var(--warning)', marginBottom: 8 }}>⚠️ Waiting for User Escrow Deposit</p>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Do not pay the fiat yet! The user has not locked their ETH into the Secure Escrow Smart Contract. 
            The Payment Confirmation button will automatically appear here once the blockchain confirms the user's funds are secured.
          </p>
        </div>
      )}

      {order.paymentProofUrl && (
        <div className="card">
          <p className="label" style={{ marginBottom: 8 }}>Payment Proof</p>
          <img src={order.paymentProofUrl} alt="Payment proof" style={{ borderRadius: 8, width: '100%' }} />
        </div>
      )}

      {canLock && (
        <motion.button
          className="btn btn-primary btn-full btn-lg"
          onClick={lockEscrow}
          disabled={loading}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          style={{ marginTop: 8, fontSize: 16 }}
        >
          {loading ? 'Processing Transaction...' : '🔒 Lock ETH on Web3 Escrow Contract'}
        </motion.button>
      )}

      {canMarkPaid && (
        <motion.button
          id="i-paid-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={markPaid}
          disabled={loading}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          style={{ marginTop: 8, fontSize: 18, background: 'var(--accent)' }}
        >
          {loading ? 'Marking...' : '✅ I Have Paid Fiat to User'}
        </motion.button>
      )}

      {canConfirm && (
        <motion.button
          id="confirm-payment-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={confirmAndSettle}
          disabled={loading}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          style={{ marginTop: 8, fontSize: 18 }}
        >
          {loading ? 'Settling on-chain…' : '✅ Confirm Receipt & Release ETH'}
        </motion.button>
      )}

      {(order.status === 'CREATED' || order.status === 'MATCHED' || order.status === 'ESCROW_LOCKED') && (
        <button className="btn btn-secondary btn-full"
          disabled={loading} onClick={cancelOrder} style={{ marginTop: 8 }}>
          Cancel Order
        </button>
      )}
    </div>
  );
}
