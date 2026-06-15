import * as THREE from 'three';
import { CONFIG } from './config.js';
import { findSafeSpawnPositionNear } from './world.js';

const pickups = [];
const gemGeo = new THREE.OctahedronGeometry(.35, 0);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x3c1a66, roughness: .55 });
const coinGeo = new THREE.CylinderGeometry(.32, .32, .12, 14);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0x6d4200, metalness: .25, roughness: .42 });
const scrapRushMaterials = {
  core: new THREE.MeshStandardMaterial({ color: 0x63f6ff, emissive: 0x1ea9bf, roughness: .35 }),
  magnet: new THREE.MeshStandardMaterial({ color: 0xffe66d, emissive: 0x7a5d00, roughness: .45 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x74fff2, transparent: true, opacity: .28 }),
};
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

function createScrapRushMesh() {
  const group = new THREE.Group();
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.62, 14, 10), scrapRushMaterials.glow);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.4, 0), scrapRushMaterials.core);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.72, .16, .16), scrapRushMaterials.magnet);
  const left = new THREE.Mesh(new THREE.BoxGeometry(.16, .42, .16), scrapRushMaterials.magnet);
  const right = left.clone();
  bar.position.y = .1;
  left.position.set(-.28, -.1, 0);
  right.position.set(.28, -.1, 0);
  group.add(glow, core, bar, left, right);
  group.userData.baseY = .72;
  return group;
}

export function resetPickups(scene) { pickups.splice(0).forEach((p) => scene.remove(p)); }

export function dropXp(scene, position, value = CONFIG.zombie.types.walker.xp) {
  const gem = new THREE.Mesh(gemGeo, gemMat);
  const safePosition = findSafeSpawnPositionNear(position.x, position.z, 0.35, 10);
  gem.position.copy(safePosition); gem.position.y = .55; gem.userData = { kind: 'xp', value, rushing: false };
  pickups.push(gem); scene.add(gem);
  return gem;
}

export function dropCoin(scene, position, value = 1) {
  const coin = new THREE.Mesh(coinGeo, coinMat);
  const safePosition = findSafeSpawnPositionNear(position.x, position.z, 0.35, 10);
  coin.position.copy(safePosition); coin.position.y = .46; coin.rotation.x = Math.PI / 2;
  coin.userData = { kind: 'coin', value, rushing: false };
  pickups.push(coin); scene.add(coin);
  return coin;
}

export function dropScrapRush(scene, position) {
  const scrapRush = createScrapRushMesh();
  const safePosition = findSafeSpawnPositionNear(position.x, position.z, 0.55, 14);
  scrapRush.position.copy(safePosition);
  scrapRush.position.y = scrapRush.userData.baseY;
  scrapRush.userData = { ...scrapRush.userData, kind: 'scrapRush', age: Math.random() * Math.PI * 2 };
  pickups.push(scrapRush); scene.add(scrapRush);
  return scrapRush;
}

export function triggerScrapRush() {
  pickups.forEach((pickup) => {
    if (pickup.userData.kind === 'xp' || pickup.userData.kind === 'coin') pickup.userData.rushing = true;
  });
}

export function countActiveMedkits() {
  return pickups.filter((p) => p.userData.kind === 'medkit').length;
}

export function dropMedkit(scene, position, source = 'zombie') {
  if (countActiveMedkits() >= CONFIG.medkit.maxActive) return null;
  const medkit = createMedkitMesh();
  const safePosition = findSafeSpawnPositionNear(position.x, position.z, 0.55, source === 'world' ? 32 : 14);
  medkit.position.copy(safePosition);
  medkit.position.y = medkit.userData.baseY;
  medkit.userData = { ...medkit.userData, kind: 'medkit', source, healAmount: CONFIG.medkit.healAmount, age: Math.random() * Math.PI * 2 };
  pickups.push(medkit); scene.add(medkit);
  return medkit;
}

export function countWorldMedkits() {
  return pickups.filter((p) => p.userData.kind === 'medkit' && p.userData.source === 'world').length;
}

function moveTowardPlayer(pickup, player, dist, dx, dz, speed, delta) {
  pickup.position.x += (dx / dist) * speed * delta;
  pickup.position.z += (dz / dist) * speed * delta;
}

export function updatePickups(scene, player, delta, onCollect, magnetMultiplier = 1) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    const kind = pickup.userData.kind;
    pickup.userData.age = (pickup.userData.age ?? 0) + delta;
    pickup.rotation.y += delta * (kind === 'medkit' ? 1.8 : kind === 'scrapRush' ? 4.8 : 3);
    if (kind === 'coin') pickup.rotation.z += delta * 5;
    if (kind === 'medkit' || kind === 'scrapRush') pickup.position.y = pickup.userData.baseY + Math.sin(pickup.userData.age * 3) * .12;
    const dx = player.position.x - pickup.position.x, dz = player.position.z - pickup.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const magnetScale = Math.max(0.1, magnetMultiplier);
    if (pickup.userData.rushing && (kind === 'xp' || kind === 'coin')) {
      moveTowardPlayer(pickup, player, dist, dx, dz, CONFIG.scrapRush.speed, delta);
    } else if (kind === 'xp' && dist < CONFIG.xp.magnetRadius * magnetScale) {
      moveTowardPlayer(pickup, player, dist, dx, dz, CONFIG.xp.speed, delta);
    } else if (kind === 'coin' && dist < CONFIG.coin.magnetRadius * magnetScale) {
      moveTowardPlayer(pickup, player, dist, dx, dz, CONFIG.coin.speed, delta);
    }
    const basePickupRadius = kind === 'medkit' ? CONFIG.medkit.pickupRadius : kind === 'scrapRush' ? CONFIG.scrapRush.pickupRadius : kind === 'coin' ? CONFIG.coin.pickupRadius : CONFIG.xp.pickupRadius;
    const pickupRadius = (kind === 'xp' || kind === 'coin') ? basePickupRadius * magnetScale : basePickupRadius;
    if (dist < pickupRadius) {
      onCollect(pickup.userData);
      pickups.splice(i, 1); scene.remove(pickup);
    }
  }
}
