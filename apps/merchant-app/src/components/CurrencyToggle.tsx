import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCurrencyStore, CurrencyOption } from '../store/currency.store';

const CURRENCIES: { val: CurrencyOption; flag: string }[] = [
  { val: 'USDT', flag: '💵' },
  { val: 'ETH',  flag: 'Ξ' },
  { val: 'BTC',  flag: '₿' },
  { val: 'INR',  flag: '₹' }
];

export function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore();
  const [open, setOpen] = useState(false);

  const active = CURRENCIES.find(c => c.val === displayCurrency) || CURRENCIES[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '6px 12px',
          borderRadius: 20,
          color: 'white',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600
        }}
      >
        <span>{active.flag}</span>
        <span>{active.val}</span>
        <span style={{ fontSize: 9 }}>▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              background: '#1a1b23',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              zIndex: 100,
              minWidth: 100
            }}
          >
            {CURRENCIES.map(c => (
              <button
                key={c.val}
                onClick={() => {
                  setDisplayCurrency(c.val);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: displayCurrency === c.val ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: 'none',
                  color: displayCurrency === c.val ? 'var(--accent)' : 'white',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13
                }}
              >
                <span>{c.flag}</span>
                <span>{c.val}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
