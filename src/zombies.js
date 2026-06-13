import * as THREE from 'three';
import { CONFIG } from './config.js';

const zombies = [];
const ZOMBIE_TYPES = CONFIG.zombie.types;
// Zombie art faces local -Z; chase rotation math points local +Z toward the player.
const ZOMBIE_VISUAL_FACING_OFFSET = Math.PI;
const hitFlashColor = new THREE.Color(0xfff1a8);

function material(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); }

function addLimb(group, color, x, y, z, sx = .25, sy = .8, sz = .25) {
  const limb = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(color));
  limb.position.set(x, y, z); limb.rotation.x = 1.1; group.add(limb); return limb;
}

function addSpike(group, x, y, z) {
  const spike = new THREE.Mesh(new THREE.ConeGeometry(.13, .42, 4), material(0xd8d2a8));
  spike.position.set(x, y, z); spike.rotation.x = Math.PI; group.add(spike);
}

function getScaling(elapsed = 0) {
  const elapsedMinutes = elapsed / 60;
  return {
    health: 1 + elapsedMinutes * CONFIG.zombie.scaling.healthPerMinute,
    damage: 1 + elapsedMinutes * CONFIG.zombie.scaling.damagePerMinute,
  };
}

export function getSpawnDelay(elapsed = 0) {
  const pressure = Math.max(CONFIG.zombie.pacing.minSpawnMultiplier, 1 - elapsed / 520);
  return CONFIG.zombie.spawnEvery * pressure;
}

function getMaxAlive(elapsed = 0) {
  const progress = Math.min(1, elapsed / CONFIG.runDuration);
  return Math.floor(CONFIG.zombie.maxAlive + CONFIG.zombie.pacing.maxAliveBonus * progress);
}

function zombieMesh(typeKey = 'walker', progress = {}) {
  const type = ZOMBIE_TYPES[typeKey] ?? ZOMBIE_TYPES.walker;
  const scaling = getScaling(progress.elapsed);
  const g = new THREE.Group();
  const skin = type.skin;
  const shirt = type.shirt;

  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .55), material(shirt)); body.position.y = 1;
  const headSize = typeKey === 'spitter' ? .82 : .72;
  const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), material(skin)); head.position.y = typeKey === 'runner' ? 1.82 : 1.9;
  g.add(body, head);

  addLimb(g, skin, .65, 1.15, -.2, typeKey === 'brute' || typeKey === 'boss' ? .34 : .25, .8, .25);
  addLimb(g, skin, -.65, 1.15, -.2, typeKey === 'brute' || typeKey === 'boss' ? .34 : .25, .8, .25);

  if (typeKey === 'runner') {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(.18, .34, 5), material(0x5a258f));
    tuft.position.y = 2.35; g.add(tuft);
  }
  if (typeKey === 'brute' || typeKey === 'boss') {
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.08, .72, .68), material(shirt));
    belly.position.y = .78; g.add(belly);
  }
  if (typeKey === 'spitter') {
    const throat = new THREE.Mesh(new THREE.SphereGeometry(.34, 8, 6), material(0xb7ff4a));
    throat.position.set(0, 1.42, -.28); g.add(throat);
  }
  if (typeKey === 'boss') {
    addSpike(g, -.28, 2.55, 0); addSpike(g, 0, 2.65, 0); addSpike(g, .28, 2.55, 0);
    addLimb(g, skin, .92, 1.03, -.18, .42, 1.05, .34);
    addLimb(g, skin, -.92, 1.03, -.18, .42, 1.05, .34);
  }

  g.scale.setScalar(type.scale);
  g.traverse((part) => {
    if (part.isMesh) part.userData.baseColor = part.material.color.clone();
  });
  g.userData = { typeKey, health: type.health * scaling.health, damageMultiplier: scaling.damage, hitTimer: 0, hitFlash: 0, bossSpawned: false };
  return g;
}

function unlockedTypes({ elapsed = 0, level = 1, bossSpawned = false } = {}) {
  return Object.entries(ZOMBIE_TYPES).filter(([key, type]) => {
    if (key === 'boss' && bossSpawned) return false;
    return elapsed >= type.unlockTime || level >= type.unlockLevel;
  });
}

function chooseZombieType(progress) {
  const choices = unlockedTypes(progress);
  const elapsedMinutes = (progress.elapsed ?? 0) / 60;
  const total = choices.reduce((sum, [key, type]) => sum + getTypeWeight(key, type, elapsedMinutes), 0);
  let roll = Math.random() * total;
  for (const [key, type] of choices) {
    roll -= getTypeWeight(key, type, elapsedMinutes);
    if (roll <= 0) return key;
  }
  return 'walker';
}

function getTypeWeight(key, type, elapsedMinutes) {
  if (key === 'walker') return type.weight;
  const latePressure = 1 + elapsedMinutes * CONFIG.zombie.pacing.lateTypeWeightPerMinute;
  return type.weight * latePressure;
}

export function resetZombies(scene) { zombies.splice(0).forEach((z) => scene.remove(z)); }
export function getZombies() { return zombies; }

export function spawnZombie(scene, progress = {}) {
  if (zombies.length >= getMaxAlive(progress.elapsed)) return null;
  const typeKey = chooseZombieType(progress);
  const z = zombieMesh(typeKey, progress);
  const edge = Math.floor(Math.random() * 4), half = CONFIG.arenaSize / 2 + 2, roll = (Math.random() - .5) * CONFIG.arenaSize;
  z.position.set(edge < 2 ? (edge === 0 ? -half : half) : roll, 0, edge >= 2 ? (edge === 2 ? -half : half) : roll);
  zombies.push(z); scene.add(z); return z;
}

export function updateZombies(player, delta, onDamage) {
  for (const z of zombies) {
    const type = ZOMBIE_TYPES[z.userData.typeKey] ?? ZOMBIE_TYPES.walker;
    const dx = player.position.x - z.position.x, dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    z.position.x += (dx / dist) * type.speed * delta;
    z.position.z += (dz / dist) * type.speed * delta;
    z.rotation.y = Math.atan2(dx, dz) + ZOMBIE_VISUAL_FACING_OFFSET;
    z.userData.hitTimer = Math.max(0, z.userData.hitTimer - delta);
    z.userData.hitFlash = Math.max(0, z.userData.hitFlash - delta);
    const flash = z.userData.hitFlash / .12;
    z.traverse((part) => {
      if (part.isMesh && part.userData.baseColor) part.material.color.copy(part.userData.baseColor).lerp(hitFlashColor, flash);
    });
    if (dist < CONFIG.player.radius + type.radius && z.userData.hitTimer <= 0) {
      z.userData.hitTimer = CONFIG.zombie.hitCooldown;
      onDamage(type.damage * (z.userData.damageMultiplier ?? 1));
    }
  }
}

export function damageZombies(scene, origin, range, damage, onKilled, onHit = () => {}) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const dist = Math.hypot(origin.x - z.position.x, origin.z - z.position.z);
    if (dist <= range) {
      z.userData.health -= damage;
      z.userData.hitFlash = .12;
      onHit(z.position.clone());
      if (z.userData.health <= 0) {
        const type = ZOMBIE_TYPES[z.userData.typeKey] ?? ZOMBIE_TYPES.walker;
        zombies.splice(i, 1);
        scene.remove(z);
        onKilled(z.position.clone(), type, z.userData.typeKey);
      }
    }
  }
}
