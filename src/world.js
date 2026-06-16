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

function surfaceOffset(face, dims, inset = .026, originX = 0, originZ = 0) {
  if (face === 'front') return [originX - dims[0] / 2 - inset, originZ];
  if (face === 'rear') return [originX + dims[0] / 2 + inset, originZ];
  if (face === 'right') return [originX, originZ + dims[2] / 2 + inset];
  return [originX, originZ - dims[2] / 2 - inset];
}

function addSurfaceBox(group, dims, face, center, w, h, color, thickness = .045, rotationZ = 0, surface = {}) {
  const [sx, sz] = surfaceOffset(face, dims, surface.inset ?? .026, surface.originX ?? 0, surface.originZ ?? 0);
  const x = face === 'front' || face === 'rear' ? sx : (surface.originX ?? 0) + center[0];
  const z = face === 'front' || face === 'rear' ? (surface.originZ ?? 0) + center[0] : sz;
  const mesh = vehicleBox(group, w, h, thickness, color, [x, center[2], z], surfaceRotation(face));
  mesh.rotation.z = rotationZ;
  return mesh;
}

function addRustPatches(group, dims, count, roofY, roofDims = dims, roofX = 0) {
  const faces = ['left', 'right', 'roof'];
  for (let i = 0; i < count; i++) {
    const face = faces[i % faces.length];
    const w = .24 + (i % 4) * .1;
    const h = .07 + (i % 2) * .05;
    const x = -dims[0] * 0.35 + ((i * .37) % .84) * dims[0];
    if (face === 'roof') {
      const roofLocalX = -roofDims[0] * .36 + ((i * .27) % .72) * roofDims[0];
      const z = -roofDims[2] * .28 + ((i * .29) % .56) * roofDims[2];
      vehicleBox(group, w, .035, h, 0x8a4b2f, [roofX + roofLocalX, roofY, z], [0, (i % 5) * .18, 0]);
    } else {
      const y = .78 + (i % 4) * .008;
      addSurfaceBox(group, dims, face, [x, 0, y], w, h, 0x8a4b2f, .035, (i % 5) * .12);
    }
  }
}

function addBrokenWindow(group, dims, face, xOrZ, y, w, h, surface = {}) {
  addSurfaceBox(group, dims, face, [xOrZ, 0, y], w, h, 0x050505, .045, 0, surface);
  for (let i = 0; i < 3; i++) {
    const local = xOrZ + (i - 1) * w * .22;
    const shard = addSurfaceBox(group, dims, face, [local, 0, y + (i % 2 ? .11 : -.08)], w * .18, h * .22, 0x3f4548, .05, (i - 1) * .35, surface);
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
    sedan: { dims: [4.1, .72, 1.75], color: 0x555348, cabin: [2.25, .82, 1.74], cabinX: 0, scale: 1.24, wheels: .32 },
    van: { dims: [4.9, 1.2, 2.0], color: 0x68685d, cabin: [4.25, .92, 1.99], cabinX: .2, scale: 1.25, wheels: .35 },
    pickup: { dims: [4.7, .86, 1.95], color: 0x53635a, cabin: [1.55, .9, 1.94], cabinX: -.9, scale: 1.24, wheels: .36 },
    rv: { dims: [5.9, 1.62, 2.28], color: 0x8e8775, cabin: [5.8, 1.25, 2.27], cabinX: 0, scale: 1.23, wheels: .38 },
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
    for (const z of [-.72, .72]) vehicleBox(g, .26, 1.05, .26, 0x252525, [.05, 1.75, z], [0, 0, 0]);
    addBoardedPlanks(g, dims, 'left', -0.95, 1.55, 1.2, 2);
  } else {
    vehicleBox(g, specs.cabin[0], specs.cabin[1], specs.cabin[2], kind === 'rv' ? 0x7e7868 : 0x343633, [specs.cabinX, dims[1] + .55, 0]);
  }

  if (kind === 'rv') {
    addSurfaceBox(g, dims, 'left', [.18, 0, 1.55], dims[0] * .82, .08, 0x2f6670, .045);
    addSurfaceBox(g, dims, 'left', [.1, 0, 1.15], dims[0] * .78, .08, 0x8a4b2f, .045);
    addSurfaceBox(g, dims, 'left', [0.05, 0, 1.50], .99, 2.05, 0xd8d0bc, .055);
    vehicleBox(g, 1.1, .42, .85, 0x252525, [.8, dims[1] + 1.28, 0]);
    vehicleBox(g, 1.15, .16, 1.0, 0x111111, [-1.0, dims[1] + 1.18, 0]);
    addBoardedPlanks(g, dims, 'left', 0, 1.78, 1.05, 4);
  }

  const cabinDims = specs.cabin;
  const cabinSurface = { originX: specs.cabinX, originZ: 0, inset: .028 };
  const windowY = dims[1] + (kind === 'rv' ? .78 : .66);
  const frontWindowY = dims[1] + (kind === 'rv' ? .78 : .68);
  addBrokenWindow(g, cabinDims, 'front', -cabinDims[2] * .24, frontWindowY, kind === 'rv' ? .64 : .52, .42, cabinSurface);
  addBrokenWindow(g, cabinDims, 'front', cabinDims[2] * .24, frontWindowY, kind === 'rv' ? .64 : .52, .42, cabinSurface);
  addBrokenWindow(g, cabinDims, 'left', kind === 'pickup' ? -.08 : -cabinDims[0] * .24, windowY, kind === 'pickup' ? .66 : .72, .36, cabinSurface);
  addBrokenWindow(g, cabinDims, 'right', kind === 'pickup' ? -.08 : -cabinDims[0] * .24, windowY, kind === 'pickup' ? .66 : .72, .36, cabinSurface);
  if (kind !== 'pickup') addBrokenWindow(g, cabinDims, 'left', cabinDims[0] * .24, windowY, kind === 'rv' ? .78 : .68, .34, cabinSurface);
  addBrokenWindow(g, cabinDims, 'rear', 0, windowY, 1.0, .34, cabinSurface);
  
  const roofX = kind === 'sedan' ? specs.cabinX - .15 : specs.cabinX;
  const roofY = dims[1] + .55 + cabinDims[1] / 2 + .035;
  vehicleBox(g, dims[0] * .28, .08, dims[2] * .38, 0x111111, [roofX, roofY, 0]);
  vehicleBox(g, dims[0] * .14, .055, dims[2] * .22, 0x252525, [roofX, roofY + .055, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addWheel(g, sx * dims[0] * .34, sz * dims[2] * .55, specs.wheels);
  addSurfaceBox(g, dims, 'front', [0, 0, .95], dims[2] * .68, .18, 0x111111, .055);
  addSurfaceBox(g, dims, 'front', [0, 0, .98], dims[2] * .45, .12, 0x3f4548, .06);
  addSurfaceBox(g, dims, 'front', [-dims[2] * .32, 0, .86], .22, .22, 0xc96f24, .06);
  addSurfaceBox(g, dims, 'front', [dims[2] * .32, 0, .86], .22, .22, 0xd8d0bc, .06);
  const rustRoofDims = kind === 'pickup' || kind === 'sedan' ? cabinDims : dims;
  const rustRoofX = kind === 'pickup' || kind === 'sedan' ? specs.cabinX : 0;
  addRustPatches(g, dims, kind === 'rv' ? 14 : 12, roofY + 0.035, rustRoofDims, rustRoofX);
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

function createPeakedRoof(group, w, d, baseY, color = COLORS.roof, orientation = 'z') {
  const roofWidth = w + town(1.2);
  const roofDepth = d + town(1.1);
  const rise = town(2.1);
  const pitch = Math.atan2(rise, orientation === 'z' ? roofDepth / 2 : roofWidth / 2);
  const rafterLength = Math.hypot(orientation === 'z' ? roofDepth / 2 : roofWidth / 2, rise);
  const thickness = town(.36);
  const left = orientation === 'z'
    ? box(roofWidth, thickness, rafterLength, color)
    : box(rafterLength, thickness, roofDepth, color);
  const right = orientation === 'z'
    ? box(roofWidth, thickness, rafterLength, color)
    : box(rafterLength, thickness, roofDepth, color);

  if (orientation === 'z') {
    left.position.set(0, baseY + rise / 2, -roofDepth / 4);
    right.position.set(0, baseY + rise / 2, roofDepth / 4);
    left.rotation.x = -pitch;
    right.rotation.x = pitch;
  } else {
    left.position.set(-roofWidth / 4, baseY + rise / 2, 0);
    right.position.set(roofWidth / 4, baseY + rise / 2, 0);
    left.rotation.z = pitch;
    right.rotation.z = -pitch;
  }
  const ridge = orientation === 'z'
    ? box(roofWidth + town(.3), town(.24), town(.28), 0x1f2133)
    : box(town(.28), town(.24), roofDepth + town(.3), 0x1f2133);
  ridge.position.set(0, baseY + rise + town(.06), 0);
  group.add(left, right, ridge);
}

function createGableEnds(group, w, d, baseY, rise, color = COLORS.house, orientation = 'z') {
  const mat = makeMat(color);

  if (orientation === 'z') {
    const halfSpan = d / 2 + town(.22);

    const shape = new THREE.Shape();
    shape.moveTo(-halfSpan, 0);
    shape.lineTo(0, rise);
    shape.lineTo(halfSpan, 0);
    shape.lineTo(-halfSpan, 0);

    const geom = new THREE.ShapeGeometry(shape);

    const left = new THREE.Mesh(geom, mat);
    left.position.set(-w / 2 - town(.125), baseY, 0);
    left.rotation.y = -Math.PI / 2;

    const right = new THREE.Mesh(geom.clone(), mat);
    right.position.set(w / 2 + town(.125), baseY, 0);
    right.rotation.y = Math.PI / 2;

    group.add(left, right);
    return;
  }

  const halfSpan = w / 2 + town(.22);

  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan, 0);
  shape.lineTo(0, rise);
  shape.lineTo(halfSpan, 0);
  shape.lineTo(-halfSpan, 0);

  const geom = new THREE.ShapeGeometry(shape);

  const front = new THREE.Mesh(geom, mat);
  front.position.set(0, baseY, d / 2 + town(.025));

  const back = new THREE.Mesh(geom.clone(), mat);
  back.position.set(0, baseY, -d / 2 - town(.025));
  back.rotation.y = Math.PI;

  group.add(front, back);
}

function addResidentialDoor(group, w, d, front, x = 0) {
  const z = front === 'south' ? d / 2 + town(.045) : -d / 2 - town(.045);
  assetPart(group, box(town(1.7), town(2.4), town(.12), 0x3b2f24), [x, town(1.2), z]);
  assetPart(group, box(town(1.9), town(.22), town(.14), 0x6b5138), [x, town(1.45), z + (front === 'south' ? town(.05) : -town(.05))], [0, 0, -.3]);
}

function addResidentialWindow(group, dims, face, xOrZ, y, boarded = false) {
  addSurfaceBox(group, dims, face, [xOrZ, 0, y], town(1.8), town(1.15), 0x08090c, town(.06));
  if (boarded) addBoardedPlanks(group, dims, face, xOrZ, y, town(2.0), 3);
  else {
    addSurfaceBox(group, dims, face, [xOrZ, 0, y], town(.12), town(1.12), 0x3f4548, town(.07));
    addSurfaceBox(group, dims, face, [xOrZ, 0, y], town(1.75), town(.12), 0x3f4548, town(.07));
  }
}

function createResidentialHouse(scene, x, z, options = {}) {
  const {
    w = 9.5, d = 8.5, color = COLORS.house, twoStory = false, rotation = 0, front = 'south',
    roofColor = COLORS.roof, boarded = true,
  } = options;
  const tw = town(w);
  const td = town(d);
  const h = town(twoStory ? 5.8 : 3.35);
  const g = new THREE.Group();
  assetPart(g, box(tw, h, td, color), [0, h / 2, 0]);
  assetPart(g, box(tw + town(.45), town(.28), td + town(.45), 0x4b3c33), [0, town(.14), 0]);
  // A narrow top cap closes any daylight between the walls and the sloped roof planes.
  assetPart(g, box(tw + town(.28), town(.34), td + town(.28), color), [0, h + town(.1), 0]);
  createPeakedRoof(g, tw, td, h + town(.08), roofColor);
  createGableEnds(g, tw, td, h + town(.08), town(2.1), color);

  const dims = [tw, h, td];
  const frontFace = front === 'south' ? 'right' : 'left';
  const backFace = front === 'south' ? 'left' : 'right';
  addResidentialDoor(g, tw, td, front, -tw * .22);
  addResidentialWindow(g, dims, frontFace, tw * .22, town(2.1), boarded);
  addResidentialWindow(g, dims, backFace, 0, town(2.0), true);
  addResidentialWindow(g, dims, 'front', -td * .22, town(2.0), false);
  addResidentialWindow(g, dims, 'rear', td * .22, town(2.0), true);
  if (twoStory) {
    addResidentialWindow(g, dims, frontFace, -tw * .20, town(4.55), false);
    addResidentialWindow(g, dims, frontFace, tw * .24, town(4.55), true);
    addResidentialWindow(g, dims, 'front', 0, town(4.45), true);
    addResidentialWindow(g, dims, 'rear', 0, town(4.45), false);
  }
  const chimneyX = front === 'south' ? -tw * .26 : tw * .24;
  const chimneyZ = front === 'south' ? -td * .18 : td * .16;
  assetPart(g, box(town(.78), town(1.15), town(.78), 0x4a3a33), [chimneyX, h + town(1.15), chimneyZ]);
  addRustPatches(g, dims, twoStory ? 8 : 5, h + town(1.34), [tw, h, td]);

  g.position.set(town(x), 0, town(z));
  g.rotation.y = rotation;
  scene.add(g);
  registerWorldCollider({ type: 'rect', x: town(x), z: town(z), width: tw, depth: td, rotation, label: twoStory ? 'two-story-residential-house' : 'residential-house' });
}

function addResidentialNeighborhood(scene) {
  // Small local streets and simple pedestrian connections inside the residential corner.
  // The lane drops in from the main road, turns across the three lower homes, then rejoins the road system.
  townRoadSlab(scene, -41, 23, 6, 35, COLORS.road);
  townRoadSlab(scene, -30, 40, 48, 6.5, COLORS.road);
  townSidewalkSlab(scene, -37, 23, 1.8, 27);
  townSidewalkSlab(scene, -45, 23, 1.8, 27);
  townSidewalkSlab(scene, -50.1, 35.8, 11.7, 1.8);
  townSidewalkSlab(scene, -23, 35.8, 29.8, 1.8);
  townSidewalkSlab(scene, -33, 44.2, 45.9, 1.8);
  townSidewalkSlab(scene, -55.05, 40, 1.8, 10.1);

  // Driveways and walkways stay flat/non-blocking so combat movement remains open.
  [[-53.8, 46, 1.8, 3], [-41, 46, 1.8, 3], [-25.8, 46, 1.8, 3], [-47.8, 28.9, 4, 1.8], [-26, 33.6, 1.8, 3]].forEach(([x, z, w, d]) => townSidewalkSlab(scene, x, z, w, d, COLORS.sidewalk));

  createResidentialHouse(scene, -56, 52, { w: 9.5, d: 8.5, color: 0x7a5a48, rotation: Math.PI, front: 'south', boarded: true });
  createResidentialHouse(scene, -43, 51, { w: 8.6, d: 8.0, color: 0x66725a, roofColor: 0x333247, rotation: Math.PI, front: 'south', boarded: false });
  createResidentialHouse(scene, -28, 52, { w: 10.2, d: 8.8, color: 0x75624f, twoStory: true, rotation: Math.PI, front: 'south', boarded: true });
  createResidentialHouse(scene, -54, 27, { w: 8.8, d: 8.3, color: 0x5f705e, rotation: Math.PI / 2, boarded: true });
  createResidentialHouse(scene, -24, 28, { w: 9.2, d: 8.0, color: 0x6f5d6d, boarded: false });

  createBurntSedan({ scene, position: [town(-57.5), 0, town(38.4)], rotation: Math.PI / 2 + .08, scale: town(.62) });
  createBurntPickupTruck({ scene, position: [town(-24), 0, town(40.3)], rotation: -.14, scale: town(.6) });
  createBurntVan({ scene, position: [town(-51.4), 0, town(29.5)], rotation: Math.PI / 2 - .18, scale: town(.54) });
  createStreetTree({ scene, position: [town(-62), 0, town(56)], scale: town(.72) });
  createStreetTree({ scene, position: [town(-21), 0, town(47)], scale: town(.68) });
  createStreetTree({ scene, position: [town(-61), 0, town(35)], scale: town(.58) });
  createStreetTree({ scene, position: [town(-39), 0, town(56)], scale: town(.6) });
  createStreetTree({ scene, position: [town(-23), 0, town(28)], scale: town(.56) });
  addRubblePatch(scene, -39, 36, 4);
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

function addParkingStripes(scene, cx, cz, rotation = 0, count = 5, spacing = 4, length = 6.4, thickness = .25) {
  const color = 0xcfd3d6;
  const rotated = rotation === 90 || rotation === 'sideways';
  const start = -((count - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const offset = start + i * spacing;

    if (rotated) {
      townStripe(scene, cx, cz + offset, length, thickness, color);
    } else {
      townStripe(scene, cx + offset, cz, thickness, length, color);
    }
  }
}

function addRubblePatch(scene, x, z, count = 7) {
  for (let i = 0; i < count; i++) {
    const r = box(.45 + Math.random() * .6, .08, .3 + Math.random() * .5, i % 2 ? 0x77736a : 0x5f574c);
    r.position.set(town(x + (Math.random() - .5) * 8), SURFACE_Y.marking + .05, town(z + (Math.random() - .5) * 8));
    r.rotation.y = Math.random() * Math.PI;
    scene.add(r);
  }
}

function addGasStationSign(group, width, height, position) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8b2d25';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#d9b64c';
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f4ead0';
  ctx.strokeStyle = '#171717';
  ctx.lineWidth = 6;
  ctx.strokeText('GAS', canvas.width / 2, canvas.height / 2 + 2);
  ctx.fillText('GAS', canvas.width / 2, canvas.height / 2 + 2);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, .08),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), roughness: .88 }),
  );
  sign.position.set(...position);
  group.add(sign);
  return sign;
}

function addGasStationBuilding(scene, x, z) {
  const g = new THREE.Group();
  const w = town(23);
  const d = town(12);
  const h = 3.4;
  const roadFrontZ = -d / 2 - .035;
  const rearZ = d / 2 + .035;
  const rightX = w / 2 + .035;

  assetPart(g, box(w, h, d, 0x756c5d), [0, h / 2, 0]);
  assetPart(g, box(w + town(1.2), .32, d + town(1.0), 0x2b2d42), [0, h + .16, 0]);
  assetPart(g, box(w + town(1.7), .16, town(1.0), 0x8b2d25), [0, h + .46, roadFrontZ]);
  addGasStationSign(g, town(6.2), 1.25, [0, h + 1.13, roadFrontZ - .05]);

  // Small side restroom / water-closet bump-out.
  const wcW = town(6.2);
  const wcD = town(7.0);
  assetPart(g, box(wcW, 2.55, wcD, 0x665f55), [w / 2 + wcW / 2 - town(.4), 1.275, -town(1.6)]);
  assetPart(g, box(wcW + town(.5), .24, wcD + town(.45), 0x25283a), [w / 2 + wcW / 2 - town(.4), 2.67, -town(1.6)]);
  assetPart(g, box(.09, 1.45, town(1.15), 0x3b2f24), [rightX + wcW - town(.4), .74, -town(1.6)]);

  // Two front doors and a readable row of windows, with boarded/busted details.
  for (const doorX of [-town(7.7), town(7.7)]) {
    assetPart(g, box(town(2.0), 1.8, .11, 0x3b2f24), [doorX, .9, roadFrontZ]);
    assetPart(g, box(town(1.7), .22, .13, 0x6b5138), [doorX, 1.15, roadFrontZ - .04], [0, 0, doorX < 0 ? .32 : -.32]);
  }
  for (const [wx, color] of [[-4.2, 0x111111], [-1.4, 0x0b0d10], [1.4, 0x111111], [4.2, 0x0b0d10]]) {
    assetPart(g, box(town(2.2), 1.05, .1, color), [town(wx), 1.95, roadFrontZ]);
  }
  for (const bx of [-town(1.4), town(4.2)]) {
    assetPart(g, box(town(2.45), .18, .14, 0x6b5138), [bx, 1.93, roadFrontZ - .045], [0, 0, .28]);
    assetPart(g, box(town(2.45), .18, .14, 0x6b5138), [bx, 2.12, roadFrontZ - .045], [0, 0, -.25]);
  }
  for (const sx of [-town(8.4), town(8.9)]) assetPart(g, box(town(2.3), .52, .08, 0x050505), [sx, 2.0, rearZ]);
  addRustPatches(g, [w, h, d], 9, h + .36);

  g.position.set(town(x), 0, town(z));
  scene.add(g);
  registerWorldCollider({ type: 'rect', x: town(x), z: town(z), width: w, depth: d, label: 'gas-station-building' });
  registerWorldCollider({ type: 'rect', x: town(x) + w / 2 + wcW / 2 - town(.4), z: town(z - 1.6), width: wcW, depth: wcD, label: 'gas-station-restroom' });
}

function addGasStationCanopy(scene, x, z) {
  const g = new THREE.Group();
  const w = town(22);
  const d = town(11);
  assetPart(g, box(w, .42, d, 0x6f2930), [0, 4.25, 0]);
  assetPart(g, box(w * .92, .18, d * .82, 0xddd1b4), [0, 4.55, 0]);
  for (const px of [-8.6, 8.6]) for (const pz of [-4.0, 4.0]) {
    const pillarX = town(px);
    const pillarZ = town(pz);
    assetPart(g, box(.42, 4.1, .42, 0x77736a), [pillarX, 2.05, pillarZ]);
    registerWorldCollider({ type: 'circle', x: town(x) + pillarX, z: town(z) + pillarZ, radius: .42, label: 'gas-canopy-pillar' });
  }
  g.position.set(town(x), 0, town(z));
  scene.add(g);
}

function addGasPump(scene, x, z, rotation = 0) {
  const g = new THREE.Group();
  assetPart(g, box(town(1.3), .16, town(1.1), 0x33373d), [0, .08, 0]);
  assetPart(g, box(town(1.0), 1.5, town(.7), 0x9f2f26), [0, .9, 0]);
  assetPart(g, box(town(.72), .34, town(.08), 0x111111), [0, 1.16, town(.39)]);
  assetPart(g, box(town(.2), .58, town(.08), 0x252525), [town(.48), .74, town(.42)]);
  assetPart(g, box(town(.12), .7, town(.12), 0x111111), [town(.72), .74, town(.2)], [0, 0, .2]);
  g.position.set(town(x), 0, town(z));
  g.rotation.y = rotation;
  scene.add(g);
  registerWorldCollider({ type: 'rect', x: town(x), z: town(z), width: town(1.35), depth: town(1.15), rotation, label: 'gas-pump' });
}

function addGasStation(scene, x, z) {
  // Open paved forecourt with two clean road connections into the central roads.
  townRoadSlab(scene, x, z - 2, 42, 34, COLORS.parking);
  townRoadSlab(scene, x - 20, z - 11, 18, 8, COLORS.parking);
  townRoadSlab(scene, x - 9, 18, 10, 20, COLORS.parking);
  townRoadSlab(scene, 18, z - 8, 20, 10, COLORS.parking);
  townStripe(scene, x - 9, 18, .35, 16, 0xcfd3d6);
  townStripe(scene, 18, z - 8, 16, .35, 0xcfd3d6);

  addGasStationBuilding(scene, x - 4, z + 10);
  addGasStationCanopy(scene, x - 3, z - 6);
  for (const [px, pz, rot] of [[x - 9, z - 6, 0], [x - 3, z - 6, 0], [x + 3, z - 6, 0], [x + 9, z - 6, 0]]) addGasPump(scene, px, pz, rot);

  addRubblePatch(scene, x + 13, z + 8, 4);
  addRubblePatch(scene, x - 16, z + 2, 3);
}


function addMotelSurfaceBox(group, wing, face, along, y, w, h, color, thickness = town(.08), rotationZ = 0) {
  const sx = wing.w / 2 + thickness / 2;
  const sz = wing.d / 2 + thickness / 2;
  const mesh = box(w, h, thickness, color);
  if (face === 'west') {
    mesh.position.set(-sx, y, along);
    mesh.rotation.y = Math.PI / 2;
  } else if (face === 'east') {
    mesh.position.set(sx, y, along);
    mesh.rotation.y = Math.PI / 2;
  } else if (face === 'north') {
    mesh.position.set(along, y, sz);
  } else {
    mesh.position.set(along, y, -sz);
  }
  mesh.rotation.z = rotationZ;
  group.add(mesh);
  return mesh;
}

function addMotelDoor(group, wing, face, along, boarded = false) {
  addMotelSurfaceBox(group, wing, face, along, town(.9), town(1.6), town(1.8), 0x33281f, town(.1));
  addMotelSurfaceBox(group, wing, face, along + town(.5), town(.95), town(.08), town(.08), 0xc2a15a, town(.12));
  if (boarded) addMotelSurfaceBox(group, wing, face, along, town(1.22), town(1.9), town(.17), 0x6b5138, town(.12), along < 0 ? .22 : -.22);
}

function addMotelWindow(group, wing, face, along, y, variant = 'dark') {
  const color = variant === 'broken' ? 0x050505 : 0x0b0d10;
  addMotelSurfaceBox(group, wing, face, along, y, town(1.55), town(.95), color, town(.09));
  if (variant === 'boarded') {
    addMotelSurfaceBox(group, wing, face, along, y - town(.12), town(1.8), town(.14), 0x6b5138, town(.12), .28);
    addMotelSurfaceBox(group, wing, face, along, y + town(.14), town(1.8), town(.14), 0x6b5138, town(.12), -.24);
  } else if (variant === 'broken') {
    addMotelSurfaceBox(group, wing, face, along - town(.36), y + town(.18), town(.42), town(.18), 0x3f4548, town(.1), -.25);
    addMotelSurfaceBox(group, wing, face, along + town(.28), y - town(.22), town(.32), town(.2), 0x3f4548, town(.1), .32);
  }
}

function addMotelWing(scene, x, z, w, d, frontFace, label) {
  const group = new THREE.Group();
  const wing = { w: town(w), d: town(d) };
  const h = town(6.2);
  assetPart(group, box(wing.w, h, wing.d, 0x6b6658), [0, h / 2, 0]);
  assetPart(group, box(wing.w + town(1.0), town(.38), wing.d + town(1.0), 0x292b38), [0, h + town(.19), 0]);
  assetPart(group, box(wing.w + town(.5), town(.18), wing.d + town(.5), 0x827a66), [0, town(2.75), 0]);

  const alongLimit = (frontFace === 'west' || frontFace === 'east') ? d : w;
  const roomCount = alongLimit > 30 ? 5 : 4;
  for (let i = 0; i < roomCount; i++) {
    const t = roomCount === 1 ? 0 : i / (roomCount - 1);
    const along = town(-alongLimit * .36 + t * alongLimit * .72);
    addMotelDoor(group, wing, frontFace, along, i === 1 || i === roomCount - 1);
    addMotelWindow(group, wing, frontFace, along, town(4.15), i % 3 === 0 ? 'boarded' : (i % 3 === 1 ? 'broken' : 'dark'));
  }
  addMotelSurfaceBox(group, wing, frontFace, town(alongLimit * .43), town(1.85), town(2.1), town(.9), 0x0b0d10, town(.09));
  addMotelSurfaceBox(group, wing, frontFace, town(alongLimit * .43), town(4.95), town(2.4), town(.18), 0x8a4b2f, town(.11), .12);
  addMotelSurfaceBox(group, wing, frontFace, town(alongLimit * .43), town(5.18), town(2.0), town(.14), 0x8a4b2f, town(.11), -.18);
  addRustPatches(group, [wing.w, h, wing.d], 7, h + town(.42));

  group.position.set(town(x), 0, town(z));
  scene.add(group);
  registerWorldCollider({ type: 'rect', x: town(x), z: town(z), width: wing.w, depth: wing.d, label });
}

function addMotelSign(scene, x, z) {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3b2529';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#d9b64c';
  ctx.fillRect(0, 0, canvas.width, 10);
  ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
  ctx.font = 'bold 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 8;
  ctx.fillStyle = '#f4ead0';
  ctx.strokeText('MOTEL', canvas.width / 2, canvas.height / 2 + 4);
  ctx.fillText('MOTEL', canvas.width / 2, canvas.height / 2 + 4);
  assetPart(group, box(town(.38), town(4.2), town(.38), 0x3f4548), [town(-1.9), town(1.7), 0]);
  assetPart(group, box(town(.38), town(4.2), town(.38), 0x3f4548), [town(1.9), town(1.7), 0]);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(town(7.2), town(3.1), town(.22)), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), roughness: .9 }));
  sign.position.set(0, town(5.4), 0);
  group.add(sign);
  group.position.set(town(x), 0, town(z));
  group.rotation.y = Math.PI / 2;
  scene.add(group);
  registerWorldCollider({ type: 'rect', x: town(x), z: town(z), width: town(1.3), depth: town(4.4), label: 'motel-sign' });
}

function addMotelZone(scene) {
  // Abandoned L-shaped motel in the former parking/junk lot corner. The solid wings hug
  // the south/east map edges while the open side faces inward to the combat-friendly lot.
  townRoadSlab(scene, 40, -39, 42, 40, COLORS.parking);
  townRoadSlab(scene, 16, -35, 18, 10, COLORS.parking);
  townStripe(scene, 12, -35, 10, .35, 0xcfd3d6);
  townSidewalkSlab(scene, 50.8, -39, 2.2, 26, COLORS.sidewalk);
  townSidewalkSlab(scene, 39.4, -50.8, 24, 2.2, COLORS.sidewalk);

  addMotelWing(scene, 56, -43, 9, 34, 'west', 'motel-east-wing');
  addMotelWing(scene, 42, -56, 29, 8.5, 'north', 'motel-south-wing');

  addParkingStripes(scene, 30.5, -22.5);
  addParkingStripes(scene, 35.4, -46.6);
  addParkingStripes(scene, 46.6, -34.2, 90);
  createBurntSedan({ scene, position: [town(31), 0, town(-32)], rotation: .16, scale: town(.74) });
  createBurntPickupTruck({ scene, position: [town(46), 0, town(-39)], rotation: Math.PI - .28, scale: town(.72) });
  addRubblePatch(scene, 51, -29, 3);
  addRubblePatch(scene, 33, -52, 3);
  addMotelSign(scene, 13, -27);
  townLotLabel(scene, 'MOTEL', 38, -59);
}

function addDistricts(scene) {
  // Four simple themed corners around the central road crossing.
  townSlab(scene, -38, 38, 44, 44, COLORS.grassAlt);
  townSlab(scene, 38, 38, 44, 44, COLORS.grassAlt);
  townSlab(scene, -38, -38, 44, 44, COLORS.grassAlt);
  townSlab(scene, 38, -38, 44, 44, COLORS.junk);

  // Residential corner: compact abandoned neighborhood with low-poly peaked-roof homes.
  addResidentialNeighborhood(scene);
  townLotLabel(scene, 'RESIDENTIAL', -43, 20);

  // Gas / convenience store corner with one solid shop and non-blocking pump details.
  addGasStation(scene, 40, 42);
  createBurntRV({ scene, position: [town(55), 0, town(34)], rotation: -.08, scale: town(.74) });
  townLotLabel(scene, 'GAS', 38, 20);

  // Park corner: mostly open grass, with only a few large tree trunks as meaningful blockers.
  [[-55, -50], [-38, -43], [-52, -27], [-25, -55], [-28, -30]].forEach(([x, z]) => createStreetTree({ scene, position: [town(x), 0, town(z)], scale: town(.9) }));
  townSidewalkSlab(scene, -38, -38, 33, 3, COLORS.path);
  townSidewalkSlab(scene, -38, -38, 3, 33, COLORS.path);
  townLotLabel(scene, 'PARK', -43, -57);

  // Motel corner: L-shaped two-story motel with an open inner parking lot.
  addMotelZone(scene);

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
