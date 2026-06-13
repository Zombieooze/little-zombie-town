export const CONFIG = {
  arenaSize: 62,
  runDuration: 180,
  player: { speed: 8.8, sprintMultiplier: 1.55, maxHealth: 100, radius: 0.8 },
  pulse: { cooldown: 2.5, range: 5.2, damage: 35, visualDuration: 0.55 },
  zombie: { spawnEvery: 1.25, maxAlive: 34, speed: 2.25, health: 60, damage: 11, hitCooldown: 0.8, radius: 0.75, xp: 25, coins: 2 },
  xp: { pickupRadius: 1.5, magnetRadius: 5.5, speed: 10 },
  level: { baseXp: 60, growth: 1.35 },
  camera: { offset: { x: 0, y: 22, z: 19 }, lookAhead: 2.5 },
};
