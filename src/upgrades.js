export const UPGRADES = [
  { id: 'cooldown', name: 'Faster Swing', description: 'Baseball bat swing recharges 18% faster.' },
  { id: 'knockback', name: 'Knockback Up', description: 'Bat hits push zombies 25% farther.' },
  { id: 'damage', name: 'Heavier Bat', description: 'Bat swing damage increases by 12.' },
  { id: 'health', name: 'Healthy Snack', description: 'Gain max health and heal a little.' },
  { id: 'speed', name: 'Quick Feet', description: 'Move 12% faster.' },
];

export function getUpgradeChoices() {
  return [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function applyUpgrade(stats, id) {
  if (id === 'cooldown') stats.pulseCooldown *= 0.82;
  if (id === 'knockback') stats.knockback *= 1.25;
  if (id === 'damage') stats.pulseDamage += 12;
  if (id === 'health') { stats.maxHealth += 20; stats.health = Math.min(stats.maxHealth, stats.health + 35); }
  if (id === 'speed') stats.speedMultiplier *= 1.12;
}
