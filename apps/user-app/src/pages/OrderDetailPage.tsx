import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { useOrderStore } from '../store/order.store';
import { useAuthStore }  from '../store/auth.store';
import { useWeb3Store } from '../store/web3.store';
import api, { apiErrorMessage } from '../api/client';
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
  const { formatEth, symbol } = useFormatCurrency();
  const wallet = useWeb3Store((s) => s.wallet);
  const fetchBalance = useWeb3Store((s) => s.fetchBalance);
  const syncProfileAddress = useWeb3Store((s) => s.syncProfileAddress);
  const address = useWeb3Store((s) => s.address);
  const [order, setOrder] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!orderId) return;
    setLoadError(null);
    void syncProfileAddress();
    fetchOrder(orderId)
      .then(setOrder)
      .catch((e) => {
        setOrder(null);
        setLoadError(apiErrorMessage(e));
      });
  }, [orderId]);

  const profileWeb3 = order?.user?.web3Address as string | undefined;
  const buySettlementMismatch =
    !!order &&
    order.type === 'BUY' &&
    !!address &&
    !!profileWeb3 &&
    profileWeb3.toLowerCase() !== address.toLowerCase();

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

  // ── COMPLETION SCREEN ──────────────────────────────────────────────────────
  if (order.status === 'COMPLETED') {
    const isSell = order.type === 'SELL';
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 24, padding: 24, textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #00ff94, #00b4d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 0 40px rgba(0,255,148,0.5)' }}
        >
          ✓
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="title-lg" style={{ marginBottom: 8 }}>Trade Complete! 🎉</h1>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
            {isSell ? 'You have received your fiat payment.' : `Your ${order.crypto} was released on-chain to your profile wallet address.`}
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
            <span className="body-sm">Amount ({order.crypto})</span>
            <span className="title-sm">{parseFloat(order.cryptoAmount).toFixed(6)} {order.crypto}</span>
          </div>
          <div className="list-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12 }}>
            <span className="body-sm">Fiat Paid</span>
            <span className="title-sm">₹{parseFloat(order.fiatAmount).toFixed(2)}</span>
          </div>
          <div className="list-row">
            <span className="body-sm">Order Type</span>
            <span className="title-sm" style={{ color: isSell ? 'var(--purple)' : 'var(--accent)' }}>{order.type}</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>View Orders</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>Go Home</button>
        </motion.div>
      </motion.div>
    );
  }

  const isBuyer    = order.userId === user?.id; // In reality this is just "is this the user"
  const stepIdx    = STATUS_STEPS.indexOf(order.status);
  const isActive   = !['COMPLETED','CANCELLED','REFUNDED','DISPUTE'].includes(order.status);

  const lockEscrow = async () => {
    if (!orderId || !order || !wallet) {
      if (!wallet) toast.error('Web3 Wallet not initialized');
      return;
    }
    setLoading(true);
    try {
      await syncProfileAddress();
      const ca = resolveEscrowAddress(order);
      const contract = new ethers.Contract(ca, P2P_ESCROW_ABI, wallet);
      const b32OrderId = uuidToBytes32(order.id);
      const toastId = toast.loading('Sending ETH to Smart Contract...');
      const to = ethers.getAddress(order.merchant.web3Address);
      const tx = await contract.deposit(b32OrderId, to, { value: depositValueWei(order) });
      toast.loading(`Waiting for confirmation... Tx: ${tx.hash.slice(0, 10)}...`, { id: toastId });
      await tx.wait();
      toast.success('Funds Locked On-chain! Verifying with backend...', { id: toastId });
      const res = await api.post(`/orders/${orderId}/verify-lock`);
      setOrder(res.data);
      void fetchBalance();
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || 'Error locking on-chain');
    } finally { setLoading(false); }
  };

  /** Seller confirms fiat; backend signs escrow release as contract owner (ETH → on-chain recipient). */
  const confirmAndSettle = async () => {
    if (!orderId || !order) return;
    setLoading(true);
    try {
      const toastId = toast.loading('Settling on-chain (server-signed release)…');
      const res = await api.post(`/orders/${orderId}/confirm`);
      setOrder(res.data);
      toast.success('ETH released to the recipient wallet on-chain.', { id: toastId });
      void fetchBalance();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || e.shortMessage || e.message || 'Settlement failed');
    } finally { setLoading(false); }
  };

  const canPay = isBuyer && isActive && order.status === 'ESCROW_LOCKED' && order.type === 'BUY';
  const canLock = isBuyer && isActive && order.status === 'MATCHED' && order.type === 'SELL';
  const canConfirm = isBuyer && isActive && order.status === 'PAID_MARKED' && order.type === 'SELL';

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

      {buySettlementMismatch && (
        <div className="card card-danger" style={{ padding: 14 }}>
          <p className="title-sm" style={{ marginBottom: 6 }}>Wallet address mismatch</p>
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Your profile escrow address ({profileWeb3?.slice(0, 10)}…) does not match this device&apos;s wallet ({address?.slice(0, 10)}…).
            The merchant will lock ETH to your <b>profile</b> address. Open the Wallet tab so your address syncs, or use the same device where you signed up.
          </p>
        </div>
      )}

      {/* Order summary card */}
      <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {[
          ['Order #',      order.orderNumber != null ? `#${order.orderNumber}` : '—'],
          ['Order ID (UUID)', order.id],
          ['Type',         order.type],
          ['Crypto',       formatEth(parseFloat(order.cryptoAmount)).formatted],
          ['Fiat Amount',  `₹${num(order.fiatAmount)}`],
          ['Pay Exact',    `₹${parseFloat('' + order.uniqueFiatAmount).toFixed(2)}`],
          ['Rate',         `₹${num(order.pricePerUnit / formatEth(1).rate)} / ${symbol}`],
          ['Method',       order.paymentMethod],
        ].map(([k, v]) => (
          <div className="list-row" key={k as string}>
            <span className="body-sm">{k as string}</span>
            <span className="title-sm">{v as string}</span>
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
      {canPay && (
        <motion.button id="pay-btn" className="btn btn-primary btn-full btn-lg"
          onClick={() => navigate(`/payment/${order.id}`)} whileTap={{ scale: 0.97 }}>
          Make Payment →
        </motion.button>
      )}
      
      {canLock && (
        <motion.button id="lock-btn" className="btn btn-primary btn-full btn-lg"
          onClick={lockEscrow} disabled={loading} whileTap={{ scale: 0.97 }}
          style={{ background: 'var(--purple)', boxShadow: '0 0 24px rgba(124,58,237,0.4)' }}>
          {loading ? 'Processing Transaction...' : '🔒 Lock ETH on Web3 Escrow Contract'}
        </motion.button>
      )}
      
      {canConfirm && (
        <motion.button id="confirm-btn" className="btn btn-primary btn-full btn-lg"
          onClick={confirmAndSettle} disabled={loading} whileTap={{ scale: 0.97 }}>
          {loading ? 'Settling…' : '✅ I Received Fiat — Release ETH'}
        </motion.button>
      )}
      {isBuyer && order.status === 'PAID_MARKED' && (
        <motion.button id="dispute-btn" className="btn btn-danger btn-full"
          onClick={() => setShowDispute(true)} whileTap={{ scale: 0.97 }}>
          ⚖️ Raise Dispute
        </motion.button>
      )}
      {isActive && (order.status === 'ESCROW_LOCKED' || order.status === 'MATCHED' || order.status === 'CREATED') && (
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
