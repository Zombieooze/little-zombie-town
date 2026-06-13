import * as THREE from 'three';
import { getZombies, damageZombie, damageZombies } from './zombies.js';
import { CONFIG } from './config.js';

export const MAX_SPECIAL_ABILITIES = 4;
export const MAX_ABILITY_LEVEL = 10;

export const ABILITY_DEFINITIONS = {
  sawblade: {
    id: 'sawblade',
    name: 'Spinning Sawblade',
    shortName: 'Sawblade',
    unlockName: 'Unlock Spinning Sawblade',
    unlockDescription: 'Auto-launch a spinning scrap sawblade at nearby zombies.',
    maxLevel: MAX_ABILITY_LEVEL,
    defaults: { damage: 28, cooldown: 3.2, bladeCount: 1, speed: 11, lifetime: 2.1, hitRadius: .72 },
    upgrades: {
      2: 'Sawblade damage increases.',
      3: 'Launch sawblades more often.',
      4: 'Sawblades hit in a slightly wider path.',
      5: 'Launch one more sawblade per volley.',
      6: 'Sawblade damage increases.',
      7: 'Launch sawblades more often.',
      8: 'Sawblades fly faster and last slightly longer.',
      9: 'Sawblade damage increases.',
      10: 'Sawblades get a final damage boost.',
    },
  },
  orbitals: {
    id: 'orbitals',
    name: 'Scrap Orbitals',
    shortName: 'Scrap',
    unlockName: 'Unlock Scrap Orbitals',
    unlockDescription: 'Add orbiting scrap chunks that damage zombies on contact.',
    maxLevel: MAX_ABILITY_LEVEL,
    defaults: { damage: 14, orbitalCount: 2, speed: 2.25, radius: 2.25, hitRadius: .7, hitCooldown: .3 },
    upgrades: {
      2: 'Scrap orbitals hit harder.',
      3: 'Add one more orbiting scrap chunk.',
      4: 'Scrap circles you faster.',
      5: 'Scrap orbitals hit harder.',
      6: 'Scrap orbitals get a slightly wider hit area.',
      7: 'Add one more orbiting scrap chunk.',
      8: 'Scrap orbitals hit harder.',
      9: 'Scrap circles you faster.',
      10: 'Scrap orbitals get a final damage boost.',
    },
  },
};

function makeAbilityState() {
  return {
    chosen: [],
    levels: {},
    sawblade: { ...ABILITY_DEFINITIONS.sawblade.defaults, timer: .8, projectiles: [] },
    orbitals: { ...ABILITY_DEFINITIONS.orbitals.defaults, angle: 0, meshes: [], recentHits: new Map() },
  };
}

export function resetAbilities(scene, state) {
  if (state.abilities) {
    state.abilities.sawblade?.projectiles?.forEach((blade) => scene.remove(blade.mesh));
    state.abilities.orbitals?.meshes?.forEach((mesh) => scene.remove(mesh));
  }
  state.abilities = makeAbilityState();
}

export function isAbilityUnlocked(state, id) {
  return state.abilities?.chosen?.includes(id) ?? false;
}

export function getAbilityLevel(state, id) {
  return state.abilities?.levels?.[id] ?? 0;
}

export function canUnlockMoreAbilities(state) {
  return (state.abilities?.chosen?.length ?? 0) < MAX_SPECIAL_ABILITIES;
}

export function unlockAbility(scene, state, id, player) {
  if (!ABILITY_DEFINITIONS[id] || isAbilityUnlocked(state, id) || !canUnlockMoreAbilities(state)) return;
  state.abilities.chosen.push(id);
  state.abilities.levels[id] = 1;
  if (id === 'orbitals') syncOrbitals(scene, state, player);
}

export function applyAbilityUpgrade(scene, state, id, player) {
  const abilityId = id.replace('upgrade_', '');
  if (!ABILITY_DEFINITIONS[abilityId] || !isAbilityUnlocked(state, abilityId)) return;
  const currentLevel = getAbilityLevel(state, abilityId);
  if (currentLevel >= ABILITY_DEFINITIONS[abilityId].maxLevel) return;
  const nextLevel = currentLevel + 1;
  state.abilities.levels[abilityId] = nextLevel;
  applyAbilityLevelTuning(state, abilityId, nextLevel);
  syncOrbitals(scene, state, player);
}

function applyAbilityLevelTuning(state, abilityId, level) {
  const abilities = state.abilities;
  if (abilityId === 'sawblade') {
    if (level === 2) abilities.sawblade.damage += 8;
    if (level === 3) abilities.sawblade.cooldown = Math.max(1.15, abilities.sawblade.cooldown * .88);
    if (level === 4) abilities.sawblade.hitRadius += .08;
    if (level === 5) abilities.sawblade.bladeCount = Math.min(2, abilities.sawblade.bladeCount + 1);
    if (level === 6) abilities.sawblade.damage += 8;
    if (level === 7) abilities.sawblade.cooldown = Math.max(1.15, abilities.sawblade.cooldown * .88);
    if (level === 8) { abilities.sawblade.speed += 1.2; abilities.sawblade.lifetime += .2; }
    if (level === 9) abilities.sawblade.damage += 10;
    if (level === 10) abilities.sawblade.damage += 14;
  }
  if (abilityId === 'orbitals') {
    if (level === 2) abilities.orbitals.damage += 4;
    if (level === 3) abilities.orbitals.orbitalCount = Math.min(3, abilities.orbitals.orbitalCount + 1);
    if (level === 4) abilities.orbitals.speed += .3;
    if (level === 5) abilities.orbitals.damage += 4;
    if (level === 6) abilities.orbitals.hitRadius += .08;
    if (level === 7) abilities.orbitals.orbitalCount = Math.min(4, abilities.orbitals.orbitalCount + 1);
    if (level === 8) abilities.orbitals.damage += 5;
    if (level === 9) abilities.orbitals.speed += .35;
    if (level === 10) abilities.orbitals.damage += 7;
  }
}

export function getAbilityCards(state) {
  const cards = [];
  for (const ability of Object.values(ABILITY_DEFINITIONS)) {
    const level = getAbilityLevel(state, ability.id);
    if (!isAbilityUnlocked(state, ability.id)) {
      if (canUnlockMoreAbilities(state)) cards.push({ id: `unlock_${ability.id}`, name: ability.unlockName, description: ability.unlockDescription });
      continue;
    }
    if (level < ability.maxLevel) {
      const nextLevel = level + 1;
      cards.push({ id: `upgrade_${ability.id}`, name: `${ability.name} Lv. ${nextLevel}/${ability.maxLevel}`, description: ability.upgrades[nextLevel] });
    }
  }
  return cards;
}

export function isAbilityCard(id) {
  return id.startsWith('unlock_') || id.startsWith('upgrade_');
}

export function updateAbilities(scene, state, player, delta, onKilled, onHit) {
  if (!state.abilities) resetAbilities(scene, state);
  if (isAbilityUnlocked(state, 'sawblade')) updateSawblades(scene, state, player, delta, onKilled, onHit);
  if (isAbilityUnlocked(state, 'orbitals')) updateOrbitals(scene, state, player, delta, onKilled, onHit);
}

function createSawbladeMesh() {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .12, 18), new THREE.MeshStandardMaterial({ color: 0xcfd7df, metalness: .25, roughness: .55 }));
  disc.rotation.x = Math.PI / 2;
  group.add(disc);
  for (let i = 0; i < 10; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(.16, .08, .16), new THREE.MeshStandardMaterial({ color: 0xfff1a8, roughness: .6 }));
    const angle = (i / 10) * Math.PI * 2;
    tooth.position.set(Math.cos(angle) * .47, Math.sin(angle) * .47, 0);
    tooth.rotation.z = angle;
    group.add(tooth);
  }
  return group;
}

function launchSawblades(scene, state, player) {
  const saw = state.abilities.sawblade;
  const target = getZombies().reduce((best, zombie) => {
    const dist = player.position.distanceTo(zombie.position);
    return !best || dist < best.dist ? { zombie, dist } : best;
  }, null);
  const baseAngle = target ? Math.atan2(target.zombie.position.x - player.position.x, target.zombie.position.z - player.position.z) : player.rotation.y;
  for (let i = 0; i < saw.bladeCount; i++) {
    const spread = (i - (saw.bladeCount - 1) / 2) * .25;
    const angle = baseAngle + spread;
    const mesh = createSawbladeMesh();
    mesh.position.set(player.position.x, 1.05, player.position.z);
    scene.add(mesh);
    saw.projectiles.push({ mesh, velocity: new THREE.Vector3(Math.sin(angle) * saw.speed, 0, Math.cos(angle) * saw.speed), life: saw.lifetime, hitTimer: 0 });
  }
}

function updateSawblades(scene, state, player, delta, onKilled, onHit) {
  const saw = state.abilities.sawblade;
  saw.timer -= delta;
  if (saw.timer <= 0) { launchSawblades(scene, state, player); saw.timer = saw.cooldown; }
  saw.projectiles = saw.projectiles.filter((blade) => {
    blade.life -= delta; blade.hitTimer -= delta;
    blade.mesh.position.addScaledVector(blade.velocity, delta);
    blade.mesh.rotation.z += delta * 18;
    blade.mesh.rotation.y += delta * 7;
    if (blade.hitTimer <= 0) {
      damageZombies(scene, blade.mesh.position, saw.hitRadius, saw.damage, onKilled, onHit);
      blade.hitTimer = .18;
    }
    if (blade.life <= 0) { scene.remove(blade.mesh); return false; }
    return true;
  });
}

function createScrapMesh(index) {
  const geometry = index % 2 ? new THREE.ConeGeometry(.22, .48, 5) : new THREE.BoxGeometry(.42, .24, .32);
  const material = new THREE.MeshStandardMaterial({ color: index % 2 ? 0x7dd3fc : 0xf97316, roughness: .62, metalness: .1 });
  return new THREE.Mesh(geometry, material);
}

function syncOrbitals(scene, state, player) {
  if (!state.abilities) return;
  const orbital = state.abilities.orbitals;
  while (orbital.meshes.length < orbital.orbitalCount) {
    const mesh = createScrapMesh(orbital.meshes.length);
    mesh.position.copy(player?.position ?? new THREE.Vector3());
    scene.add(mesh); orbital.meshes.push(mesh);
  }
  while (orbital.meshes.length > orbital.orbitalCount) scene.remove(orbital.meshes.pop());
}

function updateOrbitals(scene, state, player, delta, onKilled, onHit) {
  const orbital = state.abilities.orbitals;
  syncOrbitals(scene, state, player);
  orbital.angle += delta * orbital.speed;
  for (const [zombie, cooldown] of orbital.recentHits) {
    const nextCooldown = cooldown - delta;
    if (nextCooldown <= 0 || !getZombies().includes(zombie)) orbital.recentHits.delete(zombie);
    else orbital.recentHits.set(zombie, nextCooldown);
  }
  orbital.meshes.forEach((mesh, index) => {
    const angle = orbital.angle + (index / orbital.meshes.length) * Math.PI * 2;
    mesh.position.set(player.position.x + Math.cos(angle) * orbital.radius, 1.05, player.position.z + Math.sin(angle) * orbital.radius);
    mesh.rotation.x += delta * 4; mesh.rotation.y += delta * 6;
    damageZombiesTouchedByOrbital(scene, mesh.position, orbital, onKilled, onHit);
  });
}

function damageZombiesTouchedByOrbital(scene, position, orbital, onKilled, onHit) {
  for (const zombie of [...getZombies()]) {
    if (orbital.recentHits.has(zombie)) continue;
    const type = CONFIG.zombie.types[zombie.userData.typeKey] ?? CONFIG.zombie.types.walker;
    const hitRange = orbital.hitRadius + type.radius;
    const dist = Math.hypot(position.x - zombie.position.x, position.z - zombie.position.z);
    if (dist > hitRange) continue;
    orbital.recentHits.set(zombie, orbital.hitCooldown);
    damageZombie(scene, zombie, position, orbital.damage, onKilled, onHit);
  }
}
