import * as THREE from 'three';
import { CONFIG } from './config.js';

const COLORS = {
  grass: 0x263b30,
  grassAlt: 0x315239,
  road: 0x1f2230,
  roadMarking: 0xd8d3a3,
  sidewalk: 0x747b82,
  pavement: 0x4b5563,
  parking: 0x39414b,
  dirt: 0x5a4632,
  junk: 0x3f3b36,
  path: 0xb8a06a,
  schoolField: 0x426f37,
  buildingA: 0x5d5268,
  buildingB: 0x4b5563,
  house: 0x7a5a48,
  roof: 0x2b2d42,
};

const SURFACE_Y = {
  ground: 0,
  zone: 0.022,
  detail: 0.034,
  road: 0.052,
  sidewalk: 0.078,
  marking: 0.108,
};

const SURFACE_THICKNESS = 0.04;

const makeMat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });
const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeMat(color));

function slab(scene, x, z, w, d, color, y = SURFACE_Y.zone) {
  const mesh = box(w, SURFACE_THICKNESS, d, color);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function districtDetailSlab(scene, x, z, w, d, color) {
  return slab(scene, x, z, w, d, color, SURFACE_Y.detail);
}

function roadSlab(scene, x, z, w, d, color = COLORS.road) {
  return slab(scene, x, z, w, d, color, SURFACE_Y.road);
}

function sidewalkSlab(scene, x, z, w, d, color = COLORS.sidewalk) {
  return slab(scene, x, z, w, d, color, SURFACE_Y.sidewalk);
}

function stripe(scene, x, z, w, d, color = COLORS.roadMarking) {
  return slab(scene, x, z, w, d, color, SURFACE_Y.marking);
}

function building(scene, x, z, w, d, h, color = COLORS.buildingA) {
  const base = box(w, h, d, color);
  base.position.set(x, h / 2, z);
  const roof = box(w + 0.35, 0.22, d + 0.35, COLORS.roof);
  roof.position.set(x, h + 0.12, z);
  scene.add(base, roof);
}

function lotLabel(scene, text, x, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7f3d0';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 5;
  ctx.strokeText(text, 128, 40);
  ctx.fillText(text, 128, 40);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.position.set(x, 1.7, z);
  sprite.scale.set(7, 1.75, 1);
  scene.add(sprite);
}

function addRoadNetwork(scene) {
  // Major cross-town roads through downtown plus side connectors.
  [[0, 0, CONFIG.arenaSize, 10], [0, 0, 10, CONFIG.arenaSize], [-55, 0, 8, 156], [55, 0, 8, 156], [0, -56, 126, 8], [0, 56, 126, 8], [-82, 31, 8, 78], [82, -34, 8, 88], [-34, -84, 66, 7], [34, 84, 66, 7]].forEach(([x, z, w, d]) => roadSlab(scene, x, z, w, d));

  // Sidewalk shoulders are segmented so they stay beside roads and leave clean road space at intersections.
  const horizontalSidewalks = [
    [-87, -7, 46, 2], [-24, -7, 38, 2], [24, -7, 38, 2], [87, -7, 46, 2],
    [-87, 7, 46, 2], [-24, 7, 38, 2], [24, 7, 38, 2], [87, 7, 46, 2],
    [-29, -50.5, 42, 1.4], [29, -50.5, 42, 1.4], [-29, -61.5, 42, 1.4], [29, -61.5, 42, 1.4],
    [-29, 50.5, 42, 1.4], [29, 50.5, 42, 1.4], [-29, 61.5, 42, 1.4], [29, 61.5, 42, 1.4],
    [-34, -79.5, 42, 1.2], [-34, -88.5, 42, 1.2], [34, 79.5, 42, 1.2], [34, 88.5, 42, 1.2],
  ];
  const verticalSidewalks = [
    [-7, -87, 2, 46], [-7, -24, 2, 38], [-7, 24, 2, 38], [-7, 87, 2, 46],
    [7, -87, 2, 46], [7, -24, 2, 38], [7, 24, 2, 38], [7, 87, 2, 46],
    [-49.5, -30, 1.4, 42], [-60.5, -30, 1.4, 42], [-49.5, 30, 1.4, 42], [-60.5, 30, 1.4, 42],
    [49.5, -30, 1.4, 42], [60.5, -30, 1.4, 42], [49.5, 30, 1.4, 42], [60.5, 30, 1.4, 42],
    [-76.5, 31, 1.4, 46], [-87.5, 31, 1.4, 46], [76.5, -34, 1.4, 52], [87.5, -34, 1.4, 52],
  ];
  [...horizontalSidewalks, ...verticalSidewalks].forEach(([x, z, w, d]) => sidewalkSlab(scene, x, z, w, d));

  for (let i = -96; i <= 96; i += 16) {
    stripe(scene, i, 0, 5, 0.25);
    stripe(scene, 0, i, 0.25, 5);
  }

  // Simple crosswalks mark intersections without using sidewalk slabs across the road lanes.
  [-55, 0, 55].forEach((x) => {
    stripe(scene, x - 2.5, 0, 0.35, 7, 0xcfd3d6);
    stripe(scene, x + 2.5, 0, 0.35, 7, 0xcfd3d6);
  });
  [-56, 0, 56].forEach((z) => {
    stripe(scene, 0, z - 2.5, 7, 0.35, 0xcfd3d6);
    stripe(scene, 0, z + 2.5, 7, 0.35, 0xcfd3d6);
  });
}

function addDistricts(scene) {
  // Downtown core.
  roadSlab(scene, 0, 0, 42, 42, COLORS.pavement);
  [[-15,-15,9,10,5],[0,-16,10,8,4],[16,-13,8,12,5],[-15,14,8,11,4],[3,15,14,8,5],[18,13,7,10,4]].forEach((b, i) => building(scene, ...b, i % 2 ? COLORS.buildingA : COLORS.buildingB));
  lotLabel(scene, 'DOWNTOWN', 0, 0);

  // Park northwest with crossing paths.
  slab(scene, -76, 70, 50, 42, COLORS.grassAlt);
  sidewalkSlab(scene, -76, 70, 48, 4, COLORS.path);
  sidewalkSlab(scene, -76, 70, 4, 40, COLORS.path);
  for (let i = 0; i < 14; i++) addTree(scene, -98 + (i % 5) * 11, 53 + Math.floor(i / 5) * 13);
  lotLabel(scene, 'PARK', -76, 70);

  // School campus northeast.
  slab(scene, 73, 68, 54, 40, COLORS.schoolField);
  roadSlab(scene, 61, 70, 25, 20, COLORS.pavement);
  districtDetailSlab(scene, 89, 68, 19, 25, 0x355f31);
  building(scene, 56, 70, 18, 12, 3.5, 0x7b6656);
  lotLabel(scene, 'SCHOOL', 73, 68);

  // Residential neighborhood southwest grid.
  slab(scene, -75, -68, 52, 50, COLORS.grassAlt);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const x = -96 + c * 20, z = -82 + r * 24;
    districtDetailSlab(scene, x, z + 6, 12, 8, COLORS.grass);
    sidewalkSlab(scene, x, z - 1, 4, 8, COLORS.pavement);
    building(scene, x, z + 6, 7, 6, 2.6, COLORS.house);
  }
  lotLabel(scene, 'RESIDENTIAL', -75, -68);

  // Denser apartments/townhomes southeast.
  roadSlab(scene, 68, -75, 48, 45, COLORS.parking);
  [-10, 5, 20].forEach((offset) => building(scene, 68 + offset, -76, 8, 25, 4.5, 0x60546a));
  for (let x = 48; x <= 88; x += 8) stripe(scene, x, -55, 0.25, 6, 0xcfd3d6);
  lotLabel(scene, 'APARTMENTS', 68, -75);

  // Civic, industrial, gas districts.
  roadSlab(scene, -28, 68, 30, 22, COLORS.pavement); building(scene, -31, 69, 14, 10, 3.2, 0x4d6178); lotLabel(scene, 'POLICE', -28, 68);
  roadSlab(scene, 28, 68, 30, 22, COLORS.pavement); building(scene, 26, 69, 16, 10, 3.1, 0x8b3d32); lotLabel(scene, 'FIRE', 28, 68);
  slab(scene, -86, -5, 36, 48, COLORS.junk); districtDetailSlab(scene, -87, -4, 28, 36, COLORS.dirt); addScrap(scene, -86, -5); lotLabel(scene, 'JUNKYARD', -86, -5);
  roadSlab(scene, 86, 21, 34, 28, COLORS.parking); building(scene, 92, 25, 11, 8, 2.4, 0x72634a); roadSlab(scene, 78, 17, 10, 7, 0x9a2f2f); lotLabel(scene, 'GAS', 86, 21);
  slab(scene, 83, -5, 32, 22, COLORS.grassAlt); building(scene, 77, -6, 7, 6, 2.4, COLORS.house); building(scene, 91, -5, 7, 6, 2.4, COLORS.house);
}

function addTree(scene, x, z) {
  const group = new THREE.Group();
  const trunk = box(.35, 1.8, .35, 0x3d2a24); trunk.position.y = .9; group.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.7, 7), makeMat(0x2f7d3c)); crown.position.y = 2.5; group.add(crown);
  group.position.set(x, 0, z); scene.add(group);
}

function addScrap(scene, cx, cz) {
  for (let i = 0; i < 20; i++) {
    const s = box(1 + Math.random() * 2, .25 + Math.random() * .65, .6 + Math.random() * 1.8, i % 2 ? 0x7a6f64 : 0x57534e);
    s.position.set(cx + (Math.random() - .5) * 28, .18, cz + (Math.random() - .5) * 36);
    s.rotation.y = Math.random() * Math.PI;
    scene.add(s);
  }
}

function addFillerCars(scene) {
  for (let i = 0; i < 18; i++) {
    const car = new THREE.Group();
    car.add(box(2.6, .55, 1.35, i % 2 ? 0x8ecae6 : 0xef476f));
    const top = box(1.35, .55, 1, 0x2b2d42); top.position.y = .55; car.add(top);
    car.position.set((Math.random() - .5) * 160, .35, (Math.random() - .5) * 160);
    car.rotation.y = Math.random() * Math.PI;
    scene.add(car);
  }
}

export function createWorld(scene) {
  scene.background = new THREE.Color(0x111827);
  scene.fog = new THREE.Fog(0x111827, 78, 185);
  const hemi = new THREE.HemisphereLight(0xb8ffcf, 0x2a173d, 2.8);
  const sun = new THREE.DirectionalLight(0xc6b7ff, 2.6);
  sun.position.set(10, 22, 8);
  scene.add(hemi, sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.arenaSize, CONFIG.arenaSize, 10, 10), makeMat(COLORS.grass, 1));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  addRoadNetwork(scene);
  addDistricts(scene);
  addFillerCars(scene);
}
