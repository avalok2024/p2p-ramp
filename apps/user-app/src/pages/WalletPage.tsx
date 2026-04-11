import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useWalletStore } from '../store/wallet.store';

export default function WalletPage() {
  const { wallets, transactions, fetchWallets, fetchTransactions, deposit } = useWalletStore();
  const [depositAmt, setDepAmt] = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => { fetchWallets(); fetchTransactions(); }, []);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      await deposit('USDT', amt);
      await fetchWallets();
      toast.success(`${amt} USDT deposited ✅`);
      setDepAmt('');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const txnIcon: Record<string, string> = {
    DEPOSIT: '⬇️', WITHDRAWAL: '⬆️', ESCROW_LOCK: '🔒',
    ESCROW_RELEASE: '🔓', ESCROW_REFUND: '↩️', TRADE_CREDIT: '✅', TRADE_DEBIT: '📤',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Wallet</h1>

      {/* Balance cards */}
      {wallets.map((w, i) => (
        <motion.div key={w.id} className="card card-glow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <p className="label">{w.crypto} Balance</p>
          <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: 'monospace' }}>
            {parseFloat('' + w.availableBalance).toFixed(4)}
            <span style={{ fontSize: 16, marginLeft: 6, color: 'var(--accent)' }}>{w.crypto}</span>
          </h2>
          {+w.lockedBalance > 0 && (
            <p className="body-sm">🔒 {parseFloat('' + w.lockedBalance).toFixed(4)} in escrow</p>
          )}
        </motion.div>
      ))}

      {/* Simulated deposit (MVP) */}
      <div className="card card-warning">
        <p className="label" style={{ marginBottom: 8 }}>Simulate Deposit (MVP)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="deposit-amount"
            type="number" className="input" placeholder="USDT amount"
            value={depositAmt} onChange={(e) => setDepAmt(e.target.value)}
            inputMode="decimal" style={{ flex: 1 }}
          />
          <button id="deposit-btn" className="btn btn-primary" onClick={handleDeposit} disabled={loading}>
            {loading ? '…' : 'Add'}
          </button>
        </div>
        <p className="body-sm" style={{ marginTop: 8 }}>
          ⚠️ This simulates a deposit for testing. Real blockchain in Phase 2.
        </p>
      </div>

      {/* Transaction history */}
      <div>
        <p className="title-sm" style={{ marginBottom: 12 }}>Transaction History</p>
        {transactions.length === 0 ? (
          <div className="empty-state"><div className="icon">📊</div><p>No transactions yet</p></div>
        ) : (
          transactions.map((t, i) => (
            <motion.div key={t.id} className="list-row"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{txnIcon[t.type] || '💳'}</span>
                <div>
                  <p className="title-sm">{t.type.replace(/_/g, ' ')}</p>
                  <p className="body-sm">{t.note || ''}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="title-sm" style={{ color: t.amount > 0 ? 'var(--accent)' : 'var(--danger)' }}>
                  {t.amount > 0 ? '+' : ''}{parseFloat('' + t.amount).toFixed(4)} {t.crypto}
                </p>
                <p className="body-sm">{parseFloat('' + t.balanceAfter).toFixed(4)} bal</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
