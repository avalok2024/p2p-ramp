import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useWeb3Store } from '../store/web3.store';
import { ethers } from 'ethers';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../api/client';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { CurrencyToggle } from '../components/CurrencyToggle';

export default function WalletPage() {
  const { wallet, address, balanceEth, isUnlocked, hasStoredWallet, generateNewWallet, unlockWallet, lockWallet, initWallet, fetchBalance } = useWeb3Store();
  const { formatEth } = useFormatCurrency();
  
  const [password, setPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(!hasStoredWallet());
  const [loading, setLoading] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isUsdtMode, setIsUsdtMode] = useState(false);
  
  const [showForceReleaseModal, setShowForceReleaseModal] = useState(false);
  const [forceReleaseOrderId, setForceReleaseOrderId] = useState('');
  
  const [dbWallets, setDbWallets] = useState<any[]>([]);

  const fetchDbWallets = async () => {
    try {
      const res = await api.get('/wallet');
      setDbWallets(res.data);
    } catch(e) {}
  };

  useEffect(() => {
    initWallet();
    fetchDbWallets();
  }, [initWallet]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) return toast.error('Password too short!');
    setLoading(true);
    await generateNewWallet(password);
    toast.success('Admin Wallet Generated!');
    setLoading(false);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await unlockWallet(password);
    if (!success) toast.error('Incorrect password or invalid key');
    else toast.success('Wallet Unlocked');
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const handleSendEth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return toast.error('Wallet not initialized');
    if (!sendAddress || !sendAmount) return toast.error('Fill all fields');
    try {
      setSendLoading(true);
      const finalEthAmount = isUsdtMode && parseFloat(sendAmount) > 0
        ? (parseFloat(sendAmount) / 3000).toFixed(8)
        : sendAmount;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title-lg">{!isUnlocked ? '' : '💳 Admin Wallet Dashboard'}</h1>
        {isUnlocked && (
          <button className="btn btn-secondary" onClick={lockWallet}>🔒 Lock Wallet</button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="card" style={{ maxWidth: 500, margin: '40px auto', padding: 30, textAlign: 'center' }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h2 className="title-md">{isGenerating ? 'Create Secure Admin Wallet' : 'Secure Admin Wallet Access'}</h2>
            <p className="body-sm" style={{ marginBottom: 24, margin: '8px auto', lineHeight: 1.5, maxWidth: 350 }}>
              {isGenerating 
                ? 'Generate a locally encrypted key to access Admin platform Escrow overrides.'
                : 'Enter your admin password to unlock and access the embedded Web3 wallet. This wallet allows you to monitor balances and perform administrative blockchain actions.'}
            </p>

            <form onSubmit={isGenerating ? handleGenerate : handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                type="password"
                className="input"
                placeholder="Enter Wallet Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
                style={{ textAlign: 'center', fontSize: 16 }}
              />
              <button type="submit" className="btn btn-primary" disabled={loading || !password}>
                {loading ? 'Processing...' : isGenerating ? 'Generate Secure Wallet' : 'Unlock Wallet'}
              </button>
            </form>

            <p className="body-sm" style={{ marginTop: 24, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              <strong>Security Note:</strong> Your private key is encrypted using your password and stored securely. Never share your password.
            </p>

            <button 
              className="btn" 
              style={{ background: 'transparent', marginTop: 12, fontSize: 12, opacity: 0.6 }}
              onClick={() => setIsGenerating(!isGenerating)}
            >
              {isGenerating ? 'Already have a wallet? Login' : 'Create new overriding key'}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(88,101,242,0.1) 0%, rgba(138,43,226,0.05) 100%)',
              border: '1px solid rgba(138,43,226,0.2)',
              boxShadow: '0 8px 32px 0 rgba(31,38,135,0.07)',
              backdropFilter: 'blur(8px)',
              padding: 24,
              overflow: 'hidden',
              maxWidth: 700,
              margin: '0 auto',
              width: '100%',
              borderRadius: 16
            }}
          >
            {/* Subtitle */}
            <p className="body-md" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 24, fontSize: 14 }}>
              Manage funds, monitor balances, and execute admin-level blockchain actions.
            </p>

            {/* Wallet Details & Balances Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Left Details */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="label" style={{ color: 'var(--accent)', margin: '0 0 12px 0', fontSize: 11 }}>🧾 WALLET DETAILS</p>
                <div>
                  <p className="label" style={{ margin: 0, fontSize: 10 }}>Network:</p>
                  <p className="body-sm" style={{ margin: '2px 0 12px 0' }}>Sepolia Testnet</p>
                  
                  <p className="label" style={{ margin: 0, fontSize: 10 }}>Connection Status:</p>
                  <p className="body-sm" style={{ margin: '2px 0 12px 0' }}>✅ Connected</p>
                  
                  <p className="label" style={{ margin: 0, fontSize: 10 }}>Wallet Address:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <p className="mono" style={{ margin: 0, fontSize: 12, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{address}</p>
                    <button onClick={() => copyToClipboard(address || '')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }} title="Copy">📋</button>
                  </div>
                  <p className="body-sm" style={{ margin: '2px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Connected and active</p>
                </div>
              </div>

              {/* Right Balances */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <p className="label" style={{ color: 'var(--accent)', margin: 0, fontSize: 11, whiteSpace: 'nowrap' }}>💰 BALANCES</p>
                  <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left', alignSelf: 'flex-start' }}>
                    <CurrencyToggle />
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p className="label" style={{ margin: 0, fontSize: 10, opacity: 0.8, textTransform: 'uppercase' }}>Primary Balance:</p>
                  <h2 className="title-xl" style={{ margin: '4px 0 0 0', fontFamily: 'monospace', fontSize: 36 }}>{formatEth(parseFloat(balanceEth || '0')).formatted}</h2>
                  <p className="body-sm" style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Available for gas fees</p>
                </div>
              </div>
            </div>

            {/* Admin Buttons for Send/Receive */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setShowSendModal(true)}>
                <span>⬆️</span> Send
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setShowReceiveModal(true)}>
                <span>⬇️</span> Receive
              </button>
            </div>

            {/* System Overrides */}
            <div style={{ background: 'linear-gradient(135deg, rgba(88,101,242,0.05) 0%, rgba(200,80,192,0.05) 100%)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
               <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>⚙️ System Overrides</h4>
               <p className="body-sm" style={{ margin: '0 0 16px 0', color: 'rgba(255,255,255,0.6)' }}>Administrative tools for testing and emergency control of the system.</p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
                   <div style={{ flex: 1 }}>
                     <p style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 600 }}>🔑 Force Release</p>
                     <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Manually release locked funds from escrow in case of disputes or system issues. This action overrides standard contract conditions.</p>
                   </div>
                   <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => setShowForceReleaseModal(true)}>Force Release</button>
                 </div>
               </div>
            </div>

            {/* Warning Section */}
            <div style={{ background: 'rgba(255,60,60,0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,60,60,0.2)', marginTop: 24 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#ff6b6b', fontWeight: 600 }}>⚠️ Admin Actions Notice</h4>
              <p className="body-sm" style={{ margin: 0, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                Actions performed here directly interact with smart contracts on the blockchain. While this is a test environment, misuse of administrative controls may affect system behavior and transaction integrity.
              </p>
            </div>

            {/* Footer Note */}
            <p className="body-sm" style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              🔐 This wallet operates on the Sepolia test network using simulated assets. It is intended strictly for testing and administrative control.
            </p>
            
          </motion.div>
        )}
      </AnimatePresence>

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
                      Amount ({isUsdtMode ? 'USDT' : 'ETH'})
                      {sendAmount && <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 10 }}>≈ {isUsdtMode ? (parseFloat(sendAmount) / 3000).toFixed(4) + ' ETH' : (parseFloat(sendAmount) * 3000).toFixed(2) + ' USDT'}</span>}
                    </label>
                    <button type="button" onClick={() => setSendAmount(isUsdtMode ? (parseFloat(balanceEth) * 3000).toFixed(2) : balanceEth)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>MAX</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" className="input" placeholder="0.0" step="0.0001" value={sendAmount} onChange={e => setSendAmount(e.target.value)} required disabled={sendLoading} style={{ flex: 1 }} />
                    <button type="button" className="btn" style={{ padding: '0 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }} onClick={() => { setIsUsdtMode(!isUsdtMode); setSendAmount(''); }} title="Swap Currency">
                      ⇌ {isUsdtMode ? 'USDT' : 'ETH'}
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
                <button onClick={() => copyToClipboard(address)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 8 }} title="Copy">📋</button>
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

        {/* Force Release Modal */}
        {showForceReleaseModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card" style={{ width: '100%', maxWidth: 400, backgroundColor: '#111218', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="title-md" style={{ margin: 0, color: '#ff6b6b' }}>🔑 Force Release</h3>
                <button onClick={() => setShowForceReleaseModal(false)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>
              <p className="body-sm" style={{ marginBottom: 16 }}>Enter the Order ID to forcefully release locked Escrow funds to the Buyer.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if(!forceReleaseOrderId) return;
                try {
                  await api.post(`/admin/escrow/${forceReleaseOrderId}/force-release`);
                  toast.success('Funds successfully forced completely directly to Buyer!');
                  setShowForceReleaseModal(false);
                  setForceReleaseOrderId('');
                } catch(e:any) {
                  toast.error(e.response?.data?.message || 'Failed to force release');
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <input type="text" className="input" placeholder="e.g. 1a2b3c..." value={forceReleaseOrderId} onChange={e => setForceReleaseOrderId(e.target.value)} required />
                <button type="submit" className="btn btn-primary" style={{ background: '#ff6b6b' }}>Confirm Force Release</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
