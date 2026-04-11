import { create } from 'zustand';
import api from '../api/client';

export interface Wallet { id: string; crypto: string; availableBalance: number; lockedBalance: number; }
export interface WalletTxn { id: string; type: string; amount: number; crypto: string; balanceAfter: number; note: string; createdAt: string; }

interface WalletState {
  wallets: Wallet[];
  transactions: WalletTxn[];
  isLoading: boolean;
  fetchWallets: () => Promise<void>;
  fetchTransactions: (crypto?: string) => Promise<void>;
  deposit: (crypto: string, amount: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallets: [],
  transactions: [],
  isLoading: false,

  fetchWallets: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/wallet');
      set({ wallets: res.data });
    } finally { set({ isLoading: false }); }
  },

  fetchTransactions: async (crypto) => {
    const res = await api.get('/wallet/transactions', { params: { crypto } });
    set({ transactions: res.data });
  },

  deposit: async (crypto, amount) => {
    await api.post('/wallet/deposit', { crypto, amount });
  },
}));
