import * as THREE from 'three';
import { CONFIG } from './config.js';

const gems = [];
const gemGeo = new THREE.OctahedronGeometry(.35, 0);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x3c1a66, roughness: .55 });

export function resetPickups(scene) { gems.splice(0).forEach((g) => scene.remove(g)); }
export function dropXp(scene, position, value = CONFIG.zombie.types.walker.xp) {
  const gem = new THREE.Mesh(gemGeo, gemMat);
  gem.position.copy(position); gem.position.y = .55; gem.userData.value = value;
  gems.push(gem); scene.add(gem);
}

export function updatePickups(scene, player, delta, onCollect) {
  for (let i = gems.length - 1; i >= 0; i--) {
    const gem = gems[i];
    gem.rotation.y += delta * 3;
    const dx = player.position.x - gem.position.x, dz = player.position.z - gem.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    if (dist < CONFIG.xp.magnetRadius) {
      gem.position.x += (dx / dist) * CONFIG.xp.speed * delta;
      gem.position.z += (dz / dist) * CONFIG.xp.speed * delta;
    }
    if (dist < CONFIG.xp.pickupRadius) {
      onCollect(gem.userData.value);
      gems.splice(i, 1); scene.remove(gem);
    }
  }
}
