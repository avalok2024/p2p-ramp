import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

export const useAdminStore = create<any>()(
  persist(
    (set) => ({
      user: null, token: null, isLoading: false,
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const r = await api.post('/auth/login', { email, password });
          if (r.data.user.role !== 'ADMIN') throw new Error('Not an admin account');
          localStorage.setItem('rampx_admin_token', r.data.accessToken);
          set({ token: r.data.accessToken, user: r.data.user });
        } finally { set({ isLoading: false }); }
      },
      logout: () => { localStorage.removeItem('rampx_admin_token'); set({ user: null, token: null }); },
    }),
    { name: 'rampx_admin', partialize: (s: any) => ({ user: s.user, token: s.token }) }
  )
);
