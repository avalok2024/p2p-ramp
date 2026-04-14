import { useCurrencyStore } from '../store/currency.store';

export function useFormatCurrency() {
  const { displayCurrency, rates } = useCurrencyStore();

  const formatEth = (ethAmount: number) => {
    const rate = rates[displayCurrency];
    const value = ethAmount * rate;
    
    // Formatting logic based on the currency rules
    let formattedStr = '';
    if (displayCurrency === 'INR') {
      formattedStr = `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (displayCurrency === 'USDT') {
      formattedStr = `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
    } else if (displayCurrency === 'BTC') {
      formattedStr = `${value.toFixed(6)} BTC`;
    } else {
      formattedStr = `${value.toFixed(4)} ETH`;
    }

    return {
      formatted: formattedStr,
      value,
      symbol: displayCurrency,
      rate
    };
  };

  return { formatEth, symbol: displayCurrency, displayCurrency };
}
