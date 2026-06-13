import { getAbilityCards } from './abilities.js';

export const UPGRADES = [
  { id: 'cooldown', name: 'Faster Swing', description: 'Baseball bat swing recharges 18% faster.' },
  { id: 'damage', name: 'Heavier Bat', description: 'Bat swing damage increases by 12.' },
  { id: 'health', name: 'Healthy Snack', description: 'Gain max health and heal a little.' },
  { id: 'speed', name: 'Quick Feet', description: 'Move 12% faster.' },
];

export function getUpgradeChoices(state) {
  return [...UPGRADES, ...getAbilityCards(state)].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function applyUpgrade(stats, id) {
  if (id === 'cooldown') stats.pulseCooldown *= 0.82;
  if (id === 'damage') stats.pulseDamage += 12;
  if (id === 'knockback') stats.batKnockback = (stats.batKnockback ?? 0) + 1.4;
  if (id === 'health') { stats.maxHealth += 20; stats.health = Math.min(stats.maxHealth, stats.health + 35); }
  if (id === 'speed') stats.speedMultiplier *= 1.12;
}
