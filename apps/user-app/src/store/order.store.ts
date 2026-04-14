import { create } from 'zustand';
import api from '../api/client';

export interface Order {
  id: string;
  orderNumber?: number;
  type: string;
  status: string;
  crypto: string;
  fiatAmount: number;
  cryptoAmount: number;
  uniqueFiatAmount: number;
  pricePerUnit: number;
  paymentMethod: string;
  referenceCode: string;
  paymentDeadline: string;
  /** Set on SELL orders — the user's UPI ID the merchant pays fiat to */
  userUpiId?: string | null;
  /** UPI QR string built server-side for the payment screen */
  upiQr?: string | null;
  paymentProofUrl?: string | null;
  paidMarkedAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  /** P2PEscrow contract address on Sepolia (mirrored from backend ESCROW_CONTRACT_ADDRESS) */
  escrowContractAddress?: string;
  /** Sepolia RPC URL the server uses (shared with frontends for consistency) */
  web3RpcUrl?: string;
  merchant?: { id: string; displayName?: string; web3Address?: string; [k: string]: any };
  user?: { id: string; displayName?: string; web3Address?: string; [k: string]: any };
  merchantAd?: any;
  escrow?: any;
  dispute?: any;
}

export interface CreateOrderPayload {
  type: string;
  crypto: string;
  fiatAmount: number;
  adId: string;
  /** Required on SELL orders so the merchant's QR screen shows the user's UPI ID */
  userUpiId?: string;
}

interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  isLoading: boolean;
  fetchOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<Order>;
  createOrder: (data: CreateOrderPayload) => Promise<Order>;
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
