import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useWalletStore } from '../store/wallet.store';
import { useWeb3Store } from '../store/web3.store';

export default function WalletPage() {
  const { wallets, transactions, fetchWallets, fetchTransactions, deposit } = useWalletStore();
  const [depositAmt, setDepAmt] = useState('');
  const [loading, setLoading] = useState(false);

  const { address, balanceEth } = useWeb3Store();

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

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Wallet address copied!');
    }
  };

  const txnIcon: Record<string, string> = {
    DEPOSIT: '⬇️', WITHDRAWAL: '⬆️', ESCROW_LOCK: '🔒',
    ESCROW_RELEASE: '🔓', ESCROW_REFUND: '↩️', TRADE_CREDIT: '✅', TRADE_DEBIT: '📤',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Wallet</h1>

      {/* Web3 Integration Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(138,43,226,0.1) 100%)',
          border: '1px solid rgba(138,43,226,0.3)',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.07)',
          backdropFilter: 'blur(4px)',
          borderRadius: 16,
          padding: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow effect */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: 'var(--accent)', filter: 'blur(50px)', opacity: 0.4 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p className="label" style={{ color: 'var(--accent)', letterSpacing: 1, margin: 0 }}>INTERNAL WEB3 WALLET</p>
            <h3 style={{ margin: '8px 0 0', fontWeight: 600 }}>Sepolia Testnet</h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="label" style={{ margin: 0 }}>ETH Balance</p>
            <h2 className="title-lg" style={{ margin: 0, fontFamily: 'monospace' }}>{balanceEth}</h2>
          </div>
        </div>

        {address ? (
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '12px 16px',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <p className="body-sm" style={{ margin: 0, color: 'rgba(255,255,255,0.6)' }}>Your Public Address</p>
              <p className="mono" style={{ margin: '4px 0 0', fontSize: 14 }}>{address}</p>
            </div>
            <button
              onClick={copyToClipboard}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 20, padding: 8 }}
              title="Copy Address"
            >
              📋
            </button>
          </div>
        ) : (
          <p className="body-sm" style={{ marginTop: 8 }}>
            Generating your secure internal wallet...
          </p>
        )}
      </div>

      {wallets.map((w, i) => (
        <motion.div key={w.id} className="card card-glow"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <p className="label">ETH Available Balance</p>
          <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: 'monospace' }}>
            {balanceEth}
            <span style={{ fontSize: 16, marginLeft: 6, color: 'var(--accent)' }}>ETH</span>
          </h2>
          {+w.lockedBalance > 0 && (
            <p className="body-sm">🔒 {parseFloat('' + w.lockedBalance).toFixed(4)} USDT locked in escrow</p>
          )}
        </motion.div>
      ))}



      {/* Simulated deposit (MVP) */}
      {/* <div className="card" style={{ opacity: 0.6 }}>
        <p className="label" style={{ marginBottom: 8 }}>Simulate Centralized Deposit (Legacy)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="deposit-amount"
            type="number" className="input" placeholder="USDT amount"
            value={depositAmt} onChange={(e) => setDepAmt(e.target.value)}
            inputMode="decimal" style={{ flex: 1 }}
          />
          <button id="deposit-btn" className="btn btn-secondary" onClick={handleDeposit} disabled={loading}>
            {loading ? '…' : 'Add'}
          </button>
        </div>
      </div> */}

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
