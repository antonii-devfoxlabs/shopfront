// How the store writes an amount of money, wherever it shows one.

// Whole cents as the shop writes them: 1,250.00 EUR.
export function formatMoney(cents, shop) {
  const sign = cents < 0 ? '-' : '';
  // A comma between thousands, so the accountant reads 1,250.00 at once.
  const euros = Math.floor(Math.abs(cents) / 100).toLocaleString('en-US');
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${shop.currency}`;
}
