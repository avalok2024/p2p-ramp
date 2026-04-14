import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CurrencyOption = 'ETH' | 'USDT' | 'BTC' | 'INR';

interface CurrencyState {
  displayCurrency: CurrencyOption;
  setDisplayCurrency: (c: CurrencyOption) => void;
  rates: Record<CurrencyOption, number>;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      displayCurrency: 'USDT',
      setDisplayCurrency: (c) => set({ displayCurrency: c }),
      rates: {
        ETH: 1,
        USDT: 3000,
        BTC: 0.045,
        INR: 250000,
      },
    }),
    {
      name: 'currency-storage',
    }
  )
);
