export const CONFIG = {
  arenaSize: 90,
  runDuration: 600,
  player: { speed: 8.8, sprintMultiplier: 1.55, maxHealth: 100, radius: 0.8 },
  pulse: { cooldown: 2.5, range: 5.2, damage: 35, visualDuration: 0.55 },
  zombie: {
    spawnEvery: 1.25, maxAlive: 48, hitCooldown: 0.8,
    pacing: {
      minSpawnMultiplier: 0.28,
      maxAliveBonus: 42,
      lateTypeWeightPerMinute: 0.16,
    },
    scaling: {
      healthPerMinute: 0.10,
      damagePerMinute: 0.04,
    },
    types: {
      walker: { name: 'Walker Zombie', health: 60, speed: 2.25, damage: 11, radius: 0.75, xp: 25, coins: 2, scale: 1, weight: 100, unlockTime: 0, unlockLevel: 1, medkitChance: 0.04, skin: 0x78c850, shirt: 0x526b8f },
      runner: { name: 'Little Runner Zombie', health: 38, speed: 3.25, damage: 9, radius: 0.55, xp: 32, coins: 2, scale: 0.72, weight: 34, unlockTime: 90, unlockLevel: 3, medkitChance: 0.05, skin: 0x84d65a, shirt: 0x7b42d6 },
      brute: { name: 'Brute Zombie', health: 150, speed: 1.65, damage: 18, radius: 1.05, xp: 70, coins: 4, scale: 1.35, weight: 18, unlockTime: 180, unlockLevel: 5, medkitChance: 0.10, skin: 0x5f9f45, shirt: 0x5a3a22 },
      spitter: { name: 'Spitter Zombie', health: 80, speed: 2.05, damage: 12, radius: 0.8, xp: 55, coins: 3, scale: 1.02, weight: 16, unlockTime: 300, unlockLevel: 6, medkitChance: 0.07, skin: 0x9be55a, shirt: 0x2ccf6b },
      boss: { name: 'Mini Boss Zombie', health: 520, speed: 1.25, damage: 25, radius: 1.75, xp: 220, coins: 18, scale: 2.15, weight: 1, unlockTime: 420, unlockLevel: 8, medkitChance: 1, skin: 0x4d8d39, shirt: 0x25222c },
    },
  },
  xp: { pickupRadius: 1.5, magnetRadius: 5.5, speed: 10 },
  medkit: { healAmount: 25, pickupRadius: 1.7, worldFirstSpawn: 45, worldSpawnMin: 45, worldSpawnMax: 75, maxWorldActive: 3, spawnMinDistance: 10, spawnMaxDistance: 28 },
  level: { baseXp: 60, growth: 1.35 },
  camera: { offset: { x: 0, y: 22, z: 19 }, lookAhead: 2.5 },
};
