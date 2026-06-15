import * as THREE from 'three';
import { CONFIG } from './config.js';
import { consumePress, consumeGamepadPress, getMoveVector, isDown } from './input.js';

const makeMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
// Character art faces local -Z; movement rotation math points local +Z, so keep visuals flipped once here.
const PLAYER_VISUAL_FACING_OFFSET = Math.PI;
const BAT_IDLE_POSITION = new THREE.Vector3(0, -0.82, -0.06);
const BAT_IDLE_ROTATION = new THREE.Euler(0, 1.57, 0.22);

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

  const armL = new THREE.Group();
  armL.position.set(-0.62, 1.64, -0.02);
  const sleeveL = part(new THREE.BoxGeometry(0.28, 0.34, 0.28), red, [0, -0.12, 0]);
  const forearmL = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), skin, [0, -0.47, 0]);
  armL.add(sleeveL, forearmL);

  const armR = new THREE.Group();
  armR.position.set(0.62, 1.64, -0.02);
  const sleeveR = part(new THREE.BoxGeometry(0.28, 0.34, 0.28), red, [0, -0.12, 0]);
  const forearmR = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), skin, [0, -0.47, 0]);
  const handR = part(new THREE.BoxGeometry(0.2, 0.2, 0.2), skin, [0, -0.82, -0.06]);
  armR.add(sleeveR, forearmR, handR);

  const legL = new THREE.Group();
  legL.position.set(-0.23, 0.88, 0);
  const pantsL = part(new THREE.BoxGeometry(0.34, 0.82, 0.32), blue, [0, -0.4, 0]);
  const shoeL = part(new THREE.BoxGeometry(0.38, 0.2, 0.42), shoe, [0, -0.78, -0.05]);
  legL.add(pantsL, shoeL);

  const legR = new THREE.Group();
  legR.position.set(0.23, 0.88, 0);
  const pantsR = part(new THREE.BoxGeometry(0.34, 0.82, 0.32), blue, [0, -0.4, 0]);
  const shoeR = part(new THREE.BoxGeometry(0.38, 0.2, 0.42), shoe, [0, -0.78, -0.05]);
  legR.add(pantsR, shoeR);

  const bat = new THREE.Group();
  // Keep the bat's local origin at the hand grip so arm rotation swings the barrel naturally.
  // Cylinders are built along local X so the idle bat sits sideways instead of hanging down.
  const knob = part(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 6), batMat, [-0.08, 0, 0], [0, 0, Math.PI / 2]);
  const handle = part(new THREE.CylinderGeometry(0.055, 0.07, 0.42, 6), batMat, [0.17, 0, 0], [0, 0, Math.PI / 2]);
  const barrel = part(new THREE.CylinderGeometry(0.07, 0.17, 0.82, 8), batMat, [0.76, 0, 0], [0, 0, Math.PI / 2]);
  const endCap = part(new THREE.CylinderGeometry(0.17, 0.08, 0.06, 8), batMat, [1.2, 0, 0], [0, 0, Math.PI / 2]);
  bat.add(knob, handle, barrel, endCap);
  bat.position.copy(BAT_IDLE_POSITION);
  bat.rotation.copy(BAT_IDLE_ROTATION);
  armR.add(bat);

  group.add(torso, jacketL, jacketR, head, hair, capTop, capBack, brim, eyeL, eyeR, backpackBox, flap, buckle, strapL, strapR, armL, armR, legL, legR);
  group.userData.parts = { armL, armR, sleeveL, sleeveR, legL, legR, bat };
  group.userData.baseY = 0;
  group.userData.walkTime = 0;
  group.userData.jumpY = 0;
  group.userData.jumpVelocity = 0;
  group.userData.grounded = true;
  group.userData.landingTimer = 0;
  return group;
}

export function createPlayer(scene) {
  const group = createPlayerModel();
  group.userData.velocity = new THREE.Vector3();
  scene.add(group);
  return group;
}

export function updatePlayer(player, delta, attackTimer = 0, cameraYaw = 0, speedMultiplier = 1, sprintSpeedMultiplier = 1) {
  if ((consumePress(' ') || consumeGamepadPress('a')) && player.userData.grounded) {
    player.userData.jumpVelocity = CONFIG.player.jumpVelocity;
    player.userData.grounded = false;
  }

  const input = getMoveVector();
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  const moveX = input.x * cos + input.z * sin;
  const moveZ = input.z * cos - input.x * sin;
  const sprint = isDown('shift') ? CONFIG.player.sprintMultiplier * Math.max(0.1, sprintSpeedMultiplier) : 1;
  const speed = CONFIG.player.speed * Math.max(0.1, speedMultiplier) * sprint;
  player.position.x += moveX * speed * delta;
  player.position.z += moveZ * speed * delta;
  const limit = CONFIG.arenaSize / 2 - 2;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);

  const moving = Math.abs(input.x) + Math.abs(input.z) > 0;
  if (moving) player.rotation.y = Math.atan2(moveX, moveZ) + PLAYER_VISUAL_FACING_OFFSET;
  const parts = player.userData.parts;
  const wasGrounded = player.userData.grounded;
  if (!player.userData.grounded) {
    player.userData.jumpVelocity -= CONFIG.player.gravity * delta;
    player.userData.jumpY = Math.max(0, player.userData.jumpY + player.userData.jumpVelocity * delta);
    if (player.userData.jumpY <= 0 && player.userData.jumpVelocity <= 0) {
      player.userData.jumpY = 0;
      player.userData.jumpVelocity = 0;
      player.userData.grounded = true;
      if (!wasGrounded) player.userData.landingTimer = 0.12;
    }
  }
  player.userData.landingTimer = Math.max(0, player.userData.landingTimer - delta);

  const grounded = player.userData.grounded;
  player.userData.walkTime += delta * (moving ? 10.45 : 3.5);
  const stride = moving ? Math.sin(player.userData.walkTime) : 0;
  const groundBob = grounded ? Math.abs(stride) * (moving ? 0.08 : 0.015) : 0;
  const landingDip = player.userData.landingTimer > 0
    ? Math.sin((player.userData.landingTimer / 0.12) * Math.PI) * CONFIG.player.landingDip
    : 0;
  player.position.y = player.userData.jumpY + groundBob - landingDip;
  parts.armL.rotation.x = grounded ? stride * 0.38 : -0.18;
  parts.armR.rotation.x = grounded ? -stride * 0.28 : -0.12;
  parts.legL.rotation.x = grounded ? -stride * 0.38 : 0.48;
  parts.legR.rotation.x = grounded ? stride * 0.38 : 0.48;
  parts.legL.rotation.z = grounded ? 0 : -0.08;
  parts.legR.rotation.z = grounded ? 0 : 0.08;

  const swing = Math.max(0, attackTimer / CONFIG.pulse.visualDuration);
  if (swing > 0) {
    const progress = 1 - swing;
    const eased = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    const followThrough = Math.sin(progress * Math.PI);
    parts.armR.rotation.x = THREE.MathUtils.lerp(1.45, 0.25, eased) - followThrough * 0.08;
    parts.armR.rotation.y = THREE.MathUtils.lerp(0.0, 0.0, eased);
    parts.armR.rotation.z = THREE.MathUtils.lerp(0.45, 0.0, eased) - followThrough * 0.08;
    parts.bat.position.copy(BAT_IDLE_POSITION);
    parts.bat.rotation.copy(BAT_IDLE_ROTATION);
  } else {
    parts.armR.rotation.y = 0;
    parts.armR.rotation.z = 0;
    parts.bat.position.copy(BAT_IDLE_POSITION);
    parts.bat.rotation.copy(BAT_IDLE_ROTATION);
  }
}
