import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';
import { useWeb3Store } from './web3.store';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  kycStatus: string;
  rating: number;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName?: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const web3Address = useWeb3Store.getState().address;
          const res = await api.post('/auth/login', { email, password, web3Address });
          const { accessToken, user } = res.data;
          localStorage.setItem('rampx_token', accessToken);
          set({ token: accessToken, user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const web3Address = useWeb3Store.getState().address;
          const res = await api.post('/auth/register', { ...data, web3Address });
          const { accessToken, user } = res.data;
          localStorage.setItem('rampx_token', accessToken);
          set({ token: accessToken, user });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('rampx_token');
        localStorage.removeItem('embedded_wallet_key');
        useWeb3Store.getState().generateNewWallet();
        set({ user: null, token: null });
      },
    }),
    { name: 'rampx_user', partialize: (s) => ({ user: s.user, token: s.token }) },
  ),
);
