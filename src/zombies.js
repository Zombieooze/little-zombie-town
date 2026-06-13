import * as THREE from 'three';
import { CONFIG } from './config.js';

const zombies = [];
const mat = new THREE.MeshStandardMaterial({ color: 0x78c850, roughness: 0.85 });
const shirt = new THREE.MeshStandardMaterial({ color: 0x6d5bd0, roughness: 0.85 });

function zombieMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 1.1, .55), shirt); body.position.y = 1;
  const head = new THREE.Mesh(new THREE.BoxGeometry(.72, .72, .72), mat); head.position.y = 1.9;
  const arm1 = new THREE.Mesh(new THREE.BoxGeometry(.25, .8, .25), mat); arm1.position.set(.65, 1.15, -.2); arm1.rotation.x = 1.1;
  const arm2 = arm1.clone(); arm2.position.x = -.65;
  g.add(body, head, arm1, arm2);
  g.userData = { health: CONFIG.zombie.health, hitTimer: 0 };
  return g;
}

export function resetZombies(scene) { zombies.splice(0).forEach((z) => scene.remove(z)); }
export function getZombies() { return zombies; }

export function spawnZombie(scene) {
  if (zombies.length >= CONFIG.zombie.maxAlive) return;
  const z = zombieMesh();
  const edge = Math.floor(Math.random() * 4), half = CONFIG.arenaSize / 2 + 2, roll = (Math.random() - .5) * CONFIG.arenaSize;
  z.position.set(edge < 2 ? (edge === 0 ? -half : half) : roll, 0, edge >= 2 ? (edge === 2 ? -half : half) : roll);
  zombies.push(z); scene.add(z);
}

export function updateZombies(player, delta, onDamage) {
  for (const z of zombies) {
    const dx = player.position.x - z.position.x, dz = player.position.z - z.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    z.position.x += (dx / dist) * CONFIG.zombie.speed * delta;
    z.position.z += (dz / dist) * CONFIG.zombie.speed * delta;
    z.rotation.y = Math.atan2(dx, dz);
    z.userData.hitTimer = Math.max(0, z.userData.hitTimer - delta);
    if (dist < CONFIG.player.radius + CONFIG.zombie.radius && z.userData.hitTimer <= 0) {
      z.userData.hitTimer = CONFIG.zombie.hitCooldown;
      onDamage(CONFIG.zombie.damage);
    }
  }
}

export function damageZombies(scene, origin, range, damage, onKilled, onHit = () => {}) {
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const dist = Math.hypot(origin.x - z.position.x, origin.z - z.position.z);
    if (dist <= range) {
      z.userData.health -= damage;
      onHit(z.position.clone());
      z.scale.setScalar(1.15);
      if (z.userData.health <= 0) {
        zombies.splice(i, 1);
        scene.remove(z);
        onKilled(z.position.clone());
      }
    }
  }
}
