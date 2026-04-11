import { create } from 'zustand';
import { ethers } from 'ethers';

interface Web3Store {
  wallet: ethers.Wallet | null;
  address: string | null;
  balanceEth: string;
  isGenerating: boolean;
  rpcUrl: string;

  initWallet: () => Promise<void>;
  generateNewWallet: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  disconnect: () => void;
}

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

export const useWeb3Store = create<Web3Store>((set, get) => ({
  wallet: null,
  address: null,
  balanceEth: '0.0000',
  isGenerating: false,
  rpcUrl: RPC_URL,

  initWallet: async () => {
    let savedKey = localStorage.getItem('embedded_wallet_key');
    if (!savedKey) {
      // Auto-generate if it doesn't exist
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const randomWallet = ethers.Wallet.createRandom().connect(provider);
      savedKey = randomWallet.privateKey;
      localStorage.setItem('embedded_wallet_key', savedKey);
    }
    
    if (savedKey) {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(savedKey, provider);
      set({ wallet, address: wallet.address });
      get().fetchBalance();
    }
  },

  generateNewWallet: async () => {
    set({ isGenerating: true });
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const randomWallet = ethers.Wallet.createRandom().connect(provider);
      localStorage.setItem('embedded_wallet_key', randomWallet.privateKey);
      set({ wallet: randomWallet, address: randomWallet.address });
      get().fetchBalance();
    } finally {
      set({ isGenerating: false });
    }
  },

  fetchBalance: async () => {
    const { wallet } = get();
    if (!wallet || !wallet.provider) return;
    try {
      const bal = await wallet.provider.getBalance(wallet.address);
      set({ balanceEth: (Number(bal) / 1e18).toFixed(4) });
    } catch (e) {
      console.error('Failed to fetch balance', e);
    }
  },

  disconnect: () => {
    // Disabled: Merchant wallets are permanent
  }
}));
