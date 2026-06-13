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
    implemented: true,
    defaults: { damage: 28, cooldown: 3.2, bladeCount: 1, speed: 12.1, lifetime: 2.1, hitRadius: .72 },
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
    implemented: true,
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

  electricZapper: {
    id: 'electricZapper',
    name: 'Electric Zapper',
    shortName: 'Zapper',
    unlockName: 'Unlock Electric Zapper',
    unlockDescription: 'Automatically zap a nearby zombie with chain lightning.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: true,
    defaults: { damage: 22, cooldown: 2.6, range: 8, chainTargets: 1, chainDistance: 4.8, visualLifetime: .14 },
    upgrades: {
      2: 'Electric damage increases.',
      3: 'Zapper recharges faster.',
      4: 'Zapper range increases.',
      5: 'Electricity can chain to another zombie.',
      6: 'Electric damage increases.',
      7: 'Zapper recharges faster.',
      8: 'Electricity can chain to another zombie.',
      9: 'Electric chain range increases.',
      10: 'Electricity can chain to another zombie with stronger damage.',
    },
  },
  fireBottle: {
    id: 'fireBottle',
    name: 'Fire Bottle',
    shortName: 'Fire',
    unlockName: 'Unlock Fire Bottle',
    unlockDescription: 'Throw bottles that burst into fire patches under nearby zombies.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: true,
    defaults: { damage: 9, cooldown: 5.2, range: 9, duration: 3, radius: 2, tickInterval: .42, bottleCount: 1, travelTime: .56, maxPatches: 7 },
    upgrades: {
      2: 'Fire damage increases.',
      3: 'Fire patches last longer.',
      4: 'Throw bottles more often.',
      5: 'Fire patch radius increases.',
      6: 'Fire damage increases.',
      7: 'Throw an extra bottle.',
      8: 'Throw bottles more often.',
      9: 'Fire damage increases.',
      10: 'Fire damage and fire patch radius increase.',
    },
  },
  nailBlaster: {
    id: 'nailBlaster',
    name: 'Nail Blaster',
    shortName: 'Nails',
    unlockName: 'Unlock Nail Blaster',
    unlockDescription: 'Planned: fast nail or bolt projectiles at nearby zombies.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: false,
    plannedRole: 'Fast ranged damage with later extra projectiles and piercing.',
    upgrades: {},
  },
  shockwaveStomp: {
    id: 'shockwaveStomp',
    name: 'Shockwave Stomp',
    shortName: 'Stomp',
    unlockName: 'Unlock Shockwave Stomp',
    unlockDescription: 'Planned: timed shockwave around the player.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: false,
    plannedRole: 'Panic crowd-control that damages and pushes zombies back.',
    upgrades: {},
  },
  bearTrap: {
    id: 'bearTrap',
    name: 'Bear Trap Toss',
    shortName: 'Traps',
    unlockName: 'Unlock Bear Trap Toss',
    unlockDescription: 'Planned: drop traps that punish zombies stepping on them.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: false,
    plannedRole: 'Area control with later slow effects.',
    upgrades: {},
  },
  turret: {
    id: 'turret',
    name: 'Junkyard Turret',
    shortName: 'Turret',
    unlockName: 'Unlock Junkyard Turret',
    unlockDescription: 'Planned: deploy a small scrap turret that shoots nearby zombies.',
    maxLevel: MAX_ABILITY_LEVEL,
    implemented: false,
    plannedRole: 'Hold an area with automatic ranged fire.',
    upgrades: {},
  },
};

export function getImplementedAbilityDefinitions() {
  return Object.values(ABILITY_DEFINITIONS).filter((ability) => ability.implemented);
}

export function getAbilityDisplayName(id) {
  return ABILITY_DEFINITIONS[id]?.shortName ?? ABILITY_DEFINITIONS[id]?.name ?? id;
}

function makeAbilityState() {
  return {
    chosen: [],
    levels: {},
    sawblade: { ...ABILITY_DEFINITIONS.sawblade.defaults, timer: .8, projectiles: [] },
    orbitals: { ...ABILITY_DEFINITIONS.orbitals.defaults, angle: 0, meshes: [], recentHits: new Map() },
    electricZapper: { ...ABILITY_DEFINITIONS.electricZapper.defaults, timer: 1.2, effects: [] },
    fireBottle: { ...ABILITY_DEFINITIONS.fireBottle.defaults, timer: 1.8, bottles: [], patches: [] },
  };
}

export function resetAbilities(scene, state) {
  if (state.abilities) {
    state.abilities.sawblade?.projectiles?.forEach((blade) => scene.remove(blade.mesh));
    state.abilities.orbitals?.meshes?.forEach((mesh) => scene.remove(mesh));
    state.abilities.electricZapper?.effects?.forEach((effect) => removeZapperEffect(scene, effect));
    state.abilities.fireBottle?.bottles?.forEach((bottle) => removeFireBottle(scene, bottle));
    state.abilities.fireBottle?.patches?.forEach((patch) => removeFirePatch(scene, patch));
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
  if (!ABILITY_DEFINITIONS[id]?.implemented || isAbilityUnlocked(state, id) || !canUnlockMoreAbilities(state)) return;
  state.abilities.chosen.push(id);
  state.abilities.levels[id] = 1;
  if (id === 'orbitals') syncOrbitals(scene, state, player);
}

export function applyAbilityUpgrade(scene, state, id, player) {
  const abilityId = id.replace('upgrade_', '');
  if (!ABILITY_DEFINITIONS[abilityId]?.implemented || !isAbilityUnlocked(state, abilityId)) return;
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
    if (level === 8) { abilities.sawblade.speed += 1.32; abilities.sawblade.lifetime += .2; }
    if (level === 9) abilities.sawblade.damage += 10;
    if (level === 10) abilities.sawblade.damage += 14;
  }
  if (abilityId === 'electricZapper') {
    if (level === 2) abilities.electricZapper.damage += 8;
    if (level === 3) abilities.electricZapper.cooldown = Math.max(1.45, abilities.electricZapper.cooldown * .84);
    if (level === 4) abilities.electricZapper.range += 1.2;
    if (level === 5) abilities.electricZapper.chainTargets = Math.min(2, abilities.electricZapper.chainTargets + 1);
    if (level === 6) abilities.electricZapper.damage += 9;
    if (level === 7) abilities.electricZapper.cooldown = Math.max(1.45, abilities.electricZapper.cooldown * .84);
    if (level === 8) abilities.electricZapper.chainTargets = Math.min(3, abilities.electricZapper.chainTargets + 1);
    if (level === 9) abilities.electricZapper.chainDistance += 1.1;
    if (level === 10) { abilities.electricZapper.damage += 12; abilities.electricZapper.chainTargets = Math.min(4, abilities.electricZapper.chainTargets + 1); }
  }
  if (abilityId === 'fireBottle') {
    if (level === 2) abilities.fireBottle.damage += 4;
    if (level === 3) abilities.fireBottle.duration += .75;
    if (level === 4) abilities.fireBottle.cooldown = Math.max(3.1, abilities.fireBottle.cooldown * .84);
    if (level === 5) abilities.fireBottle.radius += .28;
    if (level === 6) abilities.fireBottle.damage += 5;
    if (level === 7) abilities.fireBottle.bottleCount = Math.min(2, abilities.fireBottle.bottleCount + 1);
    if (level === 8) abilities.fireBottle.cooldown = Math.max(3.1, abilities.fireBottle.cooldown * .84);
    if (level === 9) abilities.fireBottle.damage += 6;
    if (level === 10) { abilities.fireBottle.damage += 8; abilities.fireBottle.radius += .25; }
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
  for (const ability of getImplementedAbilityDefinitions()) {
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
  if (isAbilityUnlocked(state, 'electricZapper')) updateElectricZapper(scene, state, player, delta, onKilled, onHit);
  if (isAbilityUnlocked(state, 'fireBottle')) updateFireBottle(scene, state, player, delta, onKilled, onHit);
}

function removeZapperEffect(scene, effect) {
  effect.parts?.forEach((part) => {
    scene.remove(part);
    part.geometry?.dispose?.();
    part.material?.dispose?.();
  });
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

function createElectricLine(start, end) {
  const points = [];
  const segments = 5;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = start.clone().lerp(end, t);
    if (i > 0 && i < segments) {
      point.x += (Math.random() - .5) * .28;
      point.y += (Math.random() - .5) * .22;
      point.z += (Math.random() - .5) * .28;
    }
    points.push(point);
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: Math.random() < .5 ? 0x38bdf8 : 0xfff1a8, transparent: true, opacity: 1 }));
}

function createZapperSpark(position, index) {
  const spark = new THREE.Mesh(
    new THREE.BoxGeometry(.12, .12, .12),
    new THREE.MeshBasicMaterial({ color: index % 2 ? 0xfff1a8 : 0x38bdf8, transparent: true, opacity: 1 }),
  );
  spark.position.set(position.x + (Math.random() - .5) * .45, 1.05 + Math.random() * .65, position.z + (Math.random() - .5) * .45);
  spark.userData.velocity = new THREE.Vector3((Math.random() - .5) * 1.8, 1.2 + Math.random() * 1.4, (Math.random() - .5) * 1.8);
  return spark;
}

function addZapperEffect(scene, state, links, hitPositions) {
  const zapper = state.abilities.electricZapper;
  const parts = [];
  links.forEach(([start, end]) => {
    const line = createElectricLine(start, end);
    scene.add(line); parts.push(line);
  });
  hitPositions.forEach((position) => {
    for (let i = 0; i < 3; i++) {
      const spark = createZapperSpark(position, i);
      scene.add(spark); parts.push(spark);
    }
  });
  zapper.effects.push({ life: zapper.visualLifetime, maxLife: zapper.visualLifetime, parts });
}

function getNearestZombieInRange(origin, range, ignored = new Set()) {
  return getZombies().reduce((best, zombie) => {
    if (ignored.has(zombie)) return best;
    const dist = Math.hypot(origin.x - zombie.position.x, origin.z - zombie.position.z);
    if (dist > range) return best;
    return !best || dist < best.dist ? { zombie, dist } : best;
  }, null)?.zombie ?? null;
}

function fireElectricZapper(scene, state, player, onKilled, onHit) {
  const zapper = state.abilities.electricZapper;
  const hitZombies = [];
  const links = [];
  const hitPositions = [];
  const first = getNearestZombieInRange(player.position, zapper.range);
  if (!first) return;
  let previousPosition = new THREE.Vector3(player.position.x, 1.15, player.position.z);
  let current = first;
  const ignored = new Set();
  while (current && hitZombies.length < zapper.chainTargets) {
    ignored.add(current);
    const hitPosition = current.position.clone();
    const visualPosition = new THREE.Vector3(hitPosition.x, 1.15, hitPosition.z);
    links.push([previousPosition.clone(), visualPosition.clone()]);
    hitPositions.push(hitPosition.clone());
    hitZombies.push(current);
    previousPosition = visualPosition;
    current = getNearestZombieInRange(hitPosition, zapper.chainDistance, ignored);
  }
  addZapperEffect(scene, state, links, hitPositions);
  hitZombies.forEach((zombie, index) => {
    if (getZombies().includes(zombie)) damageZombie(scene, zombie, index === 0 ? player.position : hitPositions[index - 1], zapper.damage, onKilled, onHit);
  });
}

function updateElectricZapperEffects(scene, zapper, delta) {
  zapper.effects = zapper.effects.filter((effect) => {
    effect.life -= delta;
    const t = Math.max(0, effect.life / effect.maxLife);
    effect.parts.forEach((part) => {
      if (part.material) part.material.opacity = t;
      if (part.userData.velocity) {
        part.position.addScaledVector(part.userData.velocity, delta);
        part.userData.velocity.y -= 5 * delta;
      }
    });
    if (effect.life <= 0) { removeZapperEffect(scene, effect); return false; }
    return true;
  });
}

function updateElectricZapper(scene, state, player, delta, onKilled, onHit) {
  const zapper = state.abilities.electricZapper;
  zapper.timer -= delta;
  updateElectricZapperEffects(scene, zapper, delta);
  if (zapper.timer <= 0) {
    fireElectricZapper(scene, state, player, onKilled, onHit);
    zapper.timer = zapper.cooldown;
  }
}


function createFireBottleMesh() {
  const group = new THREE.Group();
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, .45, 7), new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: .55, metalness: .05 }));
  bottle.rotation.z = Math.PI / 2;
  const rag = new THREE.Mesh(new THREE.BoxGeometry(.16, .06, .06), new THREE.MeshBasicMaterial({ color: 0xffc44d }));
  rag.position.x = .28;
  group.add(bottle, rag);
  return group;
}

function removeFireBottle(scene, bottle) {
  scene.remove(bottle.mesh);
  bottle.mesh.traverse((part) => {
    part.geometry?.dispose?.();
    part.material?.dispose?.();
  });
}

function createFirePatchMesh(radius) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .035, 20), new THREE.MeshBasicMaterial({ color: 0xff7a18, transparent: true, opacity: .46 }));
  base.position.y = .025;
  group.add(base);
  for (let i = 0; i < 7; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.16 + Math.random() * .1, .55 + Math.random() * .35, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd84a : 0xff5a1f, transparent: true, opacity: .9 }));
    const angle = (i / 7) * Math.PI * 2;
    const distance = radius * (.18 + Math.random() * .5);
    flame.position.set(Math.cos(angle) * distance, .22, Math.sin(angle) * distance);
    flame.rotation.y = Math.random() * Math.PI;
    group.add(flame);
  }
  return group;
}

function removeFirePatch(scene, patch) {
  scene.remove(patch.mesh);
  patch.mesh.traverse((part) => {
    part.geometry?.dispose?.();
    part.material?.dispose?.();
  });
}

function addFirePatch(scene, fire, position) {
  while (fire.patches.length >= fire.maxPatches) removeFirePatch(scene, fire.patches.shift());
  const mesh = createFirePatchMesh(fire.radius);
  mesh.position.set(position.x, 0, position.z);
  scene.add(mesh);
  fire.patches.push({ mesh, life: fire.duration, maxLife: fire.duration, tickTimer: 0 });
}

function throwFireBottles(scene, state, player) {
  const fire = state.abilities.fireBottle;
  const target = getNearestZombieInRange(player.position, fire.range);
  const baseAngle = target ? Math.atan2(target.position.x - player.position.x, target.position.z - player.position.z) : player.rotation.y;
  const distance = target ? Math.min(fire.range, Math.hypot(target.position.x - player.position.x, target.position.z - player.position.z)) : fire.range * .7;
  for (let i = 0; i < fire.bottleCount; i++) {
    const spread = (i - (fire.bottleCount - 1) / 2) * .42;
    const angle = baseAngle + spread;
    const start = new THREE.Vector3(player.position.x, 1.15, player.position.z);
    const end = new THREE.Vector3(player.position.x + Math.sin(angle) * distance, 0, player.position.z + Math.cos(angle) * distance);
    const mesh = createFireBottleMesh();
    mesh.position.copy(start);
    scene.add(mesh);
    fire.bottles.push({ mesh, start, end, age: 0, travelTime: fire.travelTime });
  }
}

function updateFireBottle(scene, state, player, delta, onKilled, onHit) {
  const fire = state.abilities.fireBottle;
  fire.timer -= delta;
  if (fire.timer <= 0) {
    throwFireBottles(scene, state, player);
    fire.timer = fire.cooldown;
  }
  fire.bottles = fire.bottles.filter((bottle) => {
    bottle.age += delta;
    const t = Math.min(1, bottle.age / bottle.travelTime);
    bottle.mesh.position.lerpVectors(bottle.start, bottle.end, t);
    bottle.mesh.position.y = .12 + Math.sin(t * Math.PI) * 1.8;
    bottle.mesh.rotation.x += delta * 9;
    bottle.mesh.rotation.z += delta * 7;
    if (t >= 1) {
      addFirePatch(scene, fire, bottle.end);
      removeFireBottle(scene, bottle);
      return false;
    }
    return true;
  });
  fire.patches = fire.patches.filter((patch) => {
    patch.life -= delta;
    patch.tickTimer -= delta;
    const fade = Math.max(0, patch.life / patch.maxLife);
    patch.mesh.scale.setScalar(.85 + .15 * Math.sin(state.elapsed * 9));
    patch.mesh.traverse((part) => { if (part.material) part.material.opacity = Math.min(part.material.opacity, fade); });
    if (patch.tickTimer <= 0) {
      damageZombies(scene, patch.mesh.position, fire.radius, fire.damage, onKilled, onHit);
      patch.tickTimer = fire.tickInterval;
    }
    if (patch.life <= 0) { removeFirePatch(scene, patch); return false; }
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
