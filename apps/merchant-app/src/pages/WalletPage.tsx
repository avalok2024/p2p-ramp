import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useWeb3Store } from '../store/web3.store';

export default function WalletPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { address, balanceEth } = useWeb3Store();

  useEffect(() => {
    api.get('/wallet').then(r => setWallets(r.data));
    api.get('/wallet/transactions').then(r => setTxns(r.data));
  }, []);

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Wallet address copied!');
    }
  };

  const deposit = async () => {
    setLoading(true);
    try {
      await api.post('/wallet/deposit', { crypto: 'USDT', amount: parseFloat(amount) });
      api.get('/wallet').then(r => setWallets(r.data));
      toast.success('USDT deposited ✅'); setAmount('');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const usdt = wallets.find(w => w.crypto === 'USDT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg" style={{ paddingTop: 16 }}>Liquidity Wallet</h1>

      {usdt && (
        <motion.div className="card card-glow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label">ETH Available Balance</p>
          <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: 'monospace' }}>
            {balanceEth} <span style={{ fontSize: 16, color: 'var(--accent)' }}>ETH</span>
          </h2>
          {+usdt.lockedBalance > 0 && <p className="body-sm">🔒 {(+usdt.lockedBalance).toFixed(4)} USDT in active escrows</p>}
        </motion.div>
      )}

      {/* Internal Web3 Wallet Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(200,80,192,0.1) 0%, rgba(255,204,112,0.1) 100%)',
          border: '1px solid rgba(255,204,112,0.3)',
          boxShadow: '0 8px 32px 0 rgba(31,38,135,0.07)',
          backdropFilter: 'blur(4px)',
          borderRadius: 16,
          padding: 24,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: 'var(--accent)', filter: 'blur(50px)', opacity: 0.4 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p className="label" style={{ color: 'var(--accent)', letterSpacing: 1, margin: 0 }}>MERCHANT ESCROW WALLET</p>
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
      {/* Simulated deposit */}
      {/* <div className="card" style={{ opacity: 0.6 }}>
        <p className="label" style={{ marginBottom: 8 }}>Simulate Centralized Deposit (Legacy)</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="m-deposit-amount" type="number" className="input" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1 }} inputMode="decimal" />
          <button id="m-deposit-btn" className="btn btn-secondary" disabled={loading || !amount} onClick={deposit}>{loading ? '…' : 'Add'}</button>
        </div>
      </div> */}

      <div>
        <p className="title-sm" style={{ marginBottom: 12 }}>Transactions</p>
        {txns.map((t, i) => (
          <motion.div key={t.id} className="list-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
            <div>
              <p className="title-sm">{t.type.replace(/_/g, ' ')}</p>
              <p className="body-sm">{t.note}</p>
            </div>
            <p className="title-sm" style={{ color: t.amount > 0 ? 'var(--accent)' : 'var(--danger)' }}>
              {t.amount > 0 ? '+' : ''}{(+t.amount).toFixed(4)}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
