import * as THREE from 'three';
import { CONFIG } from './config.js';

const zombies = [];
const slimeProjectiles = [];
const ZOMBIE_TYPES = CONFIG.zombie.types;
// Zombie art faces local -Z; chase rotation math points local +Z toward the player.
const ZOMBIE_VISUAL_FACING_OFFSET = Math.PI;
const hitFlashColor = new THREE.Color(0xfff1a8);

function material(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.85 }); }

function createSlimeProjectileMesh() {
  const group = new THREE.Group();
  const slimeMaterial = new THREE.MeshStandardMaterial({ color: 0x8cff1a, emissive: 0x245f05, emissiveIntensity: .35, roughness: .68 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.34, 8, 6), slimeMaterial);
  core.scale.set(1.18, .82, 1);
  group.add(core);

  const trailMaterial = new THREE.MeshStandardMaterial({ color: 0xb6ff35, emissive: 0x1f5f05, emissiveIntensity: .22, roughness: .72 });
  [
    { x: -.22, y: .05, z: .38, s: .15 },
    { x: .18, y: -.07, z: .58, s: .11 },
    { x: .04, y: .13, z: .76, s: .09 },
  ].forEach((blob) => {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(blob.s, 6, 4), trailMaterial);
    drop.position.set(blob.x, blob.y, blob.z);
    group.add(drop);
  });
  return group;
}


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

  const rightArm = addBruteArm(group, skin, darkSkin, .72, 1.28, -.12, 1);
  const leftArm = addBruteArm(group, skin, darkSkin, -.72, 1.28, -.12, -1);
  const leftLeg = addBruteLeg(group, pants, pantsDark, boots, -.28, .66);
  const rightLeg = addBruteLeg(group, pants, pantsDark, boots, .28, .66);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg };
}

function createSpitterZombieModel(group, skin, shirt) {
  const darkSkin = 0x5f8f35;
  const shadowSkin = 0x4b7d2d;
  const toxic = 0xb7ff36;
  const toxicDark = 0x7ed321;
  const shirtPurple = 0x5f3a7d;
  const shirtDark = 0x382348;
  const pants = 0x102332;
  const pantsDark = 0x0b1720;
  const boots = 0x1b1a17;

  const belly = addBox(group, shadowSkin, 0, .98, -.28, .72, .58, .34);
  belly.rotation.x = -.08;
  const throat = new THREE.Mesh(new THREE.SphereGeometry(.34, 8, 6), material(toxic));
  throat.scale.set(1.12, .82, .78);
  throat.position.set(0, 1.38, -.36);
  group.add(throat);

  const torso = addBox(group, shirtPurple, 0, .88, .03, .94, .92, .56);
  torso.rotation.x = -.04;
  addBox(group, shirtDark, 0, .43, .02, .98, .15, .58);
  addBox(group, shirtDark, -.56, 1.28, -.02, .3, .3, .5).rotation.z = -.38;
  addBox(group, shirtDark, .56, 1.28, -.02, .3, .3, .5).rotation.z = .38;
  [-.35, -.12, .12, .35].forEach((x, index) => {
    const tear = new THREE.Mesh(new THREE.ConeGeometry(.13, .28, 3), material(shirtPurple));
    tear.position.set(x, .27, -.02);
    tear.rotation.set(0, 0, Math.PI + (index % 2 ? .2 : -.18));
    group.add(tear);
  });
  addBox(group, toxicDark, -.19, .72, -.28, .12, .08, .035);
  addBox(group, toxic, -.08, .67, -.28, .22, .16, .04);
  addBox(group, toxicDark, .1, .72, -.28, .08, .07, .035);
  addBox(group, toxic, .28, 1.1, -.28, .18, .13, .04);

  const head = addBox(group, skin, 0, 1.9, -.08, .88, .82, .82);
  head.rotation.x = -.04;
  addBox(group, shadowSkin, -.48, 1.88, -.08, .1, .36, .36);
  addBox(group, shadowSkin, .48, 1.88, -.08, .1, .36, .36);
  addBox(group, darkSkin, 0, 2.32, -.08, .86, .1, .78);

  const spike = new THREE.Mesh(new THREE.ConeGeometry(.18, .48, 4), material(shirtPurple));
  spike.position.set(0, 2.65, -.08);
  spike.rotation.y = Math.PI / 4;
  group.add(spike);

  addBox(group, 0xf4f5ee, -.2, 1.96, -.52, .2, .25, .045);
  addBox(group, 0xf4f5ee, .2, 1.96, -.52, .2, .25, .045);
  addBox(group, 0x101010, -.18, 1.94, -.55, .08, .1, .035);
  addBox(group, 0x101010, .22, 1.94, -.55, .08, .1, .035);
  addBox(group, shadowSkin, -.2, 2.14, -.55, .28, .05, .045).rotation.z = -.28;
  addBox(group, shadowSkin, .2, 2.13, -.55, .28, .05, .045).rotation.z = .28;
  addBox(group, darkSkin, .02, 1.8, -.55, .18, .14, .13);

  addBox(group, 0x030303, 0, 1.58, -.55, .54, .34, .06);
  addBox(group, 0xf3f0dc, -.19, 1.7, -.6, .085, .12, .04);
  addBox(group, 0xf3f0dc, .2, 1.7, -.6, .085, .12, .04);
  addBox(group, 0xf3f0dc, -.16, 1.45, -.6, .085, .11, .04);
  addBox(group, 0xf3f0dc, .21, 1.45, -.6, .085, .11, .04);
  addBox(group, 0x8b1f1f, .04, 1.42, -.6, .2, .07, .035);
  addBox(group, toxic, 0, 1.31, -.53, .48, .1, .12);
  addBox(group, toxicDark, -.16, 1.43, -.58, .08, .08, .035);
  addBox(group, toxicDark, .18, 1.36, -.58, .1, .07, .035);

  const rightArm = addWalkerArm(group, skin, darkSkin, .68, 1.02, -.18, 1);
  rightArm.rotation.z = .12;
  const leftArm = addWalkerArm(group, skin, darkSkin, -.68, 1.02, -.18, -1);
  leftArm.rotation.z = -.12;
  const leftLeg = addWalkerLeg(group, pants, boots, -.23, .68);
  const rightLeg = addWalkerLeg(group, pants, boots, .23, .68);
  addBox(group, pantsDark, -.23, .34, -.01, .3, .12, .36);
  addBox(group, pantsDark, .23, .34, -.01, .3, .12, .36);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg, head, throat, belly, torso };
  group.userData.futureMouthOrigin = new THREE.Vector3(0, 1.56, -.62);
}

function addCrusherStud(group, x, y, z, size = .1) {
  const stud = new THREE.Mesh(new THREE.BoxGeometry(size, size, size * .42), material(0x8a8a82));
  stud.position.set(x, y, z);
  stud.rotation.z = .12;
  group.add(stud);
  return stud;
}

function addCrusherSpike(group, x, y, z, radius = .13, height = .34, color = 0x8c8f88) {
  const spike = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 4), material(color));
  spike.position.set(x, y, z);
  spike.rotation.y = Math.PI / 4;
  group.add(spike);
  return spike;
}

function addCrusherArm(group, skinColor, darkSkinColor, x, y, z, side, armorColor, metalColor) {
  const arm = new THREE.Group();
  arm.position.set(x, y, z);
  arm.rotation.x = .72;
  arm.rotation.z = side * .1;

  const upper = new THREE.Mesh(new THREE.BoxGeometry(.44, .56, .4), material(skinColor));
  upper.position.set(0, -.22, 0);
  upper.rotation.z = side * -.04;
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.5, .76, .42), material(skinColor));
  forearm.position.set(side * .03, -.75, -.03);
  forearm.rotation.z = side * -.07;
  const wristBand = new THREE.Mesh(new THREE.BoxGeometry(.62, .22, .5), material(armorColor));
  wristBand.position.set(side * .03, -.97, -.04);
  const fist = new THREE.Mesh(new THREE.BoxGeometry(.58, .36, .48), material(darkSkinColor));
  fist.position.set(side * .08, -1.25, -.06);
  fist.rotation.z = side * .16;

  [-.18, 0, .18].forEach((offset) => {
    const stud = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .055), material(metalColor));
    stud.position.set(offset, -.98, -.3);
    arm.add(stud);
  });

  arm.add(upper, forearm, wristBand, fist);
  group.add(arm);
  return arm;
}

function addCrusherLeg(group, pantsColor, pantsDarkColor, bootColor, x, hipY) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, .02);

  const thigh = new THREE.Mesh(new THREE.BoxGeometry(.4, .62, .42), material(pantsColor));
  thigh.position.set(0, -.31, 0);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(.42, .18, .44), material(pantsDarkColor));
  cuff.position.set(0, -.7, -.01);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(.54, .24, .58), material(bootColor));
  boot.position.set(0, -.91, -.11);

  leg.add(thigh, cuff, boot);
  group.add(leg);
  return leg;
}

function createCrusherZombieModel(group, skin, shirt) {
  const darkSkin = 0x4f7d2b;
  const shadowSkin = 0x3d6424;
  const armor = 0x343230;
  const armorDark = 0x252422;
  const rust = 0x7b4a24;
  const rustDark = 0x4e321d;
  const metal = 0x85877f;
  const darkMetal = 0x5d5f5a;
  const pants = 0x101e24;
  const pantsDark = 0x0a1318;
  const boots = 0x161513;

  const hips = addBox(group, pants, 0, .56, .02, 1.18, .34, .7);
  const torso = addBox(group, armor, 0, 1.13, 0, 1.36, 1.12, .78);
  torso.rotation.x = .02;
  const chestPlate = addBox(group, armorDark, 0, 1.24, -.43, 1.18, .86, .1);
  addBox(group, rust, 0, .74, -.44, 1.36, .2, .12);
  addBox(group, rustDark, 0, .73, -.51, 1.08, .08, .055);
  addBox(group, metal, 0, .76, -.55, .36, .34, .08);
  addBox(group, darkMetal, 0, .76, -.61, .25, .24, .045);
  [-.48, .48].forEach((x) => {
    addCrusherStud(group, x, 1.5, -.51, .12);
    addCrusherStud(group, x, 1.05, -.51, .11);
    addCrusherStud(group, x, .75, -.57, .13);
  });

  const leftShoulder = addBox(group, rust, -.88, 1.55, -.04, .58, .3, .82);
  leftShoulder.rotation.z = -.28;
  leftShoulder.rotation.x = -.08;
  const rightShoulder = addBox(group, rust, .88, 1.55, -.04, .58, .3, .82);
  rightShoulder.rotation.z = .28;
  rightShoulder.rotation.x = -.08;
  addBox(group, armorDark, -.68, 1.38, -.02, .24, .42, .82);
  addBox(group, armorDark, .68, 1.38, -.02, .24, .42, .82);
  [-1.03, -.85, .85, 1.03].forEach((x, i) => addCrusherSpike(group, x, 1.82, -.18 + (i % 2) * .16, .12, .34, darkMetal));
  [-.96, -.78, .78, .96].forEach((x) => addCrusherStud(group, x, 1.53, -.48, .09));

  const neck = addBox(group, darkSkin, 0, 1.68, -.03, .62, .2, .62);
  const head = addBox(group, skin, 0, 2.14, -.05, 1.0, .92, .9);
  head.rotation.y = .02;
  addBox(group, darkSkin, 0, 2.62, -.06, .98, .12, .86);
  addBox(group, shadowSkin, -.55, 2.12, -.05, .12, .42, .4);
  addBox(group, shadowSkin, .55, 2.12, -.05, .12, .42, .4);
  addBox(group, darkSkin, 0, 1.67, -.06, .76, .16, .82);
  [-.34, 0, .34].forEach((x, i) => addCrusherSpike(group, x, 2.86 + (i === 1 ? .04 : 0), -.08, .13, .38, darkMetal));

  addBox(group, 0x160606, -.24, 2.2, -.56, .24, .24, .05);
  addBox(group, 0x160606, .24, 2.2, -.56, .24, .24, .05);
  addBox(group, 0xff1515, -.23, 2.2, -.6, .12, .12, .035);
  addBox(group, 0xff1515, .25, 2.2, -.6, .12, .12, .035);
  addBox(group, shadowSkin, -.24, 2.41, -.6, .34, .06, .045).rotation.z = -.24;
  addBox(group, shadowSkin, .24, 2.4, -.6, .34, .06, .045).rotation.z = .24;
  addBox(group, rustDark, .02, 2.02, -.61, .22, .15, .13);
  addBox(group, 0x050505, 0, 1.8, -.59, .64, .36, .065);
  addBox(group, 0xf2efdc, -.22, 1.93, -.64, .09, .15, .045);
  addBox(group, 0xf2efdc, .22, 1.93, -.64, .09, .15, .045);
  addBox(group, 0xf2efdc, -.18, 1.66, -.64, .1, .13, .045);
  addBox(group, 0xf2efdc, .25, 1.66, -.64, .1, .13, .045);
  addBox(group, 0x7b1e19, .03, 1.63, -.64, .27, .08, .04);
  addBox(group, darkSkin, 0, 1.53, -.52, .66, .12, .15);

  const rightArm = addCrusherArm(group, skin, darkSkin, .94, 1.32, -.13, 1, armorDark, metal);
  const leftArm = addCrusherArm(group, skin, darkSkin, -.94, 1.32, -.13, -1, armorDark, metal);
  const leftLeg = addCrusherLeg(group, pants, pantsDark, boots, -.34, .58);
  const rightLeg = addCrusherLeg(group, pants, pantsDark, boots, .34, .58);

  group.userData.parts = { leftArm, rightArm, leftLeg, rightLeg, head, neck, torso, chestPlate, hips, leftShoulder, rightShoulder };
}


function addBossStud(group, x, y, z, size = .14, depth = .075) {
  const stud = new THREE.Mesh(new THREE.BoxGeometry(size, size, depth), material(0x8d8f88));
  stud.position.set(x, y, z);
  stud.rotation.z = .12;
  group.add(stud);
  return stud;
}

function addBossSpike(group, x, y, z, radius = .18, height = .5, color = 0x666a66, rotationX = 0) {
  const spike = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 4), material(color));
  spike.position.set(x, y, z);
  spike.rotation.set(rotationX, Math.PI / 4, 0);
  group.add(spike);
  return spike;
}

function addBossArm(group, skinColor, handColor, x, y, z, side, armorColor, metalColor) {
  const arm = new THREE.Group();
  arm.position.set(x, y, z);
  arm.rotation.x = .64;
  arm.rotation.z = side * .08;

  const upper = new THREE.Mesh(new THREE.BoxGeometry(.64, .82, .56), material(skinColor));
  upper.position.set(0, -.34, 0);
  upper.rotation.z = side * -.04;
  const elbowBand = new THREE.Mesh(new THREE.BoxGeometry(.72, .2, .6), material(armorColor));
  elbowBand.position.set(side * .02, -.78, -.03);
  const forearm = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.02, .6), material(skinColor));
  forearm.position.set(side * .05, -1.18, -.04);
  forearm.rotation.z = side * -.06;
  const wristBand = new THREE.Mesh(new THREE.BoxGeometry(.9, .34, .68), material(armorColor));
  wristBand.position.set(side * .07, -1.68, -.06);
  const fist = new THREE.Mesh(new THREE.BoxGeometry(.9, .58, .72), material(handColor));
  fist.position.set(side * .14, -2.08, -.08);
  fist.rotation.z = side * .16;

  [-.25, 0, .25].forEach((offset) => {
    const stud = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .075), material(metalColor));
    stud.position.set(offset, -1.68, -.42);
    stud.rotation.z = .12;
    arm.add(stud);
  });

  arm.add(upper, elbowBand, forearm, wristBand, fist);
  group.add(arm);
  return arm;
}

function addBossLeg(group, pantsColor, pantsDarkColor, bootColor, x, hipY) {
  const leg = new THREE.Group();
  leg.position.set(x, hipY, .04);

  const thigh = new THREE.Mesh(new THREE.BoxGeometry(.58, .82, .58), material(pantsColor));
  thigh.position.set(0, -.4, 0);
  const knee = new THREE.Mesh(new THREE.BoxGeometry(.62, .18, .62), material(pantsDarkColor));
  knee.position.set(0, -.88, -.01);
  const shin = new THREE.Mesh(new THREE.BoxGeometry(.54, .58, .52), material(pantsColor));
  shin.position.set(0, -1.18, 0);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(.76, .34, .86), material(bootColor));
  boot.position.set(0, -1.58, -.14);

  leg.add(thigh, knee, shin, boot);
  group.add(leg);
  return leg;
}

function createBossZombieModel(group, skin, shirt) {
  const darkSkin = 0x356b24;
  const shadowSkin = 0x2f5a21;
  const armor = 0x282828;
  const armorDark = 0x181818;
  const metal = 0x83857d;
  const darkMetal = 0x555852;
  const rust = 0x7a4b25;
  const leather = 0x4a2d19;
  const bone = 0xd7d4c7;
  const pants = 0x0d2026;
  const pantsDark = 0x071216;
  const boots = 0x111110;

  const hips = addBox(group, pants, 0, .72, .03, 1.72, .48, .94);
  const belt = addBox(group, leather, 0, .98, -.5, 1.82, .22, .14);
  const torso = addBox(group, armor, 0, 1.62, 0, 1.9, 1.45, .98);
  torso.rotation.x = .015;
  const chestPlate = addBox(group, armorDark, 0, 1.68, -.55, 1.62, 1.04, .14);
  addBox(group, darkMetal, 0, 2.18, -.63, 1.18, .16, .08);
  addBox(group, darkMetal, -.62, 1.38, -.64, .22, .24, .08);
  addBox(group, darkMetal, .62, 1.38, -.64, .22, .24, .08);

  const skull = addBox(group, bone, 0, 1.58, -.69, .52, .42, .1);
  addBox(group, 0x101010, -.12, 1.62, -.75, .1, .11, .04);
  addBox(group, 0x101010, .12, 1.62, -.75, .1, .11, .04);
  addBox(group, 0x101010, 0, 1.48, -.75, .08, .08, .04);
  addBox(group, 0x101010, -.14, 1.38, -.75, .07, .1, .04);
  addBox(group, 0x101010, 0, 1.37, -.75, .07, .1, .04);
  addBox(group, 0x101010, .14, 1.38, -.75, .07, .1, .04);

  const leftShoulder = addBox(group, darkMetal, -1.28, 2.18, -.04, .88, .36, 1.02);
  leftShoulder.rotation.z = -.28;
  leftShoulder.rotation.x = -.08;
  const rightShoulder = addBox(group, darkMetal, 1.28, 2.18, -.04, .88, .36, 1.02);
  rightShoulder.rotation.z = .28;
  rightShoulder.rotation.x = -.08;
  addBox(group, rust, -1.04, 1.9, -.02, .32, .62, 1.02).rotation.z = -.1;
  addBox(group, rust, 1.04, 1.9, -.02, .32, .62, 1.02).rotation.z = .1;
  [-1.54, -1.25, -.98, .98, 1.25, 1.54].forEach((x, i) => {
    addBossSpike(group, x, 2.5, -.22 + (i % 3) * .18, .16, .46, darkMetal);
  });
  [-.72, -.28, .28, .72].forEach((x) => addBossStud(group, x, 1.98, -.65, .14));

  const neck = addBox(group, darkSkin, 0, 2.28, -.04, .86, .28, .78);
  const head = addBox(group, skin, 0, 2.94, -.08, 1.42, 1.26, 1.16);
  addBox(group, shadowSkin, -.78, 2.92, -.08, .16, .52, .52);
  addBox(group, shadowSkin, .78, 2.92, -.08, .16, .52, .52);
  const crown = addBox(group, darkMetal, 0, 3.62, -.09, 1.58, .2, 1.18);
  addBox(group, armorDark, 0, 3.48, -.68, 1.7, .18, .16);
  [-.58, 0, .58].forEach((x, i) => addBossSpike(group, x, 4.0 + (i === 1 ? .08 : 0), -.12, .18, .58, darkMetal));
  addBossSpike(group, -.86, 3.84, -.08, .14, .46, darkMetal);
  addBossSpike(group, .86, 3.84, -.08, .14, .46, darkMetal);

  addBox(group, 0x120303, -.34, 3.08, -.69, .34, .3, .06);
  addBox(group, 0x120303, .34, 3.08, -.69, .34, .3, .06);
  addBox(group, 0xff1818, -.34, 3.08, -.735, .16, .14, .035);
  addBox(group, 0xff1818, .34, 3.08, -.735, .16, .14, .035);
  addBox(group, shadowSkin, -.34, 3.34, -.735, .44, .075, .05).rotation.z = -.28;
  addBox(group, shadowSkin, .34, 3.33, -.735, .44, .075, .05).rotation.z = .28;
  addBox(group, darkSkin, 0, 2.82, -.74, .26, .18, .16);
  addBox(group, 0x030303, 0, 2.48, -.73, .84, .42, .07);
  addBox(group, bone, -.3, 2.64, -.79, .12, .17, .045);
  addBox(group, bone, .3, 2.64, -.79, .12, .17, .045);
  addBox(group, bone, -.22, 2.32, -.79, .12, .15, .045);
  addBox(group, bone, .32, 2.32, -.79, .12, .15, .045);
  addBox(group, 0x7b1e19, .04, 2.27, -.79, .34, .09, .04);
  addBox(group, darkSkin, 0, 2.14, -.62, .86, .16, .18);

  const rightArm = addBossArm(group, skin, darkSkin, 1.38, 1.82, -.16, 1, armorDark, metal);
  const leftArm = addBossArm(group, skin, darkSkin, -1.38, 1.82, -.16, -1, armorDark, metal);
  const leftLeg = addBossLeg(group, pants, pantsDark, boots, -.5, .82);
  const rightLeg = addBossLeg(group, pants, pantsDark, boots, .5, .82);

  group.userData.parts = {
    leftArm, rightArm, leftLeg, rightLeg, head, neck, torso, chestPlate, hips, belt,
    skull, crown, leftShoulder, rightShoulder,
  };
  group.userData.displayName = 'Gravebreaker';
  group.userData.futureSlamOrigin = new THREE.Vector3(0, .08, -.82);
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
  } else if (typeKey === 'spitter') {
    createSpitterZombieModel(g, skin, shirt);
  } else if (typeKey === 'crusher') {
    createCrusherZombieModel(g, skin, shirt);
  } else if (typeKey === 'boss') {
    createBossZombieModel(g, skin, shirt);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .55), material(shirt)); body.position.y = 1;
    const headSize = typeKey === 'spitter' ? .82 : .72;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), material(skin)); head.position.y = 1.9;
    g.add(body, head);

    const heavyArms = typeKey === 'brute' || typeKey === 'crusher';
    addLimb(g, skin, .65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
    addLimb(g, skin, -.65, 1.15, -.2, heavyArms ? .34 : .25, .8, .25);
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

export function resetZombies(scene) {
  zombies.splice(0).forEach((z) => { if (scene && z) scene.remove(z); });
  slimeProjectiles.splice(0).forEach((shot) => { if (scene && shot?.mesh) scene.remove(shot.mesh); });
}
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
  if (!['walker', 'runner', 'brute', 'spitter', 'crusher'].includes(zombie.userData.typeKey) || !zombie.userData.parts) return;
  const { leftArm, rightArm, leftLeg, rightLeg, torso, chestPlate, leftShoulder, rightShoulder } = zombie.userData.parts;
  zombie.userData.walkRestPose = {
    rootY: zombie.position.y,
    rootRotX: zombie.rotation.x,
    rootRotZ: zombie.rotation.z,
    leftArmX: leftArm.rotation.x,
    leftArmZ: leftArm.rotation.z,
    rightArmX: rightArm.rotation.x,
    rightArmZ: rightArm.rotation.z,
    leftLegX: leftLeg.rotation.x,
    rightLegX: rightLeg.rotation.x,
    torsoRotX: torso?.rotation.x ?? 0,
    chestPlateRotX: chestPlate?.rotation.x ?? 0,
    leftShoulderY: leftShoulder?.position.y ?? 0,
    rightShoulderY: rightShoulder?.position.y ?? 0,
    leftShoulderRotZ: leftShoulder?.rotation.z ?? 0,
    rightShoulderRotZ: rightShoulder?.rotation.z ?? 0,
  };
}

const ZOMBIE_ANIMATION_PRESETS = {
  walker: { cycleSpeed: 3.8, activityDamp: 8, armSwing: .18, legSwing: .13, bob: .035, sway: .035 },
  runner: { cycleSpeed: 8.7, activityDamp: 12, armSwing: .32, legSwing: .25, bob: .045, sway: .045 },
  brute: { cycleSpeed: 2.45, activityDamp: 6, armSwing: .34, legSwing: .23, bob: .048, sway: .055, stomp: true },
  crusher: {
    cycleSpeed: 1.75, activityDamp: 5, armSwing: .46, legSwing: .28, bob: .055, sway: .045,
    stomp: true, torsoRoll: .035, shoulderLift: .045, shoulderRoll: .035,
  },
  spitter: {
    cycleSpeed: 3.15, activityDamp: 7, armSwing: .16, legSwing: .12, bob: .03, sway: .028,
    spitInterval: 4.2, spitDuration: .72, spitLean: -.16, spitArmOpen: .34,
  },
};

function updateZombieMovementAnimation(zombie, delta, isMoving) {
  const preset = ZOMBIE_ANIMATION_PRESETS[zombie.userData.typeKey];
  if (!preset || !zombie.userData.parts || !zombie.userData.walkRestPose) return;

  const { leftArm, rightArm, leftLeg, rightLeg, torso, chestPlate, leftShoulder, rightShoulder } = zombie.userData.parts;
  const rest = zombie.userData.walkRestPose;
  const activityTarget = isMoving ? 1 : 0;
  zombie.userData.walkActivity = THREE.MathUtils.damp(zombie.userData.walkActivity ?? 0, activityTarget, preset.activityDamp, delta);
  zombie.userData.walkTime = (zombie.userData.walkTime ?? 0) + delta * preset.cycleSpeed * zombie.userData.walkActivity;

  const activity = zombie.userData.walkActivity;
  const stride = Math.sin(zombie.userData.walkTime);
  const counterStride = Math.sin(zombie.userData.walkTime + Math.PI);
  const lift = preset.stomp
    ? Math.pow(Math.abs(Math.sin(zombie.userData.walkTime)), 1.8)
    : Math.abs(Math.sin(zombie.userData.walkTime * 2));

  let spit = 0;
  if (zombie.userData.typeKey === 'spitter' && zombie.userData.spitAttackTimer > 0) {
    const ranged = getSpitterRangedConfig();
    if (ranged?.windupDuration) {
      const spitProgress = 1 - (zombie.userData.spitAttackTimer / ranged.windupDuration);
      spit = Math.sin(THREE.MathUtils.clamp(spitProgress, 0, 1) * Math.PI);
    }
  }

  leftArm.rotation.x = rest.leftArmX + stride * preset.armSwing * activity;
  rightArm.rotation.x = rest.rightArmX + counterStride * preset.armSwing * activity;
  leftArm.rotation.z = rest.leftArmZ - (preset.spitArmOpen ?? 0) * spit;
  rightArm.rotation.z = rest.rightArmZ + (preset.spitArmOpen ?? 0) * spit;
  leftLeg.rotation.x = rest.leftLegX + counterStride * preset.legSwing * activity;
  rightLeg.rotation.x = rest.rightLegX + stride * preset.legSwing * activity;
  zombie.position.y = rest.rootY + lift * preset.bob * activity;
  zombie.rotation.x = rest.rootRotX + (preset.spitLean ?? 0) * spit;
  zombie.rotation.z = rest.rootRotZ + Math.sin(zombie.userData.walkTime * 2) * preset.sway * activity;

  if (torso) torso.rotation.x = rest.torsoRotX + Math.sin(zombie.userData.walkTime * 2) * (preset.torsoRoll ?? 0) * activity;
  if (chestPlate) chestPlate.rotation.x = rest.chestPlateRotX + Math.sin(zombie.userData.walkTime * 2) * (preset.torsoRoll ?? 0) * activity;
  if (leftShoulder) {
    leftShoulder.position.y = rest.leftShoulderY + Math.max(0, counterStride) * (preset.shoulderLift ?? 0) * activity;
    leftShoulder.rotation.z = rest.leftShoulderRotZ - stride * (preset.shoulderRoll ?? 0) * activity;
  }
  if (rightShoulder) {
    rightShoulder.position.y = rest.rightShoulderY + Math.max(0, stride) * (preset.shoulderLift ?? 0) * activity;
    rightShoulder.rotation.z = rest.rightShoulderRotZ - counterStride * (preset.shoulderRoll ?? 0) * activity;
  }
}

function getSpitterRangedConfig(type = ZOMBIE_TYPES.spitter) {
  return type?.ranged ?? ZOMBIE_TYPES.spitter?.ranged ?? null;
}

function removeSlimeProjectile(scene, index) {
  const [shot] = slimeProjectiles.splice(index, 1);
  if (shot?.mesh && scene) scene.remove(shot.mesh);
}

function fireSpitterSlime(scene, zombie, player, ranged = getSpitterRangedConfig()) {
  if (!scene || !zombie?.position || !player?.position || !ranged) return;

  const mouthOrigin = zombie.userData?.futureMouthOrigin ?? new THREE.Vector3(0, 1.56, -.62);
  const start = mouthOrigin.clone();
  zombie.localToWorld(start);

  const target = player.position.clone();
  target.y = CONFIG.player.radius;
  const direction = target.sub(start);
  direction.y *= .35;
  if (direction.lengthSq() < .0001) direction.set(0, 0, -1);
  direction.normalize();

  const mesh = createSlimeProjectileMesh();
  mesh.position.copy(start);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  mesh.userData.spawn = start.clone();
  scene.add(mesh);
  slimeProjectiles.push({
    mesh,
    direction,
    traveled: 0,
    radius: ranged.projectileRadius ?? .34,
    damage: ranged.projectileDamage ?? 10,
    speed: ranged.projectileSpeed ?? 12.5,
    range: ranged.projectileRange ?? 18,
  });
}

function updateSlimeProjectiles(scene, player, delta, onDamage) {
  if (!scene || !Number.isFinite(delta) || delta <= 0) return;
  const hasPlayerPosition = Boolean(player?.position);
  const damagePlayer = typeof onDamage === 'function' ? onDamage : () => {};

  for (let i = slimeProjectiles.length - 1; i >= 0; i--) {
    const shot = slimeProjectiles[i];
    if (!shot?.mesh?.position || !shot.direction || !Number.isFinite(shot.direction.lengthSq?.())) {
      removeSlimeProjectile(scene, i);
      continue;
    }

    const step = (shot.speed ?? 12.5) * delta;
    shot.mesh.position.addScaledVector(shot.direction, step);
    shot.traveled = (shot.traveled ?? 0) + step;
    shot.mesh.rotation.x += delta * 7;
    shot.mesh.rotation.z += delta * 5;

    let hitPlayer = false;
    if (hasPlayerPosition) {
      const hitDistance = Math.hypot(player.position.x - shot.mesh.position.x, player.position.z - shot.mesh.position.z);
      const hitHeight = Math.abs(((player.position.y ?? 0) + CONFIG.player.radius) - shot.mesh.position.y);
      hitPlayer = hitDistance <= CONFIG.player.radius + (shot.radius ?? .34) && hitHeight <= 1.4;
      if (hitPlayer) damagePlayer(shot.damage ?? 10);
    }

    if (hitPlayer || shot.traveled >= (shot.range ?? 18)) {
      removeSlimeProjectile(scene, i);
    }
  }
}

export function updateZombies(scene, player, delta, onDamage) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  updateSlimeProjectiles(scene, player, delta, onDamage);
  if (!scene || !player?.position) return;

  const damagePlayer = typeof onDamage === 'function' ? onDamage : () => {};
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    if (!z?.position || !z.userData) {
      zombies.splice(i, 1);
      if (z && scene) scene.remove(z);
      continue;
    }

    const type = ZOMBIE_TYPES[z.userData.typeKey] ?? ZOMBIE_TYPES.walker;
    const dx = player.position.x - z.position.x;
    const dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    let moveSpeed = type.speed ?? ZOMBIE_TYPES.walker.speed;
    let moveSign = 1;
    let isMoving = dist > CONFIG.player.radius + (type.radius ?? ZOMBIE_TYPES.walker.radius) * .5;

    if (z.userData.typeKey === 'spitter') {
      const ranged = getSpitterRangedConfig(type);
      if (ranged) {
        z.userData.spitCooldown = Math.max(0, z.userData.spitCooldown ?? ranged.cooldown * .55);
        if ((z.userData.spitAttackTimer ?? 0) > 0) {
          z.userData.spitAttackTimer = Math.max(0, z.userData.spitAttackTimer - delta);
          if (!z.userData.spitHasFired && z.userData.spitAttackTimer <= ranged.windupDuration - ranged.fireTime) {
            z.userData.spitHasFired = true;
            fireSpitterSlime(scene, z, player, ranged);
          }
          moveSpeed = 0;
          isMoving = false;
        } else {
          z.userData.spitCooldown = Math.max(0, z.userData.spitCooldown - delta);
          if (dist <= ranged.maxRange && dist >= ranged.tooCloseRange && z.userData.spitCooldown <= 0) {
            z.userData.spitAttackTimer = ranged.windupDuration;
            z.userData.spitHasFired = false;
            z.userData.spitCooldown = ranged.cooldown;
            moveSpeed = 0;
            isMoving = false;
          } else if (dist < ranged.tooCloseRange) {
            moveSign = -1;
            moveSpeed = (type.speed ?? ZOMBIE_TYPES.walker.speed) * (ranged.backAwaySpeedMultiplier ?? .42);
          } else if (dist <= ranged.preferredRange) {
            moveSpeed = 0;
            isMoving = false;
          }
        }
      }
    }

    z.position.x += (dx / dist) * moveSpeed * moveSign * delta;
    z.position.z += (dz / dist) * moveSpeed * moveSign * delta;
    z.rotation.y = Math.atan2(dx, dz) + ZOMBIE_VISUAL_FACING_OFFSET;
    updateZombieMovementAnimation(z, delta, isMoving);
    z.userData.hitTimer = Math.max(0, (z.userData.hitTimer ?? 0) - delta);
    z.userData.hitFlash = Math.max(0, (z.userData.hitFlash ?? 0) - delta);
    const flash = z.userData.hitFlash / .12;
    z.traverse((part) => {
      if (part.isMesh && part.userData.baseColor) part.material.color.copy(part.userData.baseColor).lerp(hitFlashColor, flash);
    });
    if (dist < CONFIG.player.radius + (type.radius ?? ZOMBIE_TYPES.walker.radius) && z.userData.hitTimer <= 0) {
      z.userData.hitTimer = CONFIG.zombie.hitCooldown;
      damagePlayer((type.damage ?? ZOMBIE_TYPES.walker.damage) * (z.userData.damageMultiplier ?? 1));
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
