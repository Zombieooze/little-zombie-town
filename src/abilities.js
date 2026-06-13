import * as THREE from 'three';
import { getZombies, damageZombies } from './zombies.js';

export const MAX_SPECIAL_ABILITIES = 4;

export const ABILITY_DEFINITIONS = {
  sawblade: {
    id: 'sawblade',
    name: 'Spinning Sawblade',
    unlockName: 'Unlock Spinning Sawblade',
    unlockDescription: 'Auto-launch a spinning scrap sawblade at nearby zombies.',
    defaults: { damage: 28, cooldown: 3.2, bladeCount: 1, speed: 11, lifetime: 2.1, hitRadius: .72 },
  },
  orbitals: {
    id: 'orbitals',
    name: 'Scrap Orbitals',
    unlockName: 'Unlock Scrap Orbitals',
    unlockDescription: 'Add orbiting scrap chunks that damage zombies on contact.',
    defaults: { damage: 14, orbitalCount: 2, speed: 2.25, radius: 2.25, hitRadius: .58, hitCooldown: .42 },
  },
};

function makeAbilityState() {
  return {
    chosen: [],
    sawblade: { ...ABILITY_DEFINITIONS.sawblade.defaults, timer: .8, projectiles: [] },
    orbitals: { ...ABILITY_DEFINITIONS.orbitals.defaults, angle: 0, hitTimer: 0, meshes: [] },
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

export function canUnlockMoreAbilities(state) {
  return (state.abilities?.chosen?.length ?? 0) < MAX_SPECIAL_ABILITIES;
}

export function unlockAbility(scene, state, id, player) {
  if (!ABILITY_DEFINITIONS[id] || isAbilityUnlocked(state, id) || !canUnlockMoreAbilities(state)) return;
  state.abilities.chosen.push(id);
  if (id === 'orbitals') syncOrbitals(scene, state, player);
}

export function applyAbilityUpgrade(scene, state, id, player) {
  const abilities = state.abilities;
  if (id === 'sawblade_damage') abilities.sawblade.damage += 12;
  if (id === 'sawblade_cooldown') abilities.sawblade.cooldown = Math.max(1.15, abilities.sawblade.cooldown * .82);
  if (id === 'sawblade_extra') abilities.sawblade.bladeCount = Math.min(3, abilities.sawblade.bladeCount + 1);
  if (id === 'orbital_damage') abilities.orbitals.damage += 8;
  if (id === 'orbital_extra') abilities.orbitals.orbitalCount = Math.min(5, abilities.orbitals.orbitalCount + 1);
  if (id === 'orbital_speed') abilities.orbitals.speed += .45;
  syncOrbitals(scene, state, player);
}

export function getAbilityCards(state) {
  const cards = [];
  for (const ability of Object.values(ABILITY_DEFINITIONS)) {
    if (!isAbilityUnlocked(state, ability.id)) {
      if (canUnlockMoreAbilities(state)) cards.push({ id: `unlock_${ability.id}`, name: ability.unlockName, description: ability.unlockDescription });
      continue;
    }
    if (ability.id === 'sawblade') {
      cards.push({ id: 'sawblade_damage', name: 'Sawblade Damage', description: 'Sawblades hit harder.' });
      cards.push({ id: 'sawblade_cooldown', name: 'Sawblade Cooldown', description: 'Launch sawblades more often.' });
      if (state.abilities.sawblade.bladeCount < 3) cards.push({ id: 'sawblade_extra', name: 'Extra Sawblade', description: 'Launch one more sawblade per volley.' });
    }
    if (ability.id === 'orbitals') {
      cards.push({ id: 'orbital_damage', name: 'Scrap Orbital Damage', description: 'Orbiting scrap hits harder.' });
      if (state.abilities.orbitals.orbitalCount < 5) cards.push({ id: 'orbital_extra', name: 'Extra Scrap Orbital', description: 'Add another chunk of orbiting scrap.' });
      cards.push({ id: 'orbital_speed', name: 'Orbital Speed', description: 'Scrap circles you faster.' });
    }
  }
  return cards;
}

export function isAbilityCard(id) {
  return id.startsWith('unlock_') || id.startsWith('sawblade_') || id.startsWith('orbital_');
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
  orbital.hitTimer -= delta;
  orbital.meshes.forEach((mesh, index) => {
    const angle = orbital.angle + (index / orbital.meshes.length) * Math.PI * 2;
    mesh.position.set(player.position.x + Math.cos(angle) * orbital.radius, 1.05, player.position.z + Math.sin(angle) * orbital.radius);
    mesh.rotation.x += delta * 4; mesh.rotation.y += delta * 6;
    if (orbital.hitTimer <= 0) damageZombies(scene, mesh.position, orbital.hitRadius, orbital.damage, onKilled, onHit);
  });
  if (orbital.hitTimer <= 0) orbital.hitTimer = orbital.hitCooldown;
}
