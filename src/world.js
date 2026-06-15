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
const REFERENCE_ARENA_SIZE = 130;
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
    : { type, x: collider.x, z: collider.z, width: Math.max(0, collider.width ?? 0), depth: Math.max(0, collider.depth ?? 0), rotation: collider.rotation ?? 0, label: collider.label ?? 'world' };
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
  const angle = -(collider.rotation ?? 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const worldDx = x - collider.x;
  const worldDz = z - collider.z;
  const localX = worldDx * cos - worldDz * sin;
  const localZ = worldDx * sin + worldDz * cos;
  const closestX = THREE.MathUtils.clamp(localX, -halfW, halfW);
  const closestZ = THREE.MathUtils.clamp(localZ, -halfD, halfD);
  const dx = localX - closestX;
  const dz = localZ - closestZ;
  const dist = Math.hypot(dx, dz);
  const toWorld = (lx, lz) => {
    const rot = collider.rotation ?? 0;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return { x: lx * c - lz * s, z: lx * s + lz * c };
  };
  if (dist > 0.0001 && dist < radius) return toWorld((dx / dist) * (radius - dist), (dz / dist) * (radius - dist));
  if (localX < -halfW || localX > halfW || localZ < -halfD || localZ > halfD) return null;

  const left = Math.abs(localX + halfW);
  const right = Math.abs(halfW - localX);
  const bottom = Math.abs(localZ + halfD);
  const top = Math.abs(halfD - localZ);
  const min = Math.min(left, right, bottom, top);
  if (min === left) return toWorld(-(left + radius), 0);
  if (min === right) return toWorld(right + radius, 0);
  if (min === bottom) return toWorld(0, -(bottom + radius));
  return toWorld(0, top + radius);
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



const ASSET_MATS = {
  black: makeMat(0x111111), charcoal: makeMat(0x252525), darkMetal: makeMat(0x3f4548), rust: makeMat(0x8a4b2f),
  fadedBlue: makeMat(0x55706a), fadedTan: makeMat(0x8a806d), fadedGreen: makeMat(0x506a55), concrete: makeMat(0x77736a),
  orange: makeMat(0xc96f24), white: makeMat(0xe8dfcf), red: makeMat(0x9f2f26), yellow: makeMat(0xd9b64c),
  wood: makeMat(0x6b5138), deadWood: makeMat(0x5a5147), leaf: makeMat(0x55603f), leafDark: makeMat(0x3f4a31),
  trash: makeMat(0x1f1f23), signGreen: makeMat(0x276047), signBlue: makeMat(0x315a86), metal: makeMat(0x8b8f89),
};

function assetPart(group, mesh, position = [0, 0, 0], rotation = [0, 0, 0]) {
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  group.add(mesh);
  return mesh;
}

function applyAssetPlacement(group, options = {}) {
  const { position = [0, 0, 0], rotation = 0, scale = 1 } = options;
  const [x, y = 0, z = 0] = Array.isArray(position) ? position : [position.x ?? 0, position.y ?? 0, position.z ?? 0];
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  group.scale.setScalar(scale);
  return group;
}

function tuneAssetScale(options = {}, multiplier = 1) {
  return { ...options, scale: (options.scale ?? 1) * multiplier };
}

function finishAsset(group, options, collider) {
  applyAssetPlacement(group, options);
  if (options.scene) options.scene.add(group);
  if (options.collide !== false && collider) {
    const scale = options.scale ?? 1;
    const x = group.position.x;
    const z = group.position.z;
    if (collider.type === 'circle') registerWorldCollider({ ...collider, x, z, radius: collider.radius * scale });
    else registerWorldCollider({ ...collider, x, z, rotation: group.rotation.y, width: collider.width * scale, depth: collider.depth * scale });
  }
  return group;
}

function vehicleBox(group, w, h, d, color, position, rotation = [0, 0, 0]) {
  return assetPart(group, box(w, h, d, color), position, rotation);
}

function addWheel(group, x, z, radius = .34) {
  assetPart(group, new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .28, 10), ASSET_MATS.black), [x, radius + .06, z], [Math.PI / 2, 0, 0]);
  assetPart(group, new THREE.Mesh(new THREE.CylinderGeometry(radius * .5, radius * .5, .31, 8), ASSET_MATS.darkMetal), [x, radius + .06, z], [Math.PI / 2, 0, 0]);
}

function surfaceRotation(face) {
  if (face === 'front' || face === 'rear') return [0, Math.PI / 2, 0];
  return [0, 0, 0];
}

function surfaceOffset(face, dims, inset = .026) {
  if (face === 'front') return [-dims[0] / 2 - inset, 0];
  if (face === 'rear') return [dims[0] / 2 + inset, 0];
  if (face === 'right') return [0, dims[2] / 2 + inset];
  return [0, -dims[2] / 2 - inset];
}

function addSurfaceBox(group, dims, face, center, w, h, color, thickness = .045, rotationZ = 0) {
  const [sx, sz] = surfaceOffset(face, dims);
  const x = face === 'front' || face === 'rear' ? sx : center[0];
  const z = face === 'front' || face === 'rear' ? center[0] : sz;
  const mesh = vehicleBox(group, w, h, thickness, color, [x, center[2], z], surfaceRotation(face));
  mesh.rotation.z = rotationZ;
  return mesh;
}

function addRustPatches(group, dims, count, roofY) {
  const faces = ['left', 'right', 'roof'];
  for (let i = 0; i < count; i++) {
    const face = faces[i % faces.length];
    const w = .24 + (i % 4) * .1;
    const h = .07 + (i % 2) * .05;
    const x = -dims[0] * .42 + ((i * .37) % .84) * dims[0];
    if (face === 'roof') {
      const z = -dims[2] * .28 + ((i * .29) % .56) * dims[2];
      vehicleBox(group, w, .035, h, 0x8a4b2f, [x, roofY, z], [0, (i % 5) * .18, 0]);
    } else {
      const y = .78 + (i % 4) * .28;
      addSurfaceBox(group, dims, face, [x, 0, y], w, h, 0x8a4b2f, .035, (i % 5) * .12);
    }
  }
}

function addBrokenWindow(group, dims, face, xOrZ, y, w, h) {
  addSurfaceBox(group, dims, face, [xOrZ, 0, y], w, h, 0x050505, .045);
  for (let i = 0; i < 3; i++) {
    const local = xOrZ + (i - 1) * w * .22;
    const shard = addSurfaceBox(group, dims, face, [local, 0, y + (i % 2 ? .11 : -.08)], w * .18, h * .22, 0x3f4548, .05, (i - 1) * .35);
    shard.position.y = y + (i % 2 ? .11 : -.08);
  }
}

function addBoardedPlanks(group, dims, face, xOrZ, y, width, count = 3) {
  for (let i = 0; i < count; i++) {
    addSurfaceBox(group, dims, face, [xOrZ + (i - 1) * .06, 0, y + (i - 1) * .14], width, .13, 0x6b5138, .07, (i - 1) * .18);
  }
}

function createBurntVehicle(options = {}, kind = 'sedan') {
  const specs = {
    sedan: { dims: [4.1, .72, 1.75], color: 0x555348, cabin: [1.85, .82, 1.58], cabinX: -.25, scale: 1.24, wheels: .32 },
    van: { dims: [4.9, 1.2, 2.0], color: 0x68685d, cabin: [3.55, .92, 1.82], cabinX: .2, scale: 1.25, wheels: .35 },
    pickup: { dims: [4.7, .86, 1.95], color: 0x53635a, cabin: [1.55, .9, 1.68], cabinX: -.9, scale: 1.24, wheels: .36 },
    rv: { dims: [5.9, 1.62, 2.28], color: 0x8e8775, cabin: [4.9, 1.25, 2.05], cabinX: .15, scale: 1.23, wheels: .38 },
  }[kind];
  const { dims } = specs;
  const g = new THREE.Group();
  vehicleBox(g, dims[0], dims[1], dims[2], specs.color, [0, dims[1] / 2 + .28, 0]);
  vehicleBox(g, dims[0] * .9, .22, dims[2] * 1.06, 0x2b2c2a, [0, .35, 0]);

  if (kind === 'pickup') {
    vehicleBox(g, specs.cabin[0], specs.cabin[1], specs.cabin[2], 0x37443d, [specs.cabinX, dims[1] + .55, 0]);
    vehicleBox(g, 1.9, .58, 1.72, 0x2c3832, [1.08, .96, 0]);
    vehicleBox(g, 1.68, .12, 1.25, 0x111111, [1.1, 1.22, 0]);
    for (const z of [-.75, .75]) vehicleBox(g, 1.9, .32, .18, specs.color, [1.08, 1.35, z]);
    for (const z of [-.72, .72]) vehicleBox(g, .16, 1.05, .16, 0x252525, [.05, 1.75, z], [0, 0, -.25]);
    addBoardedPlanks(g, dims, 'left', .9, 1.35, 1.2, 2);
  } else {
    vehicleBox(g, specs.cabin[0], specs.cabin[1], specs.cabin[2], kind === 'rv' ? 0x7e7868 : 0x343633, [specs.cabinX, dims[1] + .55, 0]);
  }

  if (kind === 'rv') {
    addSurfaceBox(g, dims, 'left', [.18, 0, 1.55], dims[0] * .82, .08, 0x2f6670, .045);
    addSurfaceBox(g, dims, 'left', [.1, 0, 1.15], dims[0] * .78, .08, 0x8a4b2f, .045);
    addSurfaceBox(g, dims, 'left', [-.45, 0, 1.05], .62, 1.05, 0xd8d0bc, .055);
    vehicleBox(g, 1.1, .42, .85, 0x252525, [.8, dims[1] + 1.28, 0]);
    vehicleBox(g, 1.15, .16, 1.0, 0x111111, [-1.0, dims[1] + 1.18, 0]);
    addBoardedPlanks(g, dims, 'left', 1.45, 1.78, 1.05, 3);
  }

  const frontY = dims[1] + (kind === 'rv' ? .68 : .62);
  addBrokenWindow(g, dims, 'front', -dims[2] * .28, frontY, kind === 'rv' ? .82 : .68, .42);
  addBrokenWindow(g, dims, 'front', dims[2] * .28, frontY, kind === 'rv' ? .82 : .68, .42);
  addBrokenWindow(g, dims, 'left', kind === 'pickup' ? -.95 : -dims[0] * .2, dims[1] + .65, kind === 'pickup' ? .72 : .82, .38);
  addBrokenWindow(g, dims, 'right', kind === 'pickup' ? -.95 : -dims[0] * .2, dims[1] + .65, kind === 'pickup' ? .72 : .82, .38);
  if (kind !== 'pickup') addBrokenWindow(g, dims, 'left', dims[0] * .25, dims[1] + .62, kind === 'rv' ? .9 : .76, .36);
  addBrokenWindow(g, dims, 'rear', 0, dims[1] + .62, kind === 'pickup' ? .86 : 1.05, .4);

  vehicleBox(g, dims[0] * .28, .12, dims[2] * .42, 0x111111, [kind === 'sedan' ? -1.25 : 0, dims[1] + 1.03, 0]);
  vehicleBox(g, dims[0] * .14, .08, dims[2] * .25, 0x252525, [kind === 'sedan' ? -1.25 : 0, dims[1] + 1.07, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addWheel(g, sx * dims[0] * .34, sz * dims[2] * .55, specs.wheels);
  addSurfaceBox(g, dims, 'front', [0, 0, .95], dims[2] * .68, .18, 0x111111, .055);
  addSurfaceBox(g, dims, 'front', [0, 0, .98], dims[2] * .45, .12, 0x3f4548, .06);
  addSurfaceBox(g, dims, 'front', [-dims[2] * .32, 0, .86], .22, .22, 0xc96f24, .06);
  addSurfaceBox(g, dims, 'front', [dims[2] * .32, 0, .86], .22, .22, 0xd8d0bc, .06);
  addRustPatches(g, dims, kind === 'rv' ? 18 : 12, dims[1] + 1.03);
  return finishAsset(g, tuneAssetScale(options, specs.scale), { type: 'rect', width: dims[0] * .95, depth: dims[2] * .95, label: `burnt-${kind}` });
}

export const createBurntSedan = (options = {}) => createBurntVehicle(options, 'sedan');
export const createBurntVan = (options = {}) => createBurntVehicle(options, 'van');
export const createBurntPickupTruck = (options = {}) => createBurntVehicle(options, 'pickup');
export const createBurntRV = (options = {}) => createBurntVehicle(options, 'rv');

function createPostSign(options = {}, type = 'stop') {
  const g = new THREE.Group();
  assetPart(g, box(.18, 1.8, .18, 0x686868), [0, .9, 0]);
  if (type === 'lamp') { assetPart(g, box(.22, 2.6, .22, 0x35383a), [0, 1.3, 0]); assetPart(g, box(1.0, .16, .18, 0x35383a), [.4, 2.55, 0]); assetPart(g, box(.58, .18, .42, 0xfff1bf), [.86, 2.42, 0]); }
  else if (type === 'street') { assetPart(g, box(1.5, .32, .08, 0x276047), [0, 1.75, 0]); assetPart(g, box(1.35, .28, .08, 0x276047), [0, 1.35, 0], [0, Math.PI / 2, 0]); }
  else if (type === 'bus') assetPart(g, box(.75, .9, .08, 0x315a86), [0, 1.65, 0]);
  else assetPart(g, new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .08, 8), ASSET_MATS.red), [0, 1.75, 0], [Math.PI / 2, 0, Math.PI / 8]);
  return finishAsset(g, tuneAssetScale(options, { lamp: 1.66, street: 1.69, stop: 1.3, bus: 1.15 }[type] ?? 1), ['lamp','street','bus','stop'].includes(type) ? { type: 'circle', radius: .28, label: `${type}-post` } : null);
}
export const createLampPost = (options = {}) => createPostSign(options, 'lamp');
export const createStopSign = (options = {}) => createPostSign(options, 'stop');
export const createStreetSign = (options = {}) => createPostSign(options, 'street');
export const createBusStopSign = (options = {}) => createPostSign(options, 'bus');

export function createConcreteBarrier(options = {}) { const g = new THREE.Group(); assetPart(g, box(2.8, .9, .55, 0x77736a), [0,.45,0]); assetPart(g, box(2.5,.12,.08,0xd9b64c), [0,.68,-.3]); return finishAsset(g, options, { type:'circle', radius:1.45, label:'concrete-barrier'}); }
export function createTrafficCone(options = {}) { const g=new THREE.Group(); assetPart(g, box(.8,.08,.8,0xc96f24), [0,.04,0]); assetPart(g, new THREE.Mesh(new THREE.ConeGeometry(.34,1.0,6), ASSET_MATS.orange), [0,.58,0]); assetPart(g, box(.55,.12,.55,0xe8dfcf), [0,.36,0]); return finishAsset(g, options, null); }
export function createRoadBarricade(options = {}) { const g=new THREE.Group(); for (const y of [.75,1.35]) assetPart(g, box(2.6,.24,.16, y>.8?0xe8dfcf:0xc96f24), [0,y,0]); for (const x of [-1.1,1.1]) assetPart(g, box(.18,1.4,.18,0x5a5147), [x,.7,0]); return finishAsset(g, options, {type:'circle', radius:1.35, label:'road-barricade'}); }
export function createUtilityPole(options = {}) { const g=new THREE.Group(); assetPart(g, box(.28,3.0,.28,0x6b5138), [0,1.5,0]); assetPart(g, box(1.8,.18,.18,0x6b5138), [0,2.65,0]); assetPart(g, new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.55,8), ASSET_MATS.metal), [-.55,1.6,0]); return finishAsset(g, tuneAssetScale(options, 1.75), {type:'circle', radius:.32, label:'utility-pole'}); }
export function createFireHydrant(options = {}) { const g=new THREE.Group(); assetPart(g,new THREE.Mesh(new THREE.CylinderGeometry(.23,.28,.85,8),ASSET_MATS.red),[0,.43,0]); assetPart(g,new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),ASSET_MATS.red),[0,.9,0]); assetPart(g,box(.9,.18,.18,0x7a2c25),[0,.55,0]); return finishAsset(g, options, null); }

function createTreeAsset(options={}, kind='street') { const g=new THREE.Group(); const trunkColor=kind==='burnt'?0x1f1f1f:(kind==='dead'?0x5a5147:0x4a3326); assetPart(g, box(.45,2.2,.45,trunkColor), [0,1.1,0]); for(let i=0;i<5;i++) assetPart(g, box(.16,1.2,.16,trunkColor), [Math.sin(i)*.45,2.0+i*.13,Math.cos(i)*.45], [.45,0,i]); if(kind==='street') for(const p of [[0,3,0],[-.75,2.55,.15],[.72,2.55,.05]]) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),ASSET_MATS.leaf),p); return finishAsset(g, tuneAssetScale(options, kind==='street'?2.02:(kind==='dead'?1.8:1.38)), {type:'circle', radius: kind==='street'?.9:.55, label:`${kind}-tree`}); }
export const createStreetTree=(options={})=>createTreeAsset(options,'street'); export const createDeadTree=(options={})=>createTreeAsset(options,'dead'); export const createBurntTree=(options={})=>createTreeAsset(options,'burnt');
export function createBush(options={}) { const g=new THREE.Group(); for(const p of [[0,.45,0],[-.45,.38,.1],[.45,.38,-.1]]) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.55,0),ASSET_MATS.leafDark),p); return finishAsset(g, options, null); }
export function createHedge(options={}) { const g=new THREE.Group(); for(let i=-2;i<=2;i++) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.55,0),ASSET_MATS.leafDark),[i*.45,.55,0]); return finishAsset(g, options, {type:'rect', width:2.7, depth:.8, label:'hedge'}); }
export function createMailbox(options={}) { const g=new THREE.Group(); assetPart(g,box(.18,1,.18,0x6b5138),[0,.5,0]); assetPart(g,box(.85,.42,.48,0x5f6970),[0,1.14,0]); assetPart(g,box(.08,.35,.28,0x9f2f26),[.48,1.34,0]); return finishAsset(g, options, null); }
export function createWoodFenceSection(options={}) { const g=new THREE.Group(); for(let x=-1.2;x<=1.2;x+=.6) assetPart(g,box(.18,1.25,.12,0x6b5138),[x,.62,0]); for(const y of [.45,.9]) assetPart(g,box(3,.16,.16,0x6b5138),[0,y,0]); return finishAsset(g, options, {type:'rect', width:3, depth:.35, label:'wood-fence'}); }
export function createChainLinkFence(options={}) { const g=new THREE.Group(); for(const x of [-1.4,1.4]) assetPart(g,box(.16,1.55,.16,0x686868),[x,.78,0]); for(let i=-5;i<=5;i++) assetPart(g,box(.04,1.55,.04,0x9ca3af),[i*.26,.8,0],[0,0,.65]); assetPart(g,box(3,.08,.08,0x9ca3af),[0,1.5,0]); return finishAsset(g, tuneAssetScale(options, 1.25), {type:'rect', width:3, depth:.3, label:'chain-link-fence'}); }
export function createBench(options={}) { const g=new THREE.Group(); assetPart(g,box(2,.18,.45,0x55603f),[0,.55,0]); assetPart(g,box(2,.18,.35,0x55603f),[0,.95,.25],[-.25,0,0]); for(const x of [-.75,.75]) assetPart(g,box(.16,.55,.16,0x5a5147),[x,.28,0]); return finishAsset(g, tuneAssetScale(options, 1.46), {type:'rect', width:2.1, depth:.75, label:'bench'}); }
export function createPicnicTable(options={}) { const g=new THREE.Group(); assetPart(g,box(2.2,.18,.8,0x6b5138),[0,.8,0]); for(const z of [-.75,.75]) assetPart(g,box(2.1,.16,.35,0x6b5138),[0,.48,z]); for(const x of [-.8,.8]) assetPart(g,box(.16,.75,.16,0x5a5147),[x,.38,0],[0,0,.25]); return finishAsset(g, tuneAssetScale(options, 1.46), {type:'rect', width:2.4, depth:1.9, label:'picnic-table'}); }
export function createPlanter(options={}) { const g=new THREE.Group(); assetPart(g,box(2.3,.55,.9,0x77736a),[0,.28,0]); assetPart(g,box(1.9,.12,.55,0x3f2f20),[0,.62,0]); for(let i=0;i<5;i++) assetPart(g,box(.08,.65,.08,0x55603f),[-.8+i*.4,.95,0]); return finishAsset(g, options, {type:'rect', width:2.3, depth:.9, label:'planter'}); }
export function createWoodenShed(options={}) { const g=new THREE.Group(); assetPart(g,box(2.4,1.8,2,0x8a806d),[0,.9,0]); assetPart(g,box(2.7,.28,2.25,0x5a3328),[0,1.95,0]); assetPart(g,box(.75,1.2,.08,0x6b5138),[-.45,.72,-1.04]); return finishAsset(g, options, {type:'rect', width:2.5, depth:2.1, label:'wooden-shed'}); }

export function createDumpster(options={}) { const g=new THREE.Group(); assetPart(g,box(2.5,1.1,1.45,0x315c50),[0,.65,0]); assetPart(g,box(2.6,.18,1.55,0x252525),[0,1.3,0]); return finishAsset(g, options, {type:'rect', width:2.6, depth:1.55, label:'dumpster'}); }
export function createGarbageBags(options={}) { const g=new THREE.Group(); for(const p of [[0,.35,0],[-.45,.3,.2],[.45,.28,-.15]]) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.42,0),ASSET_MATS.trash),p); return finishAsset(g, options, null); }
export function createTirePile(options={}) { const g=new THREE.Group(); for(const p of [[0,.25,0],[-.55,.25,.15],[.5,.25,-.15],[0,.72,0]]) assetPart(g,new THREE.Mesh(new THREE.TorusGeometry(.34,.12,6,12),ASSET_MATS.black),p,[Math.PI/2,0,0]); return finishAsset(g, options, null); }
function createStack(options={}, kind='barrel') { const g=new THREE.Group(); for(let i=0;i<5;i++){ const x=(i%3-1)*.55, z=Math.floor(i/3)*.55; const y=i>2?.95:.45; const mesh=kind==='crate'?box(.75,.75,.75,0x8a6a45):new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.85,10), i%2?ASSET_MATS.rust:ASSET_MATS.fadedBlue); assetPart(g,mesh,[x,y,z]); } return finishAsset(g, options, {type:'circle', radius:1.05, label:`${kind}-stack`}); }
export const createBarrelStack=(options={})=>createStack(options,'barrel'); export const createCrateStack=(options={})=>createStack(options,'crate');
function createDebrisPile(options={}, kind='scrap') { const g=new THREE.Group(); const colors=kind==='wood'?[0x6b5138,0x5a5147]:[0x57534e,0x8a4b2f,0x77736a]; for(let i=0;i<9;i++) { const angle=i*.78; const dist=.18+(i%4)*.28; assetPart(g,box(.35+(i%3)*.25,.12,.25+(i%4)*.14,colors[i%colors.length]),[Math.cos(angle)*dist,.1+i*.025,Math.sin(angle)*dist],[0,angle,0]); } return finishAsset(g, options, kind==='junk'?{type:'circle',radius:1.2,label:'junk-pile'}:null); }
export const createScrapPile=(options={})=>createDebrisPile(options,'scrap'); export const createWoodDebris=(options={})=>createDebrisPile(options,'wood'); export const createJunkPile=(options={})=>createDebrisPile(options,'junk');
export function createTrashCan(options={}) { const g=new THREE.Group(); assetPart(g,new THREE.Mesh(new THREE.CylinderGeometry(.35,.42,.95,10),ASSET_MATS.metal),[0,.48,0]); assetPart(g,new THREE.Mesh(new THREE.CylinderGeometry(.38,.32,.16,10),ASSET_MATS.darkMetal),[0,1.02,0]); return finishAsset(g, options, null); }
export function createPlaygroundSlide(options={}) { const g=new THREE.Group(); assetPart(g,box(.75,.12,2.4,0xb84e36),[0,.65,0],[.55,0,0]); assetPart(g,box(.12,1.4,.12,0x3f4548),[-.42,.7,-.75]); assetPart(g,box(.12,1.4,.12,0x3f4548),[.42,.7,-.75]); return finishAsset(g, tuneAssetScale(options, 1.66), {type:'rect', width:1.1, depth:2.4, label:'playground-slide'}); }
export function createPlaygroundSwings(options={}) { const g=new THREE.Group(); for(const x of [-1.2,1.2]) { assetPart(g,box(.12,2.2,.12,0x6b5138),[x,1.1,-.55],[0,0,.22*x]); assetPart(g,box(.12,2.2,.12,0x6b5138),[x,1.1,.55],[0,0,-.22*x]); } assetPart(g,box(2.8,.14,.14,0x6b5138),[0,2.15,0]); for(const x of [-.55,.55]) assetPart(g,box(.55,.08,.35,0x252525),[x,.55,0]); return finishAsset(g, tuneAssetScale(options, 1.63), {type:'rect', width:3, depth:1.4, label:'playground-swings'}); }

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
  const group = new THREE.Group();
  const base = box(w, h, d, color);
  base.position.set(0, h / 2, 0);
  const roof = box(w + 0.6, 0.34, d + 0.6, COLORS.roof);
  roof.position.set(0, h + 0.17, 0);
  group.add(base, roof);

  const trim = 0x171717;
  const board = 0x6b5138;
  const frontZ = d / 2 + 0.03;
  const backZ = -d / 2 - 0.03;
  for (const [bx, bz, rot] of [[-w * .24, frontZ, 0], [w * .24, frontZ, 0], [0, backZ, 0]]) {
    const window = box(Math.min(2.0, w * .24), 1.0, 0.08, trim);
    window.position.set(bx, h * .55, bz);
    const slatA = box(Math.min(2.2, w * .28), 0.18, 0.11, board);
    const slatB = box(Math.min(2.2, w * .28), 0.18, 0.11, board);
    slatA.position.set(bx, h * .55, bz + (bz > 0 ? .03 : -.03));
    slatB.position.copy(slatA.position);
    slatA.rotation.z = .28 + rot;
    slatB.rotation.z = -.28 + rot;
    group.add(window, slatA, slatB);
  }
  const door = box(Math.min(1.6, w * .2), 1.6, 0.1, 0x3b2f24);
  door.position.set(0, .8, frontZ + .04);
  const doorBoard = box(Math.min(1.8, w * .22), 0.2, 0.12, board);
  doorBoard.position.set(0, 1.08, frontZ + .09);
  doorBoard.rotation.z = -.32;
  group.add(door, doorBoard);
  group.position.set(x, 0, z);
  scene.add(group);
  registerWorldCollider({ type: 'rect', x, z, width: w, depth: d, label: 'solid-boarded-building' });
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
  const lines = text.split('\n');
  const lineHeight = lines.length > 1 ? 24 : 0;
  const startY = lines.length > 1 ? 28 : 40;
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    ctx.strokeText(line, 128, y);
    ctx.fillText(line, 128, y);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }));
  sprite.position.set(x, 1.7, z);
  sprite.scale.set(7 * TOWN_SCALE, 1.75 * TOWN_SCALE, 1);
  scene.add(sprite);
}

function townLotLabel(scene, text, x, z) {
  lotLabel(scene, text, town(x), town(z));
}

function addRoadNetwork(scene) {
  // Compact 130 x 130 arena roads: one clean central crossing with readable sidewalks.
  townRoadSlab(scene, 0, 0, REFERENCE_ARENA_SIZE, 14);
  townRoadSlab(scene, 0, 0, 14, REFERENCE_ARENA_SIZE);

  [[0, -9, 112, 2], [0, 9, 112, 2], [-9, 0, 2, 112], [9, 0, 2, 112]].forEach(([x, z, w, d]) => townSidewalkSlab(scene, x, z, w, d));
  for (let i = -54; i <= 54; i += 12) {
    if (Math.abs(i) > 8) townStripe(scene, i, 0, 4, .22);
    if (Math.abs(i) > 8) townStripe(scene, 0, i, .22, 4);
  }
  [-12, 12].forEach((offset) => {
    townStripe(scene, offset, -7, .38, 5.5, 0xcfd3d6);
    townStripe(scene, offset, 7, .38, 5.5, 0xcfd3d6);
    townStripe(scene, -7, offset, 5.5, .38, 0xcfd3d6);
    townStripe(scene, 7, offset, 5.5, .38, 0xcfd3d6);
  });
  townStripe(scene, 0, 0, 15, .28, 0xbfc3c7);
  townStripe(scene, 0, 0, .28, 15, 0xbfc3c7);
}

function addParkingStripes(scene, cx, cz) {
  for (let i = 0; i < 5; i++) townStripe(scene, cx - 16 + i * 8, cz + 2, .25, 15, 0xcfd3d6);
  townStripe(scene, cx, cz - 6, 38, .25, 0xcfd3d6);
}

function addRubblePatch(scene, x, z, count = 7) {
  for (let i = 0; i < count; i++) {
    const r = box(.45 + Math.random() * .6, .08, .3 + Math.random() * .5, i % 2 ? 0x77736a : 0x5f574c);
    r.position.set(town(x + (Math.random() - .5) * 8), SURFACE_Y.marking + .05, town(z + (Math.random() - .5) * 8));
    r.rotation.y = Math.random() * Math.PI;
    scene.add(r);
  }
}

function addGasPumps(scene, x, z) {
  townRoadSlab(scene, x, z, 20, 7, 0x5f6468);
  townBuilding(scene, x - 10, z - 14, 18, 10, 3.2, 0x8b3d32);
  for (const px of [x - 4, x + 5]) {
    const pump = box(1.1, 1.6, .85, 0x9f2f26);
    pump.position.set(town(px), .8, town(z));
    scene.add(pump);
  }
}

function addDistricts(scene) {
  // Four simple themed corners around the central road crossing.
  townSlab(scene, -38, 38, 44, 44, COLORS.grassAlt);
  townSlab(scene, 38, 38, 44, 44, COLORS.parking);
  townSlab(scene, -38, -38, 44, 44, COLORS.grassAlt);
  townSlab(scene, 38, -38, 44, 44, COLORS.junk);

  // Residential corner: three solid boarded houses with open lawns and driveways.
  townBuilding(scene, -50, 48, 11, 9, 3.0, 0x7a5a48);
  townBuilding(scene, -34, 50, 11, 9, 3.0, 0x66725a);
  townBuilding(scene, -50, 29, 12, 10, 3.2, 0x5f705e);
  [[-50, 39, 5, 12], [-34, 40, 5, 13], [-42, 23, 14, 5]].forEach(([x, z, w, d]) => townRoadSlab(scene, x, z, w, d, COLORS.pavement));
  createStreetTree({ scene, position: [town(-58), 0, town(56)], scale: town(.82) });
  createBurntSedan({ scene, position: [town(-42), 0, town(38)], rotation: Math.PI / 2 + .08, scale: town(.72) });
  townLotLabel(scene, 'RESIDENTIAL', -43, 20);

  // Gas / convenience store corner with one solid shop and non-blocking pump details.
  addGasPumps(scene, 40, 42);
  createBurntRV({ scene, position: [town(55), 0, town(34)], rotation: -.08, scale: town(.74) });
  townLotLabel(scene, 'GAS', 38, 20);

  // Park corner: mostly open grass, with only a few large tree trunks as meaningful blockers.
  [[-55, -50], [-38, -43], [-52, -27], [-25, -55], [-28, -30]].forEach(([x, z]) => createStreetTree({ scene, position: [town(x), 0, town(z)], scale: town(.9) }));
  townSidewalkSlab(scene, -38, -38, 33, 3, COLORS.path);
  townSidewalkSlab(scene, -38, -38, 3, 33, COLORS.path);
  townLotLabel(scene, 'PARK', -43, -57);

  // Parking / junk lot corner with burnt vehicles and one simple solid garage.
  townRoadSlab(scene, 38, -38, 42, 42, COLORS.parking);
  townBuilding(scene, 52, -51, 15, 10, 3.1, 0x72634a);
  addParkingStripes(scene, 36, -34);
  createBurntSedan({ scene, position: [town(29), 0, town(-31)], rotation: .2, scale: town(.82) });
  createBurntPickupTruck({ scene, position: [town(45), 0, town(-38)], rotation: Math.PI - .35, scale: town(.82) });
  createBurntVan({ scene, position: [town(31), 0, town(-53)], rotation: -.15, scale: town(.76) });
  townLotLabel(scene, 'PARKING LOT\nJUNK LOT', 38, -58);

  createBurntVan({ scene, position: [town(8), 0, town(56)], rotation: Math.PI / 2 - .12, scale: town(.68) });

  [[-18, 16], [16, 18], [-20, -16], [18, -18], [54, 54], [-58, -58]].forEach(([x, z]) => addRubblePatch(scene, x, z, 5));
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
}
