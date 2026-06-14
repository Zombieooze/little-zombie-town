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


function createRunnerZombieModel(group, skin, shirt) {
  const darkSkin = 0x5f9430;
  const shadowSkin = 0x4f7f2b;
  const shirtDark = 0x53306f;
  const pants = 0x11283a;
  const pantsPatch = 0x6d8f24;
  const boots = 0x1f1f1b;

  const torso = addBox(group, shirt, 0, .98, .02, .72, .92, .48);
  torso.rotation.x = -.08;
  addBox(group, shirtDark, 0, .52, .02, .76, .16, .5);
  addBox(group, shirtDark, -.43, 1.34, -.02, .22, .28, .42).rotation.z = -.45;
  addBox(group, shirtDark, .43, 1.34, -.02, .22, .28, .42).rotation.z = .45;

  [-.27, -.08, .11, .29].forEach((x, index) => {
    const tear = new THREE.Mesh(new THREE.ConeGeometry(.11, .24, 3), material(shirt));
    tear.position.set(x, .3, -.01);
    tear.rotation.set(0, 0, Math.PI + (index % 2 ? .2 : -.16));
    group.add(tear);
  });

  const head = addBox(group, skin, 0, 1.84, -.05, .78, .72, .72);
  head.rotation.y = -.04;
  addBox(group, darkSkin, 0, 2.2, -.06, .78, .09, .7);
  addBox(group, shadowSkin, -.43, 1.82, -.05, .09, .34, .34);
  addBox(group, shadowSkin, .43, 1.82, -.05, .09, .34, .34);

  [-.21, .22].forEach((x, index) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(.12, .42, 4), material(darkSkin));
    spike.position.set(x, 2.48 + index * .02, -.08);
    spike.rotation.y = Math.PI / 4;
    group.add(spike);
  });

  addBox(group, 0xf4f5ee, -.18, 1.9, -.43, .19, .24, .045);
  addBox(group, 0xf4f5ee, .19, 1.9, -.43, .19, .24, .045);
  addBox(group, 0x111111, -.16, 1.88, -.465, .075, .09, .035);
  addBox(group, 0x111111, .2, 1.88, -.465, .075, .09, .035);
  addBox(group, shadowSkin, -.18, 2.08, -.46, .25, .045, .045).rotation.z = -.28;
  addBox(group, shadowSkin, .2, 2.07, -.46, .25, .045, .045).rotation.z = .24;
  addBox(group, darkSkin, .01, 1.74, -.46, .15, .14, .13);

  addBox(group, 0x050505, .02, 1.55, -.455, .43, .3, .055);
  addBox(group, 0xf2efdc, -.13, 1.66, -.5, .075, .11, .04);
  addBox(group, 0xf2efdc, .17, 1.66, -.5, .075, .11, .04);
  addBox(group, 0xf2efdc, -.12, 1.44, -.5, .075, .1, .04);
  addBox(group, 0xf2efdc, .16, 1.44, -.5, .075, .1, .04);
  addBox(group, 0x7a1919, .03, 1.42, -.5, .18, .06, .035);
  addBox(group, darkSkin, 0, 1.34, -.43, .44, .09, .12);

  const rightArm = addRunnerArm(group, skin, darkSkin, .44, 1.18, -.14, 1, -.92);
  const leftArm = addRunnerArm(group, skin, darkSkin, -.44, 1.19, -.18, -1, 1.02);
  const leftLeg = addRunnerLeg(group, pants, boots, pantsPatch, -.17, .72, -.62);
  const rightLeg = addRunnerLeg(group, pants, boots, pantsPatch, .18, .72, .48);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg };
}


function createBruteZombieModel(group, skin, shirt) {
  const darkSkin = 0x4f7f2f;
  const shadowSkin = 0x3f6829;
  const vestDark = 0x2b1f18;
  const vestRust = 0x6f4325;
  const undershirt = 0x5b4b25;
  const pants = 0x142033;
  const pantsDark = 0x0d1724;
  const boots = 0x171717;
  const metal = 0x777a76;

  const belly = addBox(group, undershirt, 0, .74, .02, 1.16, .72, .66);
  belly.rotation.x = -.02;
  const torso = addBox(group, shirt, 0, 1.14, 0, 1.2, .96, .72);
  torso.rotation.x = .03;
  addBox(group, vestDark, 0, 1.15, -.38, 1.04, .88, .08);
  addBox(group, vestRust, -.53, 1.45, -.02, .36, .3, .74).rotation.z = -.34;
  addBox(group, vestRust, .53, 1.45, -.02, .36, .3, .74).rotation.z = .34;
  addBox(group, metal, -.28, 1.16, -.44, .18, .2, .055);
  addBox(group, metal, .34, 1.18, -.44, .18, .2, .055);
  [-.42, -.16, .08, .34].forEach((x, index) => {
    const tear = new THREE.Mesh(new THREE.ConeGeometry(.15, .3, 3), material(shirt));
    tear.position.set(x, .54, -.04);
    tear.rotation.set(0, 0, Math.PI + (index % 2 ? .2 : -.18));
    group.add(tear);
  });

  const head = addBox(group, skin, 0, 2.02, -.04, .92, .86, .86);
  head.rotation.y = .02;
  addBox(group, darkSkin, 0, 2.45, -.05, .88, .1, .82);
  addBox(group, shadowSkin, -.5, 2.01, -.04, .1, .38, .38);
  addBox(group, shadowSkin, .5, 2.01, -.04, .1, .38, .38);
  addBox(group, darkSkin, 0, 1.56, -.05, .72, .14, .78);

  addBox(group, 0xf4f4ea, -.22, 2.1, -.5, .22, .25, .045);
  addBox(group, 0xf4f4ea, .22, 2.1, -.5, .22, .25, .045);
  addBox(group, 0x101010, -.2, 2.09, -.53, .085, .105, .035);
  addBox(group, 0x101010, .24, 2.09, -.53, .085, .105, .035);
  addBox(group, shadowSkin, -.22, 2.29, -.53, .3, .06, .05).rotation.z = -.22;
  addBox(group, shadowSkin, .23, 2.28, -.53, .3, .06, .05).rotation.z = .22;
  addBox(group, darkSkin, 0, 1.93, -.54, .18, .15, .13);

  addBox(group, 0x030303, 0, 1.72, -.52, .56, .32, .06);
  addBox(group, 0xf2efdc, -.2, 1.84, -.565, .09, .12, .04);
  addBox(group, 0xf2efdc, .2, 1.84, -.565, .09, .12, .04);
  addBox(group, 0xf2efdc, -.18, 1.6, -.565, .09, .11, .04);
  addBox(group, 0xf2efdc, .22, 1.6, -.565, .09, .11, .04);
  addBox(group, 0x8b2a1d, .03, 1.57, -.565, .24, .07, .035);
  addBox(group, darkSkin, 0, 1.48, -.48, .58, .11, .14);

  const rightArm = addBruteArm(group, skin, darkSkin, .82, 1.18, -.16, 1);
  const leftArm = addBruteArm(group, skin, darkSkin, -.82, 1.18, -.16, -1);
  const leftLeg = addBruteLeg(group, pants, pantsDark, boots, -.28, .66);
  const rightLeg = addBruteLeg(group, pants, pantsDark, boots, .28, .66);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg };
}

function addBruteArm(group, skinColor, handColor, x, y, z, side) {
  const arm = new THREE.Group();
  arm.position.set(x, y, z);
  arm.rotation.x = .8;
  arm.rotation.z = side * .13;

  const upper = new THREE.Mesh(new THREE.BoxGeometry(.38, .48, .34), material(skinColor));
  upper.position.set(0, -.18, 0);
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.42, .68, .36), material(skinColor));
  forearm.position.set(side * .02, -.66, -.02);
  forearm.rotation.z = side * -.08;
  const fist = new THREE.Mesh(new THREE.BoxGeometry(.42, .28, .38), material(handColor));
  fist.position.set(side * .06, -1.07, -.04);
  fist.rotation.z = side * .2;

  arm.add(upper, forearm, fist);
  group.add(arm);
  return arm;
}

function addBruteLeg(group, pantsColor, pantsDarkColor, bootColor, x, hipY) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, .02);

  const thigh = new THREE.Mesh(new THREE.BoxGeometry(.34, .56, .38), material(pantsColor));
  thigh.position.set(0, -.28, 0);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(.36, .16, .4), material(pantsDarkColor));
  cuff.position.set(0, -.62, -.01);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(.42, .22, .48), material(bootColor));
  boot.position.set(0, -.82, -.1);

  leg.add(thigh, cuff, boot);
  group.add(leg);
  return leg;
}

function addRunnerLeg(group, pantsColor, bootColor, patchColor, x, hipY, strideRotation) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, .02);
  leg.rotation.x = strideRotation;

  const pants = new THREE.Mesh(new THREE.BoxGeometry(.23, .68, .3), material(pantsColor));
  pants.position.set(0, -.34, 0);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(.31, .17, .4), material(bootColor));
  boot.position.set(0, -.68, -.08);
  boot.rotation.x = -.18;
  const patch = new THREE.Mesh(new THREE.BoxGeometry(.12, .08, .035), material(patchColor));
  patch.position.set(x < 0 ? -.05 : .05, -.31, -.17);

  leg.add(pants, boot, patch);
  group.add(leg);
  return leg;
}

function addRunnerArm(group, skinColor, handColor, x, y, z, side, reachRotation) {
  const arm = new THREE.Group();
  arm.position.set(x, y, z);
  arm.rotation.x = reachRotation;
  arm.rotation.z = side * .16;

  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.22, .72, .22), material(skinColor));
  forearm.position.set(0, -.32, 0);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(.23, .2, .22), material(handColor));
  hand.position.set(side * .04, -.72, -.01);
  hand.rotation.z = side * .18;

  arm.add(forearm, hand);
  group.add(arm);
  return arm;
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
  } else if (typeKey === 'runner') {
    createRunnerZombieModel(g, skin, shirt);
  } else if (typeKey === 'brute') {
    createBruteZombieModel(g, skin, shirt);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .55), material(shirt)); body.position.y = 1;
    const headSize = typeKey === 'spitter' ? .82 : .72;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), material(skin)); head.position.y = 1.9;
    g.add(body, head);

    const heavyArms = typeKey === 'brute' || typeKey === 'crusher' || typeKey === 'boss';
    addLimb(g, skin, .65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
    addLimb(g, skin, -.65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
  }

  if (typeKey === 'crusher' || typeKey === 'boss') {
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
  captureZombieAnimationRestPose(g);
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

function captureZombieAnimationRestPose(zombie) {
  if (!['walker', 'runner'].includes(zombie.userData.typeKey) || !zombie.userData.parts) return;
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

const ZOMBIE_ANIMATION_PRESETS = {
  walker: { cycleSpeed: 3.8, activityDamp: 8, armSwing: .18, legSwing: .13, bob: .035, sway: .035 },
  runner: { cycleSpeed: 8.7, activityDamp: 12, armSwing: .32, legSwing: .25, bob: .045, sway: .045 },
};

function updateZombieMovementAnimation(zombie, delta, isMoving) {
  const preset = ZOMBIE_ANIMATION_PRESETS[zombie.userData.typeKey];
  if (!preset || !zombie.userData.parts || !zombie.userData.walkRestPose) return;

  const { leftArm, rightArm, leftLeg, rightLeg } = zombie.userData.parts;
  const rest = zombie.userData.walkRestPose;
  const activityTarget = isMoving ? 1 : 0;
  zombie.userData.walkActivity = THREE.MathUtils.damp(zombie.userData.walkActivity ?? 0, activityTarget, preset.activityDamp, delta);
  zombie.userData.walkTime = (zombie.userData.walkTime ?? 0) + delta * preset.cycleSpeed * zombie.userData.walkActivity;

  const activity = zombie.userData.walkActivity;
  const stride = Math.sin(zombie.userData.walkTime);
  const counterStride = Math.sin(zombie.userData.walkTime + Math.PI);
  const lift = Math.abs(Math.sin(zombie.userData.walkTime * 2));

  leftArm.rotation.x = rest.leftArmX + stride * preset.armSwing * activity;
  rightArm.rotation.x = rest.rightArmX + counterStride * preset.armSwing * activity;
  leftLeg.rotation.x = rest.leftLegX + counterStride * preset.legSwing * activity;
  rightLeg.rotation.x = rest.rightLegX + stride * preset.legSwing * activity;
  zombie.position.y = rest.rootY + lift * preset.bob * activity;
  zombie.rotation.z = rest.rootRotZ + Math.sin(zombie.userData.walkTime * 2) * preset.sway * activity;
}

export function updateZombies(player, delta, onDamage) {
  for (const z of zombies) {
    const type = ZOMBIE_TYPES[z.userData.typeKey] ?? ZOMBIE_TYPES.walker;
    const dx = player.position.x - z.position.x, dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    z.position.x += (dx / dist) * type.speed * delta;
    z.position.z += (dz / dist) * type.speed * delta;
    z.rotation.y = Math.atan2(dx, dz) + ZOMBIE_VISUAL_FACING_OFFSET;
    updateZombieMovementAnimation(z, delta, dist > CONFIG.player.radius + type.radius * .5);
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
