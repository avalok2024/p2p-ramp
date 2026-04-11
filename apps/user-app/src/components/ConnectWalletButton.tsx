import { useWeb3Store } from '../store/web3.store';

export function ConnectWalletButton() {
  const { address, wallet, isGenerating, generateNewWallet, disconnect } = useWeb3Store();

  if (address && wallet) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="badge badge-primary mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button 
          onClick={disconnect} 
          className="btn btn-secondary btn-sm"
          style={{ padding: '4px 8px', fontSize: 12 }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={generateNewWallet} 
      disabled={isGenerating}
      className="btn btn-primary btn-sm"
      style={{ background: 'var(--accent)', color: '#000' }}
    >
      {isGenerating ? 'Generating...' : 'Create Internal Wallet'}
    </button>
  );
}
