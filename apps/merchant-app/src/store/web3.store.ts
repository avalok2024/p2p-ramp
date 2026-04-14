import { create } from 'zustand';
import { ethers } from 'ethers';
import api from '../api/client';

interface Web3Store {
  wallet: any | null;
  address: string | null;
  balanceEth: string;
  isGenerating: boolean;
  rpcUrl: string;

  initWallet: () => Promise<void>;
  generateNewWallet: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  syncProfileAddress: () => Promise<void>;
  disconnect: () => void;
}

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

/** Silently sync the wallet address to the backend profile */
async function syncAddressToBackend(address: string) {
  try {
    await api.patch('/user/profile', { web3Address: address });
  } catch (e) {
    console.warn('Failed to sync web3Address to backend:', e);
  }
}

export const useWeb3Store = create<Web3Store>((set, get) => ({
  wallet: null,
  address: null,
  balanceEth: '0.0000',
  isGenerating: false,
  rpcUrl: RPC_URL,

  initWallet: async () => {
    let savedKey = localStorage.getItem('embedded_wallet_key');
    if (!savedKey) {
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
      // Always sync so order.merchant.web3Address is never null
      syncAddressToBackend(wallet.address);
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
      syncAddressToBackend(randomWallet.address);
    } finally {
      set({ isGenerating: false });
    }
  },

  fetchBalance: async () => {
    const { wallet } = get();
    if (!wallet || !wallet.provider) return;
    try {
      const bal = await wallet.provider.getBalance(wallet.address);
      const eth = parseFloat(ethers.formatEther(bal));
      set({ balanceEth: (Number.isFinite(eth) ? eth : 0).toFixed(6) });
    } catch (e) {
      console.error('Failed to fetch balance', e);
    }
  },

  syncProfileAddress: async () => {
    const { wallet } = get();
    if (wallet?.address) await syncAddressToBackend(wallet.address);
  },

  disconnect: () => {
    // Disabled: Merchant wallets are permanent
  },
}));
