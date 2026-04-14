import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../api/client';
import { useWeb3Store } from '../store/web3.store';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export default function WalletPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { address, balanceEth, wallet, fetchBalance } = useWeb3Store();
  const { formatEth, symbol } = useFormatCurrency();

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isUsdcMode, setIsUsdcMode] = useState(false);

  useEffect(() => {
    const load = () => {
      api.get('/wallet/transactions').then((r) => setTxns(Array.isArray(r.data) ? r.data : []));
      if (fetchBalance) fetchBalance();
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSendEth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return toast.error('Wallet not initialized');
    if (!sendAddress || !sendAmount) return toast.error('Fill all fields');
    try {
      setSendLoading(true);
      const computedAmount = isUsdcMode ? (parseFloat(sendAmount) / 3000).toFixed(18) : sendAmount;
      const finalEthAmount = computedAmount;

      const tx = await wallet.sendTransaction({
        to: sendAddress,
        value: ethers.parseEther(finalEthAmount.toString())
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

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Wallet address copied!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Internal Web3 Wallet Card */}
      <h1 className="title-lg" style={{ paddingTop: 16 }}>Liquidity Wallet</h1>
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
            <p className="label" style={{ margin: 0 }}>On-chain (native ETH)</p>
            <h2 className="title-lg" style={{ margin: 0, fontFamily: 'monospace' }}>
              {(parseFloat(balanceEth || '0') || 0).toFixed(6)} ETH
            </h2>
            {symbol !== 'ETH' && (
              <p className="body-sm" style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)' }}>
                ≈ {formatEth(parseFloat(balanceEth || '0') || 0).formatted} <span style={{ fontSize: 10 }}>(display)</span>
              </p>
            )}
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
        <p className="body-sm" style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
          Escrow releases send Sepolia ETH to this address (saved on your profile). The currency toggle only changes how amounts are shown, not the token.
        </p>

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

      <div>
        <p className="title-sm" style={{ marginBottom: 12 }}>Transactions</p>
        {txns.length === 0 ? (
          <p className="body-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>No ledger entries. Check the block explorer for on-chain escrow transfers.</p>
        ) : null}
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
                    <label className="label" style={{ margin: 0 }}>
                      Amount ({isUsdcMode ? 'USDC' : 'ETH'})
                      {sendAmount && <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 10 }}>≈ {isUsdcMode ? (parseFloat(sendAmount) / 3000).toFixed(4) + ' ETH' : (parseFloat(sendAmount) * 3000).toFixed(2) + ' USDC'}</span>}
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="number" className="input" placeholder="0.0" step="0.0001" value={sendAmount} onChange={e => setSendAmount(e.target.value)} required disabled={sendLoading} style={{ flex: 1 }} />
                    <button type="button" className="btn" style={{ padding: '0 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }} onClick={() => { setIsUsdcMode(!isUsdcMode); setSendAmount(''); }} title="Swap Currency">
                      ⇌ {isUsdcMode ? 'USDC' : 'ETH'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 20, 30, 50, 100].map(pct => (
                      <button
                        key={pct} type="button"
                        onClick={() => {
                          const maxAmt = isUsdcMode ? parseFloat(balanceEth) * 3000 : parseFloat(balanceEth);
                          setSendAmount((maxAmt * (pct / 100)).toFixed(isUsdcMode ? 2 : 4));
                        }}
                        style={{
                          flex: 1, padding: '4px 0', fontSize: 11, fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--accent)', borderRadius: 4, cursor: 'pointer'
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
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
