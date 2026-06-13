import * as THREE from 'three';
import { CONFIG } from './config.js';

const gems = [];
const healthPickups = [];
const healTexts = [];
let worldHealthTimer = 0;

const gemGeo = new THREE.OctahedronGeometry(.35, 0);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x3c1a66, roughness: .55 });
const healthMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 });
const redMat = new THREE.MeshStandardMaterial({ color: 0xe63946, emissive: 0x3d0508, roughness: .5 });


function nextWorldHealthDelay() {
  const { worldSpawnMin, worldSpawnMax } = CONFIG.healthPickup;
  return THREE.MathUtils.randFloat(worldSpawnMin, worldSpawnMax);
}

function healthMesh() {
  const kit = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(.7, .34, .5), healthMat);
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(.12, .38, .04), redMat); crossA.position.set(0, .03, -.255);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(.36, .12, .04), redMat); crossB.position.set(0, .03, -.28);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(.34, .08, .12), redMat); handle.position.y = .24;
  kit.add(box, crossA, crossB, handle);
  kit.userData.isWorldHealth = false;
  return kit;
}

function showHealText(scene, position, amount) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#123d19';
  ctx.fillStyle = '#7cff8a';
  const label = `+${amount} HP`;
  ctx.strokeText(label, 64, 34); ctx.fillText(label, 64, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(position.x, 2.4, position.z);
  sprite.scale.set(1.8, .68, 1);
  sprite.userData = { life: .8 };
  scene.add(sprite); healTexts.push(sprite);
}

export function resetPickups(scene) {
  gems.splice(0).forEach((g) => scene.remove(g));
  healthPickups.splice(0).forEach((h) => scene.remove(h));
  healTexts.splice(0).forEach((h) => scene.remove(h));
  worldHealthTimer = nextWorldHealthDelay();
}

export function dropXp(scene, position, value = CONFIG.zombie.xp) {
  const gem = new THREE.Mesh(gemGeo, gemMat);
  gem.position.copy(position); gem.position.y = .55; gem.userData.value = value;
  gems.push(gem); scene.add(gem);
}

export function dropHealth(scene, position, isWorldHealth = false) {
  const pickup = healthMesh();
  pickup.position.copy(position); pickup.position.y = .42; pickup.userData.isWorldHealth = isWorldHealth;
  healthPickups.push(pickup); scene.add(pickup);
}

export function maybeDropZombieHealth(scene, position) {
  if (Math.random() < CONFIG.healthPickup.zombieDropChance) dropHealth(scene, position, false);
}

function spawnWorldHealth(scene) {
  const half = CONFIG.arenaSize / 2 - 5;
  dropHealth(scene, new THREE.Vector3(THREE.MathUtils.randFloatSpread(half * 2), 0, THREE.MathUtils.randFloatSpread(half * 2)), true);
}

export function updatePickups(scene, player, delta, onCollectXp, onCollectHealth) {
  worldHealthTimer -= delta;
  const activeWorldHealth = healthPickups.filter((h) => h.userData.isWorldHealth).length;
  if (worldHealthTimer <= 0) {
    if (activeWorldHealth < CONFIG.healthPickup.maxWorldActive) spawnWorldHealth(scene);
    worldHealthTimer = nextWorldHealthDelay();
  }

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
      onCollectXp(gem.userData.value);
      gems.splice(i, 1); scene.remove(gem);
    }
  }

  for (let i = healthPickups.length - 1; i >= 0; i--) {
    const pickup = healthPickups[i];
    pickup.rotation.y += delta * 2.2;
    pickup.position.y = .42 + Math.sin(performance.now() * .004 + i) * .08;
    const dist = Math.hypot(player.position.x - pickup.position.x, player.position.z - pickup.position.z);
    if (dist < CONFIG.healthPickup.pickupRadius) {
      const healed = onCollectHealth();
      if (healed > 0) showHealText(scene, player.position, healed);
      healthPickups.splice(i, 1); scene.remove(pickup);
    }
  }

  for (let i = healTexts.length - 1; i >= 0; i--) {
    const text = healTexts[i];
    text.userData.life -= delta; text.position.y += delta * 1.3; text.material.opacity = Math.max(0, text.userData.life / .8);
    if (text.userData.life <= 0) { text.material.map.dispose(); text.material.dispose(); healTexts.splice(i, 1); scene.remove(text); }
  }
}
