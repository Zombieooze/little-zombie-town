import { CONFIG } from './config.js';

const COSTS = [25, 60, 120, 225, 400];

export const PERMANENT_UPGRADES = [
  { id: 'maxHealth', name: 'Max Health', description: 'Begin each run tougher.', unit: 'HP', costs: COSTS, valuePerLevel: 10, benefit: (level) => `+${level * 10} starting max health`, nextBenefit: () => '+10 max health' },
  { id: 'moveSpeed', name: 'Move Speed', description: 'Move through town a little faster.', unit: '%', costs: COSTS, valuePerLevel: 0.04, benefit: (level) => `+${Math.round(level * 4)}% movement speed`, nextBenefit: () => '+4% move speed' },
  { id: 'batDamage', name: 'Bat Damage', description: 'Hit zombies harder with each swing.', unit: '%', costs: COSTS, valuePerLevel: 0.08, benefit: (level) => `+${Math.round(level * 8)}% bat damage`, nextBenefit: () => '+8% bat damage' },
  { id: 'batCooldown', name: 'Bat Cooldown', description: 'Recharge bat swings faster.', unit: '%', costs: COSTS, valuePerLevel: 0.05, benefit: (level) => `${Math.round(level * 5)}% faster bat recharge`, nextBenefit: () => '5% faster recharge' },
  { id: 'pickupMagnet', name: 'Pickup Magnet', description: 'Pull XP gems from farther away.', unit: '%', costs: COSTS, valuePerLevel: 0.12, benefit: (level) => `+${Math.round(level * 12)}% pickup magnet`, nextBenefit: () => '+12% magnet radius' },
  { id: 'coinBonus', name: 'Coin Bonus', description: 'Earn more coins from defeated zombies.', unit: '%', costs: COSTS, valuePerLevel: 0.10, benefit: (level) => `+${Math.round(level * 10)}% coins earned`, nextBenefit: () => '+10% coins earned' },
];

export const DEFAULT_PERMANENT_LEVELS = Object.fromEntries(PERMANENT_UPGRADES.map((upgrade) => [upgrade.id, 0]));

export function getPermanentUpgrade(id) {
  return PERMANENT_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function clampPermanentLevels(levels = {}) {
  return Object.fromEntries(PERMANENT_UPGRADES.map((upgrade) => {
    const raw = Number.parseInt(levels?.[upgrade.id] ?? 0, 10);
    return [upgrade.id, Math.max(0, Math.min(upgrade.costs.length, Number.isFinite(raw) ? raw : 0))];
  }));
}

export function calculatePermanentStats(levels = {}) {
  const safe = clampPermanentLevels(levels);
  return {
    maxHealth: CONFIG.player.maxHealth + safe.maxHealth * 10,
    speedMultiplier: 1 + safe.moveSpeed * 0.04,
    batDamage: CONFIG.pulse.damage * (1 + safe.batDamage * 0.08),
    batCooldown: CONFIG.pulse.cooldown * Math.max(0.1, 1 - safe.batCooldown * 0.05),
    pickupMagnetMultiplier: 1 + safe.pickupMagnet * 0.12,
    coinMultiplier: 1 + safe.coinBonus * 0.10,
  };
}
