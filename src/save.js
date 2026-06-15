import { clampPermanentLevels, getPermanentUpgrade } from './permanent-upgrades.js';

const COINS_KEY = 'little-zombie-town-total-coins';
const PERMANENT_UPGRADES_KEY = 'little-zombie-town-permanent-upgrades';

export function getTotalCoins() {
  const total = Number.parseInt(localStorage.getItem(COINS_KEY) || '0', 10);
  return Number.isFinite(total) ? Math.max(0, total) : 0;
}

export function addCoins(amount) {
  const total = getTotalCoins() + Math.max(0, Math.floor(amount));
  localStorage.setItem(COINS_KEY, String(total));
  return total;
}


export function spendCoins(amount) {
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  const total = getTotalCoins();
  if (cost <= 0 || total < cost) return false;
  localStorage.setItem(COINS_KEY, String(total - cost));
  return true;
}

export function getPermanentUpgradeLevels() {
  try {
    return clampPermanentLevels(JSON.parse(localStorage.getItem(PERMANENT_UPGRADES_KEY) || '{}'));
  } catch (_) {
    return clampPermanentLevels({});
  }
}

export function savePermanentUpgradeLevels(levels) {
  const safeLevels = clampPermanentLevels(levels);
  localStorage.setItem(PERMANENT_UPGRADES_KEY, JSON.stringify(safeLevels));
  return safeLevels;
}

export function buyPermanentUpgrade(id) {
  const upgrade = getPermanentUpgrade(id);
  if (!upgrade) return { ok: false, reason: 'invalid' };
  const levels = getPermanentUpgradeLevels();
  const currentLevel = levels[id] ?? 0;
  if (currentLevel >= upgrade.costs.length) return { ok: false, reason: 'maxed' };
  const cost = upgrade.costs[currentLevel];
  if (!spendCoins(cost)) return { ok: false, reason: 'coins' };
  levels[id] = currentLevel + 1;
  return { ok: true, levels: savePermanentUpgradeLevels(levels), totalCoins: getTotalCoins() };
}
