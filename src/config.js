export const CONFIG = {
  arenaSize: 90,
  runDuration: 600,
  player: { speed: 9.68, sprintMultiplier: 1.55, maxHealth: 100, radius: 0.8, jumpVelocity: 8.4, gravity: 28, landingDip: 0.1 },
  pulse: { cooldown: 2.5, range: 5.2, damage: 35, visualDuration: 0.55 },
  zombie: {
    spawnEvery: 1.25, maxAlive: 48, hitCooldown: 0.8,
    pacing: {
      minSpawnMultiplier: 0.28,
      maxAliveBonus: 42,
      lateTypeWeightPerMinute: 0.2,
      heavyTypeWeightPerMinuteAfterFive: 0.28,
    },
    scaling: {
      healthPerMinute: 0.10,
      damagePerMinute: 0.04,
    },
    types: {
      walker: { name: 'Walker Zombie', health: 60, speed: 2.48, damage: 11, radius: 0.75, xp: 25, coins: 2, scale: 1, weight: 100, unlockTime: 0, unlockLevel: 1, medkitChance: 0.03, skin: 0x78c850, shirt: 0x526b8f },
      runner: { name: 'Little Runner Zombie', health: 38, speed: 3.91, damage: 9, radius: 0.55, xp: 35, coins: 2, scale: 0.72, weight: 36, unlockTime: 90, unlockLevel: 3, medkitChance: 0.04, skin: 0x84d65a, shirt: 0x7b42d6 },
      brute: { name: 'Brute Zombie', health: 150, speed: 1.82, damage: 18, radius: 1.05, xp: 75, coins: 4, scale: 1.35, weight: 18, unlockTime: 180, unlockLevel: 5, medkitChance: 0.09, skin: 0x5f9f45, shirt: 0x5a3a22 },
      spitter: { name: 'Spitter Zombie', health: 80, speed: 2.26, damage: 12, radius: 0.8, xp: 60, coins: 3, scale: 1.02, weight: 16, unlockTime: 300, unlockLevel: 6, medkitChance: 0.06, skin: 0x9be55a, shirt: 0x2ccf6b },
      crusher: { name: 'Crusher Zombie', health: 300, speed: 1.49, damage: 24, radius: 1.35, xp: 120, coins: 8, scale: 1.7, weight: 7, unlockTime: 360, unlockLevel: 9, medkitChance: 0.14, skin: 0x6f7f64, shirt: 0x6b4632 },
      boss: { name: 'Mini Boss Zombie', health: 520, speed: 1.38, damage: 28, radius: 1.75, xp: 260, coins: 18, scale: 2.15, weight: 2, unlockTime: 450, unlockLevel: 11, medkitChance: 0.75, skin: 0x4d8d39, shirt: 0x25222c },
    },
  },
  xp: { pickupRadius: 1.5, magnetRadius: 5.5, speed: 10 },
  medkit: { healAmount: 25, pickupRadius: 1.7, worldFirstSpawn: 45, worldSpawnMin: 55, worldSpawnMax: 85, maxWorldActive: 3, maxActive: 6, spawnMinDistance: 10, spawnMaxDistance: 28 },
  level: { baseXp: 60, growth: 1.35, lateGrowth: 1.22, lateGrowthStartLevel: 10 },
  rewards: { xpMultiplierStartTime: 300, xpMultiplierPerMinute: 0.12, maxXpMultiplier: 1.55 },
  camera: { offset: { x: 0, y: 22, z: 19 }, lookAhead: 2.5, minDistance: 9.5, maxDistance: 24 },
};
