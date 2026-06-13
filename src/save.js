const COINS_KEY = 'little-zombie-town-total-coins';

export function getTotalCoins() {
  return Number.parseInt(localStorage.getItem(COINS_KEY) || '0', 10);
}

export function addCoins(amount) {
  const total = getTotalCoins() + Math.max(0, Math.floor(amount));
  localStorage.setItem(COINS_KEY, String(total));
  return total;
}
