import { CONFIG } from './config.js';

export const PERMANENT_UPGRADES = [
  { id: 'dmg', emoji: '💪', name: 'Heavy Hitter', description: '+5% damage per level.', max: 10, baseCost: 30, effect: (level) => `+${level * 5}% damage`, nextEffect: () => '+5% damage' },
  { id: 'hp', emoji: '❤️', name: 'Survivor’s Grit', description: '+10 max HP per level.', max: 10, baseCost: 25, effect: (level) => `+${level * 10} max HP`, nextEffect: () => '+10 max HP' },
  { id: 'speed', emoji: '👟', name: 'Quick Feet', description: '+3% move speed per level.', max: 8, baseCost: 35, effect: (level) => `+${level * 3}% move speed`, nextEffect: () => '+3% move speed' },
  { id: 'regen', emoji: '🌿', name: 'Patch-Up', description: '+0.15 HP/sec regen per level.', max: 8, baseCost: 40, effect: (level) => `+${(level * 0.15).toFixed(2)} HP/sec`, nextEffect: () => '+0.15 HP/sec' },
  { id: 'stamina', emoji: '🥾', name: 'Springy Boots', description: 'Jump higher each level.', max: 8, baseCost: 30, effect: (level) => `+${level * 5}% jump strength`, nextEffect: () => '+5% jump strength' },
  { id: 'gold', emoji: '💰', name: 'Looter’s Luck', description: '+10% coins found per level.', max: 8, baseCost: 45, effect: (level) => `+${level * 10}% coins found`, nextEffect: () => '+10% coins found' },
  { id: 'magnet', emoji: '🧲', name: 'Scrap Magnetism', description: '+8% pickup radius per level.', max: 8, baseCost: 30, effect: (level) => `+${level * 8}% pickup radius`, nextEffect: () => '+8% pickup radius' },
  { id: 'xp', emoji: '📘', name: 'Street Smarts', description: '+6% XP gained per level.', max: 8, baseCost: 50, effect: (level) => `+${level * 6}% XP gained`, nextEffect: () => '+6% XP gained' },
];

export const DEFAULT_PERMANENT_LEVELS = Object.fromEntries(PERMANENT_UPGRADES.map((upgrade) => [upgrade.id, 0]));

export function getPermanentUpgrade(id) {
  return PERMANENT_UPGRADES.find((upgrade) => upgrade.id === id);
}

export function getPermanentUpgradeCost(upgrade, currentLevel) {
  return Math.round(upgrade.baseCost * Math.pow(1.75, currentLevel));
}

export function clampPermanentLevels(levels = {}) {
  return Object.fromEntries(PERMANENT_UPGRADES.map((upgrade) => {
    const raw = Number.parseInt(levels?.[upgrade.id] ?? 0, 10);
    return [upgrade.id, Math.max(0, Math.min(upgrade.max, Number.isFinite(raw) ? raw : 0))];
  }));
}

export function migratePermanentLevels(levels = {}) {
  const migrated = { ...levels };
  const mappings = { maxHealth: 'hp', moveSpeed: 'speed', pickupMagnet: 'magnet', coinBonus: 'gold', batDamage: 'dmg' };
  for (const [oldId, newId] of Object.entries(mappings)) {
    if (migrated[newId] == null && migrated[oldId] != null) migrated[newId] = migrated[oldId];
  }
  return clampPermanentLevels(migrated);
}

export function calculatePermanentStats(levels = {}) {
  const safe = clampPermanentLevels(levels);
  return {
    maxHealth: CONFIG.player.maxHealth + safe.hp * 10,
    speedMultiplier: 1 + safe.speed * 0.03,
    damageMultiplier: 1 + safe.dmg * 0.05,
    pulseDamage: CONFIG.pulse.damage * (1 + safe.dmg * 0.05),
    pulseCooldown: CONFIG.pulse.cooldown,
    healthRegen: safe.regen * 0.15,
    jumpMultiplier: 1 + safe.stamina * 0.05,
    pickupMagnetMultiplier: 1 + safe.magnet * 0.08,
    coinMultiplier: 1 + safe.gold * 0.10,
    xpMultiplier: 1 + safe.xp * 0.06,
  };
}
