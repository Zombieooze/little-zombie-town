import * as THREE from 'three';
import { CONFIG } from './config.js';

const zombies = [];
const ZOMBIE_TYPES = CONFIG.zombie.types;
// Zombie art faces local -Z; chase rotation math points local +Z toward the player.
const ZOMBIE_VISUAL_FACING_OFFSET = Math.PI;
const hitFlashColor = new THREE.Color(0xfff1a8);

function material(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); }


function addBox(group, color, x, y, z, sx, sy, sz) {
  const box = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material(color));
  box.position.set(x, y, z); group.add(box); return box;
}

function createWalkerZombieModel(group, skin, shirt) {
  const darkSkin = 0x5f8f35;
  const shirtShadow = 0x24465f;
  const pants = 0x111d25;
  const boots = 0x171715;

  const body = addBox(group, shirt, 0, .98, 0, .92, 1.04, .56);
  body.rotation.x = .03;
  addBox(group, shirtShadow, 0, .48, -.01, .96, .14, .58);
  [-.34, -.12, .12, .34].forEach((x, index) => {
    const tear = new THREE.Mesh(new THREE.ConeGeometry(.14, .28, 3), material(shirt));
    tear.position.set(x, .32, -.02);
    tear.rotation.set(0, 0, Math.PI + (index % 2 ? .18 : -.18));
    group.add(tear);
  });
  addBox(group, shirt, -.56, 1.42, -.03, .28, .28, .5).rotation.z = -.34;
  addBox(group, shirt, .56, 1.42, -.03, .28, .28, .5).rotation.z = .34;

  const head = addBox(group, skin, 0, 1.88, -.03, .84, .78, .78);
  head.rotation.y = .03;
  addBox(group, darkSkin, -.47, 1.88, -.03, .12, .36, .36);
  addBox(group, darkSkin, .47, 1.88, -.03, .12, .36, .36);
  addBox(group, darkSkin, 0, 2.29, -.05, .82, .1, .76);

  const leftSpike = new THREE.Mesh(new THREE.ConeGeometry(.13, .38, 4), material(darkSkin));
  leftSpike.position.set(-.24, 2.56, -.08); group.add(leftSpike);
  const rightSpike = new THREE.Mesh(new THREE.ConeGeometry(.13, .38, 4), material(darkSkin));
  rightSpike.position.set(.24, 2.55, -.06); group.add(rightSpike);

  addBox(group, 0xf3f3e8, -.18, 1.94, -.44, .2, .24, .04);
  addBox(group, 0xf3f3e8, .2, 1.94, -.44, .2, .24, .04);
  addBox(group, 0x191919, -.18, 1.94, -.47, .08, .1, .035);
  addBox(group, 0x191919, .2, 1.94, -.47, .08, .1, .035);
  addBox(group, 0x486c2d, -.18, 2.11, -.46, .24, .04, .04).rotation.z = -.18;
  addBox(group, 0x486c2d, .2, 2.1, -.46, .24, .04, .04).rotation.z = .18;
  addBox(group, 0x6f8d35, .02, 1.78, -.47, .16, .12, .12);

  addBox(group, 0x050505, 0, 1.58, -.46, .48, .26, .05);
  addBox(group, 0xf3f3df, -.16, 1.68, -.5, .08, .11, .04);
  addBox(group, 0xf3f3df, .17, 1.68, -.5, .08, .11, .04);
  addBox(group, 0xf3f3df, -.14, 1.47, -.5, .08, .1, .04);
  addBox(group, 0xf3f3df, .2, 1.47, -.5, .08, .1, .04);
  addBox(group, 0x8b1f1f, .04, 1.44, -.5, .2, .06, .035);
  addBox(group, darkSkin, 0, 1.38, -.43, .5, .1, .12);

  const rightArm = addWalkerArm(group, skin, darkSkin, .68, 1.08, -.2, 1);
  const leftArm = addWalkerArm(group, skin, darkSkin, -.68, 1.08, -.2, -1);

  const leftLeg = addWalkerLeg(group, pants, boots, -.22, .78);
  const rightLeg = addWalkerLeg(group, pants, boots, .22, .78);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg };
}

function addWalkerLeg(group, pantsColor, bootColor, x, hipY) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, 0);

  const pants = new THREE.Mesh(new THREE.BoxGeometry(.28, .78, .34), material(pantsColor));
  pants.position.set(0, -.38, 0);

  const boot = new THREE.Mesh(new THREE.BoxGeometry(.34, .18, .42), material(bootColor));
  boot.position.set(0, -.76, -.08);

  leg.add(pants, boot);
  group.add(leg);
  return leg;
}

function addWalkerArm(group, skinColor, handColor, x, y, z, side) {
  const arm = new THREE.Group();
  arm.position.set(x, y, z);
  arm.rotation.x = 1.1;

  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.28, .82, .26), material(skinColor));
  const hand = new THREE.Mesh(new THREE.BoxGeometry(.25, .22, .25), material(handColor));
  hand.position.set(side * .05, -.53, -.01);
  hand.rotation.z = side * .18;

  arm.add(forearm, hand);
  group.add(arm);
  return arm;
}

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

  if (typeKey === 'walker') {
    createWalkerZombieModel(g, skin, shirt);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .55), material(shirt)); body.position.y = 1;
    const headSize = typeKey === 'spitter' ? .82 : .72;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), material(skin)); head.position.y = typeKey === 'runner' ? 1.82 : 1.9;
    g.add(body, head);

    const heavyArms = typeKey === 'brute' || typeKey === 'crusher' || typeKey === 'boss';
    addLimb(g, skin, .65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
    addLimb(g, skin, -.65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
  }

  if (typeKey === 'runner') {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(.18, .34, 5), material(0x5a258f));
    tuft.position.y = 2.35; g.add(tuft);
  }
  if (typeKey === 'brute' || typeKey === 'crusher' || typeKey === 'boss') {
    const bellyWidth = typeKey === 'crusher' ? 1.24 : 1.08;
    const belly = new THREE.Mesh(new THREE.BoxGeometry(bellyWidth, .72, .68), material(shirt));
    belly.position.y = .78; g.add(belly);
  }
  if (typeKey === 'crusher') {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.42, .34, .7), material(0x4b4038));
    shoulder.position.y = 1.42; g.add(shoulder);
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
  g.userData = {
    ...g.userData,
    typeKey,
    health: type.health * scaling.health,
    damageMultiplier: scaling.damage,
    hitTimer: 0,
    hitFlash: 0,
    bossSpawned: false,
    walkTime: 0,
    baseY: g.position.y,
  };
  captureWalkerAnimationRestPose(g);
  return g;
}

function unlockedTypes({ elapsed = 0, level = 1, bossSpawnCount = 0 } = {}) {
  return Object.entries(ZOMBIE_TYPES).filter(([key, type]) => {
    if (key === 'boss' && bossSpawnCount >= 2) return false;
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
  const heavyPressure = key === 'brute' || key === 'crusher' || key === 'boss'
    ? 1 + Math.max(0, elapsedMinutes - 5) * CONFIG.zombie.pacing.heavyTypeWeightPerMinuteAfterFive
    : 1;
  return type.weight * latePressure * heavyPressure;
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

function captureWalkerAnimationRestPose(zombie) {
  if (zombie.userData.typeKey !== 'walker' || !zombie.userData.parts) return;
  const { leftArm, rightArm, leftLeg, rightLeg } = zombie.userData.parts;
  zombie.userData.walkRestPose = {
    rootY: zombie.position.y,
    rootRotZ: zombie.rotation.z,
    leftArmX: leftArm.rotation.x,
    rightArmX: rightArm.rotation.x,
    leftLegX: leftLeg.rotation.x,
    rightLegX: rightLeg.rotation.x,
  };
}

function updateWalkerWalkAnimation(zombie, delta, isMoving) {
  if (zombie.userData.typeKey !== 'walker' || !zombie.userData.parts || !zombie.userData.walkRestPose) return;

  const { leftArm, rightArm, leftLeg, rightLeg } = zombie.userData.parts;
  const rest = zombie.userData.walkRestPose;
  const activityTarget = isMoving ? 1 : 0;
  zombie.userData.walkActivity = THREE.MathUtils.damp(zombie.userData.walkActivity ?? 0, activityTarget, 8, delta);
  zombie.userData.walkTime = (zombie.userData.walkTime ?? 0) + delta * 3.8 * zombie.userData.walkActivity;

  const activity = zombie.userData.walkActivity;
  const stride = Math.sin(zombie.userData.walkTime);
  const counterStride = Math.sin(zombie.userData.walkTime + Math.PI);
  const lift = Math.abs(Math.sin(zombie.userData.walkTime * 2));

  leftArm.rotation.x = rest.leftArmX + stride * .18 * activity;
  rightArm.rotation.x = rest.rightArmX + counterStride * .18 * activity;
  leftLeg.rotation.x = rest.leftLegX + counterStride * .13 * activity;
  rightLeg.rotation.x = rest.rightLegX + stride * .13 * activity;
  zombie.position.y = rest.rootY + lift * .035 * activity;
  zombie.rotation.z = rest.rootRotZ + Math.sin(zombie.userData.walkTime * 2) * .035 * activity;
}

export function updateZombies(player, delta, onDamage) {
  for (const z of zombies) {
    const type = ZOMBIE_TYPES[z.userData.typeKey] ?? ZOMBIE_TYPES.walker;
    const dx = player.position.x - z.position.x, dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    z.position.x += (dx / dist) * type.speed * delta;
    z.position.z += (dz / dist) * type.speed * delta;
    z.rotation.y = Math.atan2(dx, dz) + ZOMBIE_VISUAL_FACING_OFFSET;
    updateWalkerWalkAnimation(z, delta, dist > CONFIG.player.radius + type.radius * .5);
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

export function damageZombie(scene, zombie, origin, damage, onKilled, onHit = () => {}, knockback = 0) {
  if (!zombies.includes(zombie)) return;
  zombie.userData.health -= damage;
  zombie.userData.hitFlash = .12;
  onHit(zombie.position.clone());
  if (knockback > 0) {
    const dx = zombie.position.x - origin.x;
    const dz = zombie.position.z - origin.z;
    const dist = Math.hypot(dx, dz) || 1;
    zombie.position.x += (dx / dist) * knockback;
    zombie.position.z += (dz / dist) * knockback;
  }
  if (zombie.userData.health <= 0) {
    const type = ZOMBIE_TYPES[zombie.userData.typeKey] ?? ZOMBIE_TYPES.walker;
    zombies.splice(zombies.indexOf(zombie), 1);
    scene.remove(zombie);
    onKilled(zombie.position.clone(), type, zombie.userData.typeKey);
  }
}

export function damageZombies(scene, origin, range, damage, onKilled, onHit = () => {}, knockback = 0) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const dist = Math.hypot(origin.x - z.position.x, origin.z - z.position.z);
    if (dist <= range) damageZombie(scene, z, origin, damage, onKilled, onHit, knockback);
  }
}
