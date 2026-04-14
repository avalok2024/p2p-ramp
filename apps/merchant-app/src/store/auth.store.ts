import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import { useWeb3Store } from './web3.store';

interface MerchantAuthState {
  user: any; token: string | null; isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<MerchantAuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isLoading: false,
      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const web3Address = useWeb3Store.getState().address;
          const r = await api.post('/auth/login', { email, password, web3Address });
          localStorage.setItem('rampx_merchant_token', r.data.accessToken);
          set({ token: r.data.accessToken, user: r.data.user });
        } finally { set({ isLoading: false }); }
      },
      register: async (data) => {
        set({ isLoading: true });
        try {
          const web3Address = useWeb3Store.getState().address;
          const r = await api.post('/auth/register', { ...data, role: 'MERCHANT', web3Address });
          localStorage.setItem('rampx_merchant_token', r.data.accessToken);
          set({ token: r.data.accessToken, user: r.data.user });
        } finally { set({ isLoading: false }); }
      },
      logout: () => { 
        localStorage.removeItem('rampx_merchant_token'); 
        localStorage.removeItem('embedded_wallet_key');
        useWeb3Store.getState().generateNewWallet();
        set({ user: null, token: null }); 
      },
    }),
    { name: 'rampx_merchant', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);
