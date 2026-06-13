import * as THREE from 'three';
import { CONFIG } from './config.js';

const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));

export function createWorld(scene) {
  scene.background = new THREE.Color(0x111827);
  scene.fog = new THREE.Fog(0x111827, 38, 92);
  const hemi = new THREE.HemisphereLight(0xb8ffcf, 0x2a173d, 2.8);
  const sun = new THREE.DirectionalLight(0xc6b7ff, 2.6);
  sun.position.set(10, 22, 8);
  scene.add(hemi, sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize, 8, 8), new THREE.MeshStandardMaterial({ color: 0x263b30, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  [[0, 0, 10, CONFIG.arenaSize, 0x1f2230], [0, 0, CONFIG.arenaSize, 9, 0x202331]].forEach(([x, z, w, d, c]) => {
    const road = box(w, 0.05, d, c); road.position.set(x, 0.03, z); scene.add(road);
  });
  for (let i = -24; i <= 24; i += 8) {
    const crack = box(0.2, 0.08, 2.4, 0x0f1119); crack.position.set(i, 0.09, (i % 16) - 4); crack.rotation.y = Math.random(); scene.add(crack);
  }

  const buildingSpots = [[-20,-17,7,5],[-14,18,5,7],[17,-18,8,5],[20,14,6,7],[-27,7,5,5],[7,24,7,4]];
  buildingSpots.forEach(([x,z,w,d], i) => {
    const ruin = box(w, 2.5 + (i % 3), d, i % 2 ? 0x5d5268 : 0x4b5563);
    ruin.position.set(x, ruin.geometry.parameters.height / 2, z);
    const bite = box(w * 0.45, 1.5, d * 0.35, 0x111827); bite.position.set(x + w * 0.2, ruin.position.y + 1, z - d * 0.25);
    scene.add(ruin, bite);
  });

  for (let i = 0; i < 9; i++) {
    const car = new THREE.Group();
    car.add(box(2.6, .55, 1.35, i % 2 ? 0x8ecae6 : 0xef476f));
    const top = box(1.35, .55, 1, 0x2b2d42); top.position.y = .55; car.add(top);
    car.position.set((Math.random()-.5)*48, .35, (Math.random()-.5)*48);
    car.rotation.y = Math.random() * Math.PI;
    scene.add(car);
  }

  for (let i = 0; i < 30; i++) {
    const prop = new THREE.Group();
    const trunk = box(.25, 1.8, .25, 0x3d2a24); trunk.position.y = .9; prop.add(trunk);
    const branch = box(.18, 1.2, .18, 0x3d2a24); branch.position.set(.35, 1.55, 0); branch.rotation.z = .7; prop.add(branch);
    prop.position.set((Math.random()-.5)*58, 0, (Math.random()-.5)*58);
    if (i % 3 === 0) prop.add(box(2.2, .55, .55, 0x6b5f50));
    scene.add(prop);
  }
}
