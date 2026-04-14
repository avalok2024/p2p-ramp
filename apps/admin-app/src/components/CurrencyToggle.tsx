import { motion } from 'framer-motion';
import { useCurrencyStore, CurrencyOption } from '../store/currency.store';

export function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();

  const currencies: { id: CurrencyOption; flag: string }[] = [
    { id: 'USDT', flag: '💵' },
    { id: 'ETH', flag: '💎' },
    { id: 'BTC', flag: '₿' },
    { id: 'INR', flag: '₹' },
  ];

  return (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
      {currencies.map(c => (
        <button
          key={c.id}
          onClick={() => setDisplayCurrency(c.id)}
          style={{
            background: displayCurrency === c.id ? 'var(--accent)' : 'transparent',
            color: displayCurrency === c.id ? '#0f0f1a' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {c.id}
        </button>
      ))}
    </div>
  );
}
