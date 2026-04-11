import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function WalletPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [txns, setTxns]       = useState<any[]>([]);
  const [amount, setAmount]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/wallet').then(r => setWallets(r.data));
    api.get('/wallet/transactions').then(r => setTxns(r.data));
  }, []);

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
          <p className="label">Available Balance</p>
          <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: 'monospace' }}>
            {(+usdt.availableBalance).toFixed(4)} <span style={{ fontSize: 16, color: 'var(--accent)' }}>USDT</span>
          </h2>
          {+usdt.lockedBalance > 0 && <p className="body-sm">🔒 {(+usdt.lockedBalance).toFixed(4)} in active escrows</p>}
        </motion.div>
      )}

      <div className="card card-warning">
        <p className="label" style={{ marginBottom: 8 }}>Add USDT Liquidity</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="m-deposit-amount" type="number" className="input" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1 }} inputMode="decimal" />
          <button id="m-deposit-btn" className="btn btn-primary" disabled={loading || !amount} onClick={deposit}>{loading ? '…' : 'Add'}</button>
        </div>
      </div>

      <div>
        <p className="title-sm" style={{ marginBottom: 12 }}>Transactions</p>
        {txns.map((t, i) => (
          <motion.div key={t.id} className="list-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
            <div>
              <p className="title-sm">{t.type.replace(/_/g,' ')}</p>
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
