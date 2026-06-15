import * as THREE from 'three';
import { CONFIG } from './config.js';

const pickups = [];
const gemGeo = new THREE.OctahedronGeometry(.35, 0);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x3c1a66, roughness: .55 });
const medkitMaterials = {
  box: new THREE.MeshStandardMaterial({ color: 0xa71925, emissive: 0x260307, roughness: .7 }),
  cross: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45 }),
};

function createMedkitMesh() {
  const kit = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(.9, .34, .62), medkitMaterials.box);
  const crossLong = new THREE.Mesh(new THREE.BoxGeometry(.18, .045, .46), medkitMaterials.cross);
  const crossShort = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .16), medkitMaterials.cross);
  crossLong.position.y = .195;
  crossShort.position.y = .2;
  kit.add(box, crossLong, crossShort);
  kit.userData.baseY = .45;
  return kit;
}

export function resetPickups(scene) { pickups.splice(0).forEach((p) => scene.remove(p)); }
export function dropXp(scene, position, value = CONFIG.zombie.types.walker.xp) {
  const gem = new THREE.Mesh(gemGeo, gemMat);
  gem.position.copy(position); gem.position.y = .55; gem.userData = { kind: 'xp', value };
  pickups.push(gem); scene.add(gem);
}

export function countActiveMedkits() {
  return pickups.filter((p) => p.userData.kind === 'medkit').length;
}

export function dropMedkit(scene, position, source = 'zombie') {
  if (countActiveMedkits() >= CONFIG.medkit.maxActive) return null;
  const medkit = createMedkitMesh();
  medkit.position.copy(position);
  medkit.position.y = medkit.userData.baseY;
  medkit.userData = { ...medkit.userData, kind: 'medkit', source, healAmount: CONFIG.medkit.healAmount, age: Math.random() * Math.PI * 2 };
  pickups.push(medkit); scene.add(medkit);
  return medkit;
}

export function countWorldMedkits() {
  return pickups.filter((p) => p.userData.kind === 'medkit' && p.userData.source === 'world').length;
}

export function updatePickups(scene, player, delta, onCollect, magnetMultiplier = 1) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    pickup.userData.age = (pickup.userData.age ?? 0) + delta;
    pickup.rotation.y += delta * (pickup.userData.kind === 'medkit' ? 1.8 : 3);
    if (pickup.userData.kind === 'medkit') pickup.position.y = pickup.userData.baseY + Math.sin(pickup.userData.age * 3) * .12;
    const dx = player.position.x - pickup.position.x, dz = player.position.z - pickup.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const magnetRadius = CONFIG.xp.magnetRadius * Math.max(0.1, magnetMultiplier);
    if (pickup.userData.kind === 'xp' && dist < magnetRadius) {
      pickup.position.x += (dx / dist) * CONFIG.xp.speed * delta;
      pickup.position.z += (dz / dist) * CONFIG.xp.speed * delta;
    }
    const pickupRadius = pickup.userData.kind === 'medkit' ? CONFIG.medkit.pickupRadius : CONFIG.xp.pickupRadius;
    if (dist < pickupRadius) {
      onCollect(pickup.userData);
      pickups.splice(i, 1); scene.remove(pickup);
    }
  }
}
