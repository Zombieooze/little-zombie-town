export const CONFIG = {
  arenaSize: 90,
  runDuration: 300,
  player: { speed: 8.8, sprintMultiplier: 1.55, maxHealth: 100, radius: 0.8, hopVelocity: 7.2, gravity: 22, hopCooldown: 0.85 },
  pulse: { cooldown: 2.5, range: 5.2, damage: 35, knockback: 3.8, visualDuration: 0.55 },
  zombie: { spawnEvery: 1.25, maxAlive: 42, speed: 2.25, health: 60, damage: 11, hitCooldown: 0.8, radius: 0.75, xp: 25, coins: 2 },
  xp: { pickupRadius: 1.5, magnetRadius: 5.5, speed: 10 },
  healthPickup: { zombieDropChance: 0.065, healPercent: 0.22, pickupRadius: 1.35, worldSpawnMin: 45, worldSpawnMax: 75, maxWorldActive: 3 },
  level: { baseXp: 60, growth: 1.35 },
  camera: { offset: { x: 0, y: 22, z: 19 }, lookAhead: 2.5, minZoom: 0.65, maxZoom: 1.55 },
};
