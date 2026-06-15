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
const REFERENCE_ARENA_SIZE = 220;
const TOWN_SCALE = CONFIG.arenaSize / REFERENCE_ARENA_SIZE;
const town = (value) => value * TOWN_SCALE;

const worldColliders = [];

export function resetWorldColliders() {
  worldColliders.length = 0;
}

export function getWorldColliders() {
  return worldColliders;
}

export function registerWorldCollider(collider) {
  if (!collider || !Number.isFinite(collider.x) || !Number.isFinite(collider.z)) return null;
  const type = collider.type === 'circle' ? 'circle' : 'rect';
  const normalized = type === 'circle'
    ? { type, x: collider.x, z: collider.z, radius: Math.max(0, collider.radius ?? 0), label: collider.label ?? 'world' }
    : { type, x: collider.x, z: collider.z, width: Math.max(0, collider.width ?? 0), depth: Math.max(0, collider.depth ?? 0), label: collider.label ?? 'world' };
  worldColliders.push(normalized);
  return normalized;
}

export function isPositionBlocked(x, z, radius = 0) {
  return worldColliders.some((collider) => getColliderPushOut(x, z, radius, collider));
}

function getColliderPushOut(x, z, radius, collider) {
  if (collider.type === 'circle') {
    const dx = x - collider.x;
    const dz = z - collider.z;
    const minDist = (collider.radius ?? 0) + radius;
    const dist = Math.hypot(dx, dz);
    if (dist >= minDist) return null;
    if (dist > 0.0001) return { x: (dx / dist) * (minDist - dist), z: (dz / dist) * (minDist - dist) };
    return { x: minDist, z: 0 };
  }

  const halfW = collider.width / 2;
  const halfD = collider.depth / 2;
  const closestX = THREE.MathUtils.clamp(x, collider.x - halfW, collider.x + halfW);
  const closestZ = THREE.MathUtils.clamp(z, collider.z - halfD, collider.z + halfD);
  const dx = x - closestX;
  const dz = z - closestZ;
  const dist = Math.hypot(dx, dz);
  if (dist > 0.0001 && dist < radius) return { x: (dx / dist) * (radius - dist), z: (dz / dist) * (radius - dist) };
  if (x < collider.x - halfW || x > collider.x + halfW || z < collider.z - halfD || z > collider.z + halfD) return null;

  const left = Math.abs(x - (collider.x - halfW));
  const right = Math.abs((collider.x + halfW) - x);
  const bottom = Math.abs(z - (collider.z - halfD));
  const top = Math.abs((collider.z + halfD) - z);
  const min = Math.min(left, right, bottom, top);
  if (min === left) return { x: -(left + radius), z: 0 };
  if (min === right) return { x: right + radius, z: 0 };
  if (min === bottom) return { x: 0, z: -(bottom + radius) };
  return { x: 0, z: top + radius };
}

export function resolveWorldCollision(position, radius = 0) {
  if (!position) return position;
  const limit = CONFIG.arenaSize / 2 - Math.max(0, radius);
  position.x = THREE.MathUtils.clamp(position.x, -limit, limit);
  position.z = THREE.MathUtils.clamp(position.z, -limit, limit);

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const collider of worldColliders) {
      const push = getColliderPushOut(position.x, position.z, radius, collider);
      if (!push) continue;
      position.x += push.x;
      position.z += push.z;
      position.x = THREE.MathUtils.clamp(position.x, -limit, limit);
      position.z = THREE.MathUtils.clamp(position.z, -limit, limit);
      moved = true;
    }
    if (!moved) break;
  }
  return position;
}

export function isPickupSpawnSafe(x, z, radius = 0.7) {
  const limit = CONFIG.arenaSize / 2 - Math.max(1, radius);
  return x >= -limit && x <= limit && z >= -limit && z <= limit && !isPositionBlocked(x, z, radius);
}

export function findSafeSpawnPositionNear(x, z, radius = 0.7, attempts = 24) {
  const limit = CONFIG.arenaSize / 2 - Math.max(1, radius);
  const candidate = new THREE.Vector3(THREE.MathUtils.clamp(x, -limit, limit), 0, THREE.MathUtils.clamp(z, -limit, limit));
  if (isPickupSpawnSafe(candidate.x, candidate.z, radius)) return candidate;

  for (let i = 0; i < attempts; i++) {
    const ring = 1.5 + Math.floor(i / 8) * 2.2;
    const angle = (i * 2.399963229728653) + Math.random() * 0.35;
    candidate.set(
      THREE.MathUtils.clamp(x + Math.cos(angle) * ring, -limit, limit),
      0,
      THREE.MathUtils.clamp(z + Math.sin(angle) * ring, -limit, limit),
    );
    if (isPickupSpawnSafe(candidate.x, candidate.z, radius)) return candidate.clone();
  }
  candidate.set(THREE.MathUtils.clamp(x, -limit, limit), 0, THREE.MathUtils.clamp(z, -limit, limit));
  resolveWorldCollision(candidate, radius);
  return candidate;
}

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

function townSlab(scene, x, z, w, d, color, y = SURFACE_Y.zone) {
  return slab(scene, town(x), town(z), town(w), town(d), color, y);
}

function townDistrictDetailSlab(scene, x, z, w, d, color) {
  return townSlab(scene, x, z, w, d, color, SURFACE_Y.detail);
}

function townRoadSlab(scene, x, z, w, d, color = COLORS.road) {
  return townSlab(scene, x, z, w, d, color, SURFACE_Y.road);
}

function townSidewalkSlab(scene, x, z, w, d, color = COLORS.sidewalk) {
  return townSlab(scene, x, z, w, d, color, SURFACE_Y.sidewalk);
}

function townStripe(scene, x, z, w, d, color = COLORS.roadMarking) {
  return townSlab(scene, x, z, w, d, color, SURFACE_Y.marking);
}

function building(scene, x, z, w, d, h, color = COLORS.buildingA) {
  const base = box(w, h, d, color);
  base.position.set(x, h / 2, z);
  const roof = box(w + 0.35, 0.22, d + 0.35, COLORS.roof);
  roof.position.set(x, h + 0.12, z);
  scene.add(base, roof);
  registerWorldCollider({ type: 'rect', x, z, width: w, depth: d, label: 'building' });
}

function townBuilding(scene, x, z, w, d, h, color = COLORS.buildingA) {
  building(scene, town(x), town(z), town(w), town(d), h, color);
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
  sprite.scale.set(7 * TOWN_SCALE, 1.75 * TOWN_SCALE, 1);
  scene.add(sprite);
}

function townLotLabel(scene, text, x, z) {
  lotLabel(scene, text, town(x), town(z));
}

function addRoadNetwork(scene) {
  // Reference-map street grid: downtown is the center block, with north/south collectors and
  // east/west streets that deliberately frame the surrounding district lots.
  [
    [0, 0, REFERENCE_ARENA_SIZE, 10],
    [0, 0, 10, REFERENCE_ARENA_SIZE],
    [-55, 0, 8, REFERENCE_ARENA_SIZE],
    [55, 0, 8, REFERENCE_ARENA_SIZE],
    [82, 20, 8, 118],
    [0, 56, REFERENCE_ARENA_SIZE, 8],
    [0, -56, REFERENCE_ARENA_SIZE, 8],
    [-82, 32, 8, 48],
    [82, -48, 8, 54],
    [0, 88, 126, 7],
    [0, -88, 126, 7],
  ].forEach(([x, z, w, d]) => townRoadSlab(scene, x, z, w, d));

  // Sidewalk shoulders are segmented so they stay beside roads and leave clean road space at intersections.
  const horizontalSidewalks = [
    [-84, -7, 42, 2], [-26, -7, 38, 2], [26, -7, 38, 2], [84, -7, 42, 2],
    [-84, 7, 42, 2], [-26, 7, 38, 2], [26, 7, 38, 2], [84, 7, 42, 2],
    [-84, 50.5, 42, 1.4], [-26, 50.5, 38, 1.4], [26, 50.5, 38, 1.4], [84, 50.5, 42, 1.4],
    [-84, 61.5, 42, 1.4], [-26, 61.5, 38, 1.4], [26, 61.5, 38, 1.4], [84, 61.5, 42, 1.4],
    [-84, -50.5, 42, 1.4], [-26, -50.5, 38, 1.4], [26, -50.5, 38, 1.4], [84, -50.5, 42, 1.4],
    [-84, -61.5, 42, 1.4], [-26, -61.5, 38, 1.4], [26, -61.5, 38, 1.4], [84, -61.5, 42, 1.4],
    [-34, 83.5, 42, 1.2], [34, 83.5, 42, 1.2], [-34, 92.5, 42, 1.2], [34, 92.5, 42, 1.2],
    [-34, -83.5, 42, 1.2], [34, -83.5, 42, 1.2], [-34, -92.5, 42, 1.2], [34, -92.5, 42, 1.2],
  ];
  const verticalSidewalks = [
    [-7, -86, 2, 42], [-7, -26, 2, 38], [-7, 26, 2, 38], [-7, 86, 2, 42],
    [7, -86, 2, 42], [7, -26, 2, 38], [7, 26, 2, 38], [7, 86, 2, 42],
    [-49.5, -86, 1.4, 42], [-49.5, -26, 1.4, 38], [-49.5, 26, 1.4, 38], [-49.5, 86, 1.4, 42],
    [-60.5, -86, 1.4, 42], [-60.5, -26, 1.4, 38], [-60.5, 26, 1.4, 38], [-60.5, 86, 1.4, 42],
    [49.5, -86, 1.4, 42], [49.5, -26, 1.4, 38], [49.5, 26, 1.4, 38], [49.5, 86, 1.4, 42],
    [60.5, -86, 1.4, 42], [60.5, -26, 1.4, 38], [60.5, 26, 1.4, 38], [60.5, 86, 1.4, 42],
    [76.5, -45, 1.4, 38], [87.5, -45, 1.4, 38], [76.5, 28, 1.4, 54], [87.5, 28, 1.4, 54],
  ];
  [...horizontalSidewalks, ...verticalSidewalks].forEach(([x, z, w, d]) => townSidewalkSlab(scene, x, z, w, d));

  for (let i = -96; i <= 96; i += 16) {
    townStripe(scene, i, 0, 5, 0.25);
    townStripe(scene, 0, i, 0.25, 5);
  }

  // Simple crosswalks mark intersections without using sidewalk slabs across the road lanes.
  [-55, 0, 55, 82].forEach((x) => {
    townStripe(scene, x - 2.5, 0, 0.35, 7, 0xcfd3d6);
    townStripe(scene, x + 2.5, 0, 0.35, 7, 0xcfd3d6);
  });
  [-88, -56, 0, 56, 88].forEach((z) => {
    townStripe(scene, 0, z - 2.5, 7, 0.35, 0xcfd3d6);
    townStripe(scene, 0, z + 2.5, 7, 0.35, 0xcfd3d6);
  });
}

function addDistricts(scene) {
  // Downtown core: centered at the main cross and ringed by the collector streets.
  townRoadSlab(scene, 0, 0, 48, 44, COLORS.pavement);
  [[-16,-14,9,10,5],[0,-15,10,8,4],[16,-12,8,12,5],[-16,14,8,11,4],[3,15,14,8,5],[18,12,7,10,4]].forEach((b, i) => townBuilding(scene, ...b, i % 2 ? COLORS.buildingA : COLORS.buildingB));
  townStripe(scene, 0, 0, 9, 9, 0x6b7280);
  townLotLabel(scene, 'DOWNTOWN', 0, 4);

  // Park northwest with open green space, paths, and trees against the west/north roads.
  townSlab(scene, -83, 78, 45, 50, COLORS.grassAlt);
  townSidewalkSlab(scene, -83, 78, 41, 4, COLORS.path);
  townSidewalkSlab(scene, -83, 78, 4, 42, COLORS.path);
  townDistrictDetailSlab(scene, -91, 68, 17, 11, 0x3b5d36);
  for (let i = 0; i < 14; i++) addTree(scene, -101 + (i % 5) * 10, 58 + Math.floor(i / 5) * 13);
  townLotLabel(scene, 'PARK', -84, 82);

  // School campus north-center, anchored between the west and east collectors with a field on the road side.
  townSlab(scene, 0, 78, 78, 48, COLORS.schoolField);
  townRoadSlab(scene, -14, 78, 34, 24, COLORS.pavement);
  townDistrictDetailSlab(scene, 24, 78, 24, 30, 0x355f31);
  townBuilding(scene, -16, 79, 22, 14, 3.5, 0x7b6656);
  townBuilding(scene, 4, 68, 12, 8, 3.1, 0x7b6656);
  townLotLabel(scene, 'SCHOOL', 0, 95);

  // Residential neighborhood northeast in gridded blocks served by the east and north roads.
  townSlab(scene, 82, 77, 48, 48, COLORS.grassAlt);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const x = 65 + c * 17, z = 66 + r * 20;
    townDistrictDetailSlab(scene, x, z + 4, 10, 7, COLORS.grass);
    townSidewalkSlab(scene, x - 5, z + 4, 2, 9, COLORS.pavement);
    townBuilding(scene, x, z + 4, 7, 6, 2.6, COLORS.house);
  }
  townLotLabel(scene, 'RESIDENTIAL', 82, 98);

  // Apartment/townhouse block west-mid with its parking lot directly tied to the west street.
  townSlab(scene, -83, -14, 48, 46, COLORS.grassAlt);
  townRoadSlab(scene, -75, -12, 22, 30, COLORS.parking);
  [-99, -88, -66].forEach((x) => townBuilding(scene, x, -19, 8, 20, 4.2, 0x60546a));
  for (let z = -25; z <= 3; z += 7) townStripe(scene, -75, z, 6, 0.25, 0xcfd3d6);
  townLotLabel(scene, 'APARTMENTS', -84, 8);

  // Police and fire are separate civic lots on the east side, each fronting a deliberate service road.
  townRoadSlab(scene, 84, 18, 36, 24, COLORS.pavement);
  townBuilding(scene, 78, 19, 15, 10, 3.2, 0x4d6178);
  townLotLabel(scene, 'POLICE', 84, 31);
  townRoadSlab(scene, 84, -31, 36, 24, COLORS.pavement);
  townBuilding(scene, 77, -31, 17, 10, 3.1, 0x8b3d32);
  townRoadSlab(scene, 93, -31, 7, 14, 0xa32929);
  townLotLabel(scene, 'FIRE', 84, -17);

  // Industrial/junkyard southwest with rough dirt and scrap kept behind the bottom/west roads.
  townSlab(scene, -83, -84, 50, 46, COLORS.junk);
  townDistrictDetailSlab(scene, -83, -84, 42, 34, COLORS.dirt);
  addScrap(scene, -83, -84);
  townLotLabel(scene, 'JUNKYARD', -83, -65);

  // Gas station south-center along the lower east/west street, with parking and pumps near the road.
  townRoadSlab(scene, 10, -82, 42, 42, COLORS.parking);
  townBuilding(scene, 4, -82, 13, 9, 2.4, 0x72634a);
  townRoadSlab(scene, 22, -76, 13, 7, 0x9a2f2f);
  for (let x = -4; x <= 24; x += 7) townStripe(scene, x, -65, 0.25, 6, 0xcfd3d6);
  townLotLabel(scene, 'GAS', 10, -62);

  // Extra southeast housing keeps the lower-right reference block readable without becoming a detailed pass.
  townSlab(scene, 82, -82, 48, 48, COLORS.grassAlt);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const x = 66 + c * 16, z = -96 + r * 20;
    townDistrictDetailSlab(scene, x, z + 4, 10, 7, COLORS.grass);
    townBuilding(scene, x, z + 4, 7, 6, 2.4, COLORS.house);
  }
}

function addTree(scene, x, z) {
  const group = new THREE.Group();
  const trunk = box(.35, 1.8, .35, 0x3d2a24); trunk.position.y = .9; group.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.7, 7), makeMat(0x2f7d3c)); crown.position.y = 2.5; group.add(crown);
  group.position.set(town(x), 0, town(z)); scene.add(group);
  registerWorldCollider({ type: 'circle', x: town(x), z: town(z), radius: town(1.05), label: 'tree' });
}

function addScrap(scene, cx, cz) {
  for (let i = 0; i < 20; i++) {
    const s = box(1 + Math.random() * 2, .25 + Math.random() * .65, .6 + Math.random() * 1.8, i % 2 ? 0x7a6f64 : 0x57534e);
    s.position.set(town(cx + (Math.random() - .5) * 28), .18, town(cz + (Math.random() - .5) * 36));
    s.rotation.y = Math.random() * Math.PI;
    scene.add(s);
    if (s.geometry.parameters.width >= 2.2 || s.geometry.parameters.depth >= 1.6) registerWorldCollider({ type: 'circle', x: s.position.x, z: s.position.z, radius: Math.max(s.geometry.parameters.width, s.geometry.parameters.depth) * .45, label: 'scrap' });
  }
}

function addFillerCars(scene) {
  for (let i = 0; i < 18; i++) {
    const car = new THREE.Group();
    car.add(box(2.6, .55, 1.35, i % 2 ? 0x8ecae6 : 0xef476f));
    const top = box(1.35, .55, 1, 0x2b2d42); top.position.y = .55; car.add(top);
    car.position.set((Math.random() - .5) * (CONFIG.arenaSize - 28), .35, (Math.random() - .5) * (CONFIG.arenaSize - 28));
    car.rotation.y = Math.random() * Math.PI;
    scene.add(car);
    registerWorldCollider({ type: 'circle', x: car.position.x, z: car.position.z, radius: 1.65, label: 'vehicle' });
  }
}

export function createWorld(scene) {
  resetWorldColliders();
  scene.background = new THREE.Color(0x111827);
  scene.fog = new THREE.Fog(0x111827, 64, 155);
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
