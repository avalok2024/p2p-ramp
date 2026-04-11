import { create } from 'zustand';
import { ethers } from 'ethers';

// Wait! Custom AES or just pure ethers wallet encrypt?
// ethers.Wallet.encrypt requires time. We will use a quicker encrypt mechanism for the prototype
// using CryptoJS if possible, or ethers encrypt if we must. Since its a prototype, we'll implement a fast
// mock AES or just let ethers do it (but limit the scrypt param for speed).

interface Web3Store {
  wallet: ethers.Wallet | null;
  address: string | null;
  balanceEth: string;
  isUnlocked: boolean;
  rpcUrl: string;

  initWallet: () => Promise<void>;
  generateNewWallet: (password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  fetchBalance: () => Promise<void>;
  hasStoredWallet: () => boolean;
}

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

// Simple XOR encryption for fast prototype demonstration.
// IN PRODUCTION: Use ethers.Wallet.encryptKeystore() or robust AES.
const xorEncrypt = (text: string, key: string) => {
  return Array.from(text).map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

export const useWeb3Store = create<Web3Store>((set, get) => ({
  wallet: null,
  address: null,
  balanceEth: '0.0000',
  isUnlocked: false,
  rpcUrl: RPC_URL,

  hasStoredWallet: () => !!localStorage.getItem('admin_wallet_encrypted'),

  initWallet: async () => {
    // Just check if we are locked, fetch balance if we have wallet.
    const saved = localStorage.getItem('admin_wallet_encrypted');
    if (!saved) {
      set({ isUnlocked: false, wallet: null, address: null });
    }
  },

  generateNewWallet: async (password: string) => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const randomWallet = ethers.Wallet.createRandom().connect(provider);
    
    // Encrypt the private key
    const encryptedText = btoa(xorEncrypt(randomWallet.privateKey, password));
    localStorage.setItem('admin_wallet_encrypted', encryptedText);

    set({ wallet: randomWallet, address: randomWallet.address, isUnlocked: true });
    get().fetchBalance();
  },

  unlockWallet: async (password: string): Promise<boolean> => {
    try {
      const encryptedObj = localStorage.getItem('admin_wallet_encrypted');
      if (!encryptedObj) return false;

      const decryptedHex = xorEncrypt(atob(encryptedObj), password);
      
      // Minimal validation checking if it's a valid hex key
      if (!decryptedHex.startsWith('0x') || decryptedHex.length !== 66) {
        throw new Error('Invalid padding or password');
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(decryptedHex, provider);
      
      set({ wallet, address: wallet.address, isUnlocked: true });
      get().fetchBalance();
      return true;
    } catch (e) {
      console.error("Unlock failed", e);
      return false;
    }
  },

  lockWallet: () => {
    set({ wallet: null, address: null, balanceEth: '0.0000', isUnlocked: false });
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
  }
}));
