import * as THREE from 'three';
import { CONFIG } from './config.js';
import { getMoveVector, isDown, consumePress } from './input.js';

const makeMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });

function part(geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

export function createPlayerModel() {
  const group = new THREE.Group();
  const skin = makeMat(0xf0c89a);
  const red = makeMat(0xc5392e);
  const dark = makeMat(0x2b2b2b);
  const blue = makeMat(0x255b8f);
  const shoe = makeMat(0x171717);
  const white = makeMat(0xf2f2f2);
  const black = makeMat(0x1f2024);
  const backpack = makeMat(0x6b5e3c);
  const batMat = makeMat(0x9a642e);

  const torso = part(new THREE.BoxGeometry(0.86, 1.0, 0.42), dark, [0, 1.28, 0]);
  const jacketL = part(new THREE.BoxGeometry(0.24, 1.03, 0.46), red, [-0.31, 1.28, -0.02]);
  const jacketR = part(new THREE.BoxGeometry(0.24, 1.03, 0.46), red, [0.31, 1.28, -0.02]);
  const head = part(new THREE.BoxGeometry(0.72, 0.66, 0.68), skin, [0, 2.1, -0.02]);
  const hair = part(new THREE.BoxGeometry(0.78, 0.28, 0.7), black, [0, 2.24, 0.02]);
  const capTop = part(new THREE.BoxGeometry(0.74, 0.18, 0.72), white, [0, 2.5, -0.02]);
  const capBack = part(new THREE.BoxGeometry(0.76, 0.24, 0.36), black, [0, 2.39, 0.2]);
  const brim = part(new THREE.BoxGeometry(0.86, 0.09, 0.38), red, [0, 2.35, -0.45]);
  const eyeL = part(new THREE.BoxGeometry(0.08, 0.14, 0.035), black, [-0.16, 2.1, -0.375]);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.16;

  const backpackBox = part(new THREE.BoxGeometry(0.72, 0.82, 0.28), backpack, [0, 1.28, 0.36]);
  const flap = part(new THREE.BoxGeometry(0.78, 0.28, 0.32), backpack, [0, 1.6, 0.38]);
  flap.rotation.x = -0.18;
  const buckle = part(new THREE.BoxGeometry(0.2, 0.18, 0.035), makeMat(0x6b6b6b), [0, 1.22, 0.53]);
  const strapL = part(new THREE.BoxGeometry(0.08, 0.95, 0.08), makeMat(0x3b2e22), [-0.38, 1.31, -0.08], [0.08, 0, 0.08]);
  const strapR = strapL.clone(); strapR.position.x = 0.38; strapR.rotation.z = -0.08;

  const shoulderL = new THREE.Group(); shoulderL.position.set(-0.62, 1.66, -0.02);
  const armL = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), skin, [0, -0.41, 0]);
  const sleeveL = part(new THREE.BoxGeometry(0.28, 0.34, 0.28), red, [0, -0.1, 0]);
  shoulderL.add(armL, sleeveL);

  const shoulderR = new THREE.Group(); shoulderR.position.set(0.62, 1.66, -0.02);
  const armR = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), skin, [0, -0.41, 0]);
  const sleeveR = part(new THREE.BoxGeometry(0.28, 0.34, 0.28), red, [0, -0.1, 0]);
  const handR = part(new THREE.BoxGeometry(0.2, 0.2, 0.2), skin, [0, -0.84, -0.06]);
  const bat = new THREE.Group();
  const handle = part(new THREE.CylinderGeometry(0.055, 0.075, 0.72, 6), batMat, [0, 0, 0]);
  const barrel = part(new THREE.CylinderGeometry(0.18, 0.11, 1.0, 8), batMat, [0, 0.76, 0]);
  bat.add(handle, barrel);
  bat.position.set(0.18, -0.72, -0.28);
  bat.rotation.set(0.95, 0.15, -0.72);
  shoulderR.add(armR, sleeveR, handR, bat);

  const hipL = new THREE.Group(); hipL.position.set(-0.23, 0.9, 0);
  const legL = part(new THREE.BoxGeometry(0.34, 0.82, 0.32), blue, [0, -0.42, 0]);
  const shoeL = part(new THREE.BoxGeometry(0.38, 0.2, 0.42), shoe, [0, -0.8, -0.05]);
  hipL.add(legL, shoeL);
  const hipR = new THREE.Group(); hipR.position.set(0.23, 0.9, 0);
  const legR = part(new THREE.BoxGeometry(0.34, 0.82, 0.32), blue, [0, -0.42, 0]);
  const shoeR = part(new THREE.BoxGeometry(0.38, 0.2, 0.42), shoe, [0, -0.8, -0.05]);
  hipR.add(legR, shoeR);

  group.add(torso, jacketL, jacketR, head, hair, capTop, capBack, brim, eyeL, eyeR, backpackBox, flap, buckle, strapL, strapR, shoulderL, shoulderR, hipL, hipR);
  group.userData.parts = { shoulderL, shoulderR, hipL, hipR, bat };
  group.userData.baseY = 0;
  group.userData.walkTime = 0;
  group.userData.hopVelocity = 0;
  group.userData.hopCooldown = 0;
  group.userData.hopHeight = 0;
  return group;
}
export function createPlayer(scene) {
  const group = createPlayerModel();
  group.userData.velocity = new THREE.Vector3();
  scene.add(group);
  return group;
}

export function updatePlayer(player, delta, attackTimer = 0) {
  const input = getMoveVector();
  const sprint = isDown('shift') ? CONFIG.player.sprintMultiplier : 1;
  const speed = CONFIG.player.speed * sprint;
  player.position.x += input.x * speed * delta;
  player.position.z += input.z * speed * delta;
  const limit = CONFIG.arenaSize / 2 - 2;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);

  const moving = Math.abs(input.x) + Math.abs(input.z) > 0;
  if (moving) player.rotation.y = Math.atan2(input.x, input.z) + Math.PI;
  const parts = player.userData.parts;
  player.userData.walkTime += delta * (moving ? 9.5 : 3.5);
  const stride = moving ? Math.sin(player.userData.walkTime) : 0;
  player.userData.hopCooldown = Math.max(0, player.userData.hopCooldown - delta);
  if (consumePress(' ') && player.userData.hopCooldown <= 0 && player.userData.hopHeight <= 0.01) {
    player.userData.hopVelocity = CONFIG.player.hopVelocity;
    player.userData.hopCooldown = CONFIG.player.hopCooldown;
  }
  player.userData.hopVelocity -= CONFIG.player.gravity * delta;
  player.userData.hopHeight = Math.max(0, (player.userData.hopHeight || 0) + player.userData.hopVelocity * delta);
  if (player.userData.hopHeight <= 0) player.userData.hopVelocity = 0;
  player.position.y = Math.abs(stride) * (moving ? 0.08 : 0.015) + player.userData.hopHeight;
  parts.shoulderL.rotation.x = stride * 0.46;
  parts.shoulderR.rotation.x = -stride * 0.34;
  parts.hipL.rotation.x = -stride * 0.48;
  parts.hipR.rotation.x = stride * 0.48;

  const swing = Math.max(0, attackTimer / CONFIG.pulse.visualDuration);
  if (swing > 0) {
    const a = Math.sin((1 - swing) * Math.PI);
    parts.bat.rotation.set(0.55 + a * 1.45, -0.65 + a * 1.1, -1.05 + a * 1.75);
    parts.shoulderR.rotation.x = -0.55 - a * 0.7;
  } else {
    parts.bat.rotation.set(0.95, 0.15, -0.72);
  }
}
