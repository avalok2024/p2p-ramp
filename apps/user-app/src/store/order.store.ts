import { create } from 'zustand';
import api from '../api/client';

export interface Order {
  id: string;
  orderNumber?: number;
  type: string; status: string; crypto: string;
  fiatAmount: number; cryptoAmount: number; uniqueFiatAmount: number;
  referenceCode: string; paymentDeadline: string;
  upiQr?: string; merchantAd?: any; merchant?: any;
  paidMarkedAt?: string; confirmedAt?: string;
}

interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  isLoading: boolean;
  fetchOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<Order>;
  createOrder: (data: { type: string; crypto: string; fiatAmount: number; adId: string }) => Promise<Order>;
  markPaid: (id: string, paymentProofUrl?: string) => Promise<Order>;
  confirmPayment: (id: string) => Promise<Order>;
  cancelOrder: (id: string) => Promise<Order>;
  raiseDispute: (id: string, reason: string, evidenceUrls?: string[]) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [] as Order[],
  activeOrder: null,
  isLoading: false,

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/orders');
      const list = res.data;
      set({ orders: Array.isArray(list) ? list : [] });
    } finally { set({ isLoading: false }); }
  },

  fetchOrder: async (id) => {
    const res = await api.get(`/orders/${id}`);
    set({ activeOrder: res.data });
    return res.data;
  },

  createOrder: async (data) => {
    const res = await api.post('/orders', data);
    set((s) => ({ orders: [res.data, ...s.orders], activeOrder: res.data }));
    return res.data;
  },

  markPaid: async (id, paymentProofUrl) => {
    const res = await api.post(`/orders/${id}/pay`, { paymentProofUrl });
    set({ activeOrder: res.data });
    return res.data;
  },

  confirmPayment: async (id) => {
    const res = await api.post(`/orders/${id}/confirm`);
    set({ activeOrder: res.data });
    return res.data;
  },

  cancelOrder: async (id) => {
    const res = await api.post(`/orders/${id}/cancel`);
    set({ activeOrder: res.data });
    return res.data;
  },

  raiseDispute: async (id, reason, evidenceUrls) => {
    await api.post(`/orders/${id}/dispute`, {
      reason,
      evidenceUrls: evidenceUrls?.length ? evidenceUrls : undefined,
    });
  },
}));
