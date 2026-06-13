import * as THREE from 'three';
import { CONFIG } from './config.js';
import { getMoveVector, isDown } from './input.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcf9f, roughness: 0.8 });
  const backpackMat = new THREE.MeshStandardMaterial({ color: 0xf9c74f, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.55), bodyMat);
  body.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), skinMat);
  head.position.y = 2.15;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.25), backpackMat);
  pack.position.set(0, 1.18, 0.4);
  group.add(body, head, pack);
  group.userData.velocity = new THREE.Vector3();
  scene.add(group);
  return group;
}

export function updatePlayer(player, delta) {
  const input = getMoveVector();
  const sprint = isDown('shift') ? CONFIG.player.sprintMultiplier : 1;
  const speed = CONFIG.player.speed * sprint;
  player.position.x += input.x * speed * delta;
  player.position.z += input.z * speed * delta;
  const limit = CONFIG.arenaSize / 2 - 2;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);
  if (input.x || input.z) player.rotation.y = Math.atan2(input.x, input.z);
}
