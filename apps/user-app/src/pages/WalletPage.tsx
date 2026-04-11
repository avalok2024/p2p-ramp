import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { QRCodeCanvas } from 'qrcode.react';
import { useWalletStore } from '../store/wallet.store';
import { useWeb3Store } from '../store/web3.store';

export default function WalletPage() {
  const { wallets, transactions, fetchWallets, fetchTransactions, deposit } = useWalletStore();
  const [depositAmt, setDepAmt] = useState('');
  const [loading, setLoading] = useState(false);

  const { address, balanceEth, wallet, fetchBalance } = useWeb3Store();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => { fetchWallets(); fetchTransactions(); }, []);

  const handleSendEth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return toast.error('Wallet not initialized');
    if (!sendAddress || !sendAmount) return toast.error('Fill all fields');
    try {
      setSendLoading(true);
      const tx = await wallet.sendTransaction({
        to: sendAddress,
        value: ethers.parseEther(sendAmount)
      });
      toast.success('Transaction sent! Waiting...');
      await tx.wait();
      setShowSendModal(false);
      setShowSuccessModal(true);
      setSendAmount('');
      setSendAddress('');
      if (fetchBalance) fetchBalance();
    } catch (err: any) {
      toast.error(err.shortMessage || err.message || 'Transaction failed');
    } finally {
      setSendLoading(false);
    }
  };

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

  const usdt = wallets.find(w => w.crypto === 'USDT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Wallet</h1>

      {usdt && (
        <motion.div className="card card-glow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="label">USDT Available Balance (Platform)</p>
          <h2 className="title-xl" style={{ margin: '8px 0', fontFamily: 'monospace' }}>
            {parseFloat(usdt.availableBalance).toFixed(4)} <span style={{ fontSize: 16, color: 'var(--accent)' }}>USDT</span>
          </h2>
          {+usdt.lockedBalance > 0 && <p className="body-sm">🔒 {(+usdt.lockedBalance).toFixed(4)} USDT locked in active escrows</p>}
        </motion.div>
      )}

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

        {/* Send and Receive Action Buttons */}
        {address && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
              onClick={() => setShowSendModal(true)}
            >
              <span>⬆️</span> Send
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} 
              onClick={() => setShowReceiveModal(true)}
            >
              <span>⬇️</span> Receive
            </button>
          </div>
        )}
      </div>

      {/* (Removed multiple wallets map, using only USDT above to match merchant interface) */}



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

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card" style={{ width: '100%', maxWidth: 400, backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="title-md" style={{ margin: 0 }}>Send ETH</h3>
                <button onClick={() => setShowSendModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={handleSendEth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Recipient Address</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" className="input" placeholder="0x..." value={sendAddress} onChange={e => setSendAddress(e.target.value)} required disabled={sendLoading} style={{ flex: 1 }} />
                    <button type="button" className="btn" style={{ padding: '0 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 20 }} onClick={() => toast('Scanner coming soon!')} title="Scan QR">📷</button>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="label" style={{ margin: 0 }}>Amount (ETH)</label>
                    <button type="button" onClick={() => setSendAmount(balanceEth)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>MAX</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" className="input" placeholder="0.0" step="0.0001" value={sendAmount} onChange={e => setSendAmount(e.target.value)} required disabled={sendLoading} style={{ flex: 1 }} />
                    <button type="button" className="btn" style={{ padding: '0 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }} onClick={() => toast('Currency converter preview coming soon!')} title="Swap Currency">
                      ⇌ ETH
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={sendLoading}>
                  {sendLoading ? 'Sending...' : 'Confirm Send'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Receive Modal */}
        {showReceiveModal && address && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card" style={{ width: '100%', maxWidth: 350, textAlign: 'center', backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="title-md" style={{ margin: 0 }}>Receive ETH</h3>
                <button onClick={() => setShowReceiveModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              
              <div style={{ background: 'white', padding: 16, borderRadius: 12, display: 'inline-block', marginBottom: 20 }}>
                <QRCodeCanvas value={address} size={200} />
              </div>
              
              <p className="body-sm" style={{ marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Your Public Address</p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="mono" style={{ fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{address}</span>
                <button onClick={copyToClipboard} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8 }} title="Copy">📋</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} className="card" style={{ width: '100%', maxWidth: 350, textAlign: 'center', padding: '30px 20px', backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
              <h3 className="title-lg" style={{ color: 'var(--accent)', marginBottom: 8 }}>Got it!</h3>
              <p className="body-sm" style={{ marginBottom: 24 }}>Your Web3 transfer has been successfully confirmed on the Sepolia network.</p>
              <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)} style={{ width: '100%' }}>Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
