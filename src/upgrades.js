import { getAbilityCards } from './abilities.js';

export const PASSIVE_UPGRADE_VALUES = {
  firstAidTraining: { maxHealth: 25, heal: 25, maxPicks: 10 },
  runningShoes: { speedMultiplier: 1.08, maxPicks: 10 },
  energyDrink: { damageMultiplier: 1.12, maxPicks: 10 },
  coffeeRush: { cooldownMultiplier: .92, minCooldownMultiplier: .2, maxPicks: 10 },
  scrapMagnet: { pickupMagnetMultiplier: 1.35, maxPicks: 8 },
  paddedJacket: { damageReduction: 2, maxPicks: 10 },
  bandageWrap: { healthRegen: .8, maxPicks: 8 },
  luckyCharm: { critChance: .06, maxCritChance: .95, maxPicks: 10 },
  adrenalineRush: { sprintSpeedMultiplier: 1.12, maxPicks: 8 },
  deepBreaths: { maxStamina: 30, maxPicks: 8 },
  secondWind: { staminaRegenMultiplier: 1.35, maxPicks: 8 },
};

export const UPGRADES = [
  { id: 'firstAidTraining', name: 'First Aid Training', description: '+25 Max HP and heal 25.' },
  { id: 'runningShoes', name: 'Running Shoes', description: '+8% move speed.' },
  { id: 'energyDrink', name: 'Energy Drink', description: '+12% damage.' },
  { id: 'coffeeRush', name: 'Coffee Rush', description: '-8% weapon and ability cooldowns.' },
  { id: 'scrapMagnet', name: 'Scrap Magnet', description: '+35% pickup radius.' },
];

function canOfferPassive(state, upgrade) {
  const maxPicks = PASSIVE_UPGRADE_VALUES[upgrade.id]?.maxPicks;
  if (!maxPicks) return true;
  return (state.passiveUpgradeCounts?.[upgrade.id] ?? 0) < maxPicks;
}

export function getUpgradeChoices(state) {
  const passiveCards = UPGRADES.filter((upgrade) => canOfferPassive(state, upgrade));
  return [...passiveCards, ...getAbilityCards(state)].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function applyUpgrade(stats, id) {
  if (!PASSIVE_UPGRADE_VALUES[id]) return;
  stats.passiveUpgradeCounts ??= {};
  const maxPicks = PASSIVE_UPGRADE_VALUES[id].maxPicks;
  const currentPicks = stats.passiveUpgradeCounts[id] ?? 0;
  if (maxPicks && currentPicks >= maxPicks) return;
  stats.passiveUpgradeCounts[id] = currentPicks + 1;

  if (id === 'firstAidTraining') {
    stats.maxHealth += PASSIVE_UPGRADE_VALUES.firstAidTraining.maxHealth;
    stats.health = Math.min(stats.maxHealth, stats.health + PASSIVE_UPGRADE_VALUES.firstAidTraining.heal);
  }
  if (id === 'runningShoes') stats.speedMultiplier *= PASSIVE_UPGRADE_VALUES.runningShoes.speedMultiplier;
  if (id === 'energyDrink') stats.damageMultiplier *= PASSIVE_UPGRADE_VALUES.energyDrink.damageMultiplier;
  if (id === 'coffeeRush') {
    stats.cooldownMultiplier = Math.max(PASSIVE_UPGRADE_VALUES.coffeeRush.minCooldownMultiplier, (stats.cooldownMultiplier ?? 1) * PASSIVE_UPGRADE_VALUES.coffeeRush.cooldownMultiplier);
    stats.pulseCooldown = Math.max(0.1, stats.pulseCooldown * PASSIVE_UPGRADE_VALUES.coffeeRush.cooldownMultiplier);
  }
  if (id === 'scrapMagnet') stats.pickupMagnetMultiplier *= PASSIVE_UPGRADE_VALUES.scrapMagnet.pickupMagnetMultiplier;
  if (id === 'paddedJacket') stats.damageReduction = (stats.damageReduction ?? 0) + PASSIVE_UPGRADE_VALUES.paddedJacket.damageReduction;
  if (id === 'bandageWrap') stats.healthRegen = (stats.healthRegen ?? 0) + PASSIVE_UPGRADE_VALUES.bandageWrap.healthRegen;
  if (id === 'luckyCharm') stats.critChance = Math.min(PASSIVE_UPGRADE_VALUES.luckyCharm.maxCritChance, (stats.critChance ?? 0) + PASSIVE_UPGRADE_VALUES.luckyCharm.critChance);
  if (id === 'adrenalineRush') stats.sprintSpeedMultiplier = (stats.sprintSpeedMultiplier ?? 1) * PASSIVE_UPGRADE_VALUES.adrenalineRush.sprintSpeedMultiplier;
  if (id === 'deepBreaths') { stats.maxStamina = (stats.maxStamina ?? 0) + PASSIVE_UPGRADE_VALUES.deepBreaths.maxStamina; stats.stamina = (stats.stamina ?? 0) + PASSIVE_UPGRADE_VALUES.deepBreaths.maxStamina; }
  if (id === 'secondWind') stats.staminaRegenMultiplier = (stats.staminaRegenMultiplier ?? 1) * PASSIVE_UPGRADE_VALUES.secondWind.staminaRegenMultiplier;
}
