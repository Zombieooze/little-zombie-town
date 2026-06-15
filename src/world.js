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

function finishAsset(group, options, collider) {
  applyAssetPlacement(group, options);
  if (options.scene) options.scene.add(group);
  if (options.collide !== false && collider) {
    const scale = options.scale ?? 1;
    const x = group.position.x;
    const z = group.position.z;
    if (collider.type === 'circle') registerWorldCollider({ ...collider, x, z, radius: collider.radius * scale });
    else registerWorldCollider({ ...collider, x, z, width: collider.width * scale, depth: collider.depth * scale });
  }
  return group;
}

function createBurntVehicle(options = {}, kind = 'sedan') {
  const dims = { sedan: [3.8, .75, 1.7], van: [4.5, 1.35, 1.95], pickup: [4.3, .85, 1.85], rv: [5.2, 1.65, 2.2] }[kind];
  const color = { sedan: 0x4a4a42, van: 0x6b665c, pickup: 0x52675d, rv: 0x8a806d }[kind];
  const g = new THREE.Group();
  assetPart(g, box(dims[0], dims[1], dims[2], color), [0, dims[1] / 2 + .28, 0]);
  if (kind === 'pickup') assetPart(g, box(1.4, .62, dims[2] * .92, 0x35463e), [-.85, 1.05, 0]);
  else assetPart(g, box(dims[0] * .52, .7, dims[2] * .9, 0x303236), [-.25, dims[1] + .55, 0]);
  if (kind === 'rv') assetPart(g, box(1.1, 1.25, dims[2] * .9, 0x7c6f5f), [1.25, 1.18, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) assetPart(g, new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .28, 10), ASSET_MATS.black), [sx * dims[0] * .34, .35, sz * dims[2] * .54], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) assetPart(g, box(.08, .04, dims[2] + .08, i % 2 ? 0x2d2b28 : 0x8a4b2f), [-dims[0] * .4 + i * dims[0] * .16, dims[1] + .93, 0]);
  assetPart(g, box(dims[0] * .82, .08, .08, 0x8a4b2f), [0, dims[1] + .08, -dims[2] * .51]);
  return finishAsset(g, options, { type: 'circle', radius: Math.max(dims[0], dims[2]) * .48, label: `burnt-${kind}` });
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
  return finishAsset(g, options, ['lamp','street','bus','stop'].includes(type) ? { type: 'circle', radius: .28, label: `${type}-post` } : null);
}
export const createLampPost = (options = {}) => createPostSign(options, 'lamp');
export const createStopSign = (options = {}) => createPostSign(options, 'stop');
export const createStreetSign = (options = {}) => createPostSign(options, 'street');
export const createBusStopSign = (options = {}) => createPostSign(options, 'bus');

export function createConcreteBarrier(options = {}) { const g = new THREE.Group(); assetPart(g, box(2.8, .9, .55, 0x77736a), [0,.45,0]); assetPart(g, box(2.5,.12,.08,0xd9b64c), [0,.68,-.3]); return finishAsset(g, options, { type:'circle', radius:1.45, label:'concrete-barrier'}); }
export function createTrafficCone(options = {}) { const g=new THREE.Group(); assetPart(g, box(.8,.08,.8,0xc96f24), [0,.04,0]); assetPart(g, new THREE.Mesh(new THREE.ConeGeometry(.34,1.0,6), ASSET_MATS.orange), [0,.58,0]); assetPart(g, box(.55,.12,.55,0xe8dfcf), [0,.36,0]); return finishAsset(g, options, null); }
export function createRoadBarricade(options = {}) { const g=new THREE.Group(); for (const y of [.75,1.35]) assetPart(g, box(2.6,.24,.16, y>.8?0xe8dfcf:0xc96f24), [0,y,0]); for (const x of [-1.1,1.1]) assetPart(g, box(.18,1.4,.18,0x5a5147), [x,.7,0]); return finishAsset(g, options, {type:'circle', radius:1.35, label:'road-barricade'}); }
export function createUtilityPole(options = {}) { const g=new THREE.Group(); assetPart(g, box(.28,3.0,.28,0x6b5138), [0,1.5,0]); assetPart(g, box(1.8,.18,.18,0x6b5138), [0,2.65,0]); assetPart(g, new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.55,8), ASSET_MATS.metal), [-.55,1.6,0]); return finishAsset(g, options, {type:'circle', radius:.32, label:'utility-pole'}); }
export function createFireHydrant(options = {}) { const g=new THREE.Group(); assetPart(g,new THREE.Mesh(new THREE.CylinderGeometry(.23,.28,.85,8),ASSET_MATS.red),[0,.43,0]); assetPart(g,new THREE.Mesh(new THREE.SphereGeometry(.28,8,6),ASSET_MATS.red),[0,.9,0]); assetPart(g,box(.9,.18,.18,0x7a2c25),[0,.55,0]); return finishAsset(g, options, null); }

function createTreeAsset(options={}, kind='street') { const g=new THREE.Group(); const trunkColor=kind==='burnt'?0x1f1f1f:(kind==='dead'?0x5a5147:0x4a3326); assetPart(g, box(.45,2.2,.45,trunkColor), [0,1.1,0]); for(let i=0;i<5;i++) assetPart(g, box(.16,1.2,.16,trunkColor), [Math.sin(i)*.45,2.0+i*.13,Math.cos(i)*.45], [.45,0,i]); if(kind==='street') for(const p of [[0,3,0],[-.75,2.55,.15],[.72,2.55,.05]]) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.85,0),ASSET_MATS.leaf),p); return finishAsset(g, options, {type:'circle', radius: kind==='street'?1.05:.7, label:`${kind}-tree`}); }
export const createStreetTree=(options={})=>createTreeAsset(options,'street'); export const createDeadTree=(options={})=>createTreeAsset(options,'dead'); export const createBurntTree=(options={})=>createTreeAsset(options,'burnt');
export function createBush(options={}) { const g=new THREE.Group(); for(const p of [[0,.45,0],[-.45,.38,.1],[.45,.38,-.1]]) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.55,0),ASSET_MATS.leafDark),p); return finishAsset(g, options, null); }
export function createHedge(options={}) { const g=new THREE.Group(); for(let i=-2;i<=2;i++) assetPart(g,new THREE.Mesh(new THREE.DodecahedronGeometry(.55,0),ASSET_MATS.leafDark),[i*.45,.55,0]); return finishAsset(g, options, {type:'rect', width:2.7, depth:.8, label:'hedge'}); }
export function createMailbox(options={}) { const g=new THREE.Group(); assetPart(g,box(.18,1,.18,0x6b5138),[0,.5,0]); assetPart(g,box(.85,.42,.48,0x5f6970),[0,1.14,0]); assetPart(g,box(.08,.35,.28,0x9f2f26),[.48,1.34,0]); return finishAsset(g, options, null); }
export function createWoodFenceSection(options={}) { const g=new THREE.Group(); for(let x=-1.2;x<=1.2;x+=.6) assetPart(g,box(.18,1.25,.12,0x6b5138),[x,.62,0]); for(const y of [.45,.9]) assetPart(g,box(3,.16,.16,0x6b5138),[0,y,0]); return finishAsset(g, options, {type:'rect', width:3, depth:.35, label:'wood-fence'}); }
export function createChainLinkFence(options={}) { const g=new THREE.Group(); for(const x of [-1.4,1.4]) assetPart(g,box(.16,1.55,.16,0x686868),[x,.78,0]); for(let i=-5;i<=5;i++) assetPart(g,box(.04,1.55,.04,0x9ca3af),[i*.26,.8,0],[0,0,.65]); assetPart(g,box(3,.08,.08,0x9ca3af),[0,1.5,0]); return finishAsset(g, options, {type:'rect', width:3, depth:.3, label:'chain-link-fence'}); }
export function createBench(options={}) { const g=new THREE.Group(); assetPart(g,box(2,.18,.45,0x55603f),[0,.55,0]); assetPart(g,box(2,.18,.35,0x55603f),[0,.95,.25],[-.25,0,0]); for(const x of [-.75,.75]) assetPart(g,box(.16,.55,.16,0x5a5147),[x,.28,0]); return finishAsset(g, options, {type:'rect', width:2.1, depth:.75, label:'bench'}); }
export function createPicnicTable(options={}) { const g=new THREE.Group(); assetPart(g,box(2.2,.18,.8,0x6b5138),[0,.8,0]); for(const z of [-.75,.75]) assetPart(g,box(2.1,.16,.35,0x6b5138),[0,.48,z]); for(const x of [-.8,.8]) assetPart(g,box(.16,.75,.16,0x5a5147),[x,.38,0],[0,0,.25]); return finishAsset(g, options, {type:'rect', width:2.4, depth:1.9, label:'picnic-table'}); }
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
export function createPlaygroundSlide(options={}) { const g=new THREE.Group(); assetPart(g,box(.75,.12,2.4,0xb84e36),[0,.65,0],[.55,0,0]); assetPart(g,box(.12,1.4,.12,0x3f4548),[-.42,.7,-.75]); assetPart(g,box(.12,1.4,.12,0x3f4548),[.42,.7,-.75]); return finishAsset(g, options, {type:'rect', width:1.1, depth:2.4, label:'playground-slide'}); }
export function createPlaygroundSwings(options={}) { const g=new THREE.Group(); for(const x of [-1.2,1.2]) { assetPart(g,box(.12,2.2,.12,0x6b5138),[x,1.1,-.55],[0,0,.22*x]); assetPart(g,box(.12,2.2,.12,0x6b5138),[x,1.1,.55],[0,0,-.22*x]); } assetPart(g,box(2.8,.14,.14,0x6b5138),[0,2.15,0]); for(const x of [-.55,.55]) assetPart(g,box(.55,.08,.35,0x252525),[x,.55,0]); return finishAsset(g, options, {type:'rect', width:3, depth:1.4, label:'playground-swings'}); }

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
  createStreetTree({ scene, position: [town(x), 0, town(z)], scale: town(1) });
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

function addAssetPackSamples(scene) {
  const samples = [
    [createBurntSedan, -18, -5, .2], [createBurntVan, 35, 4, Math.PI / 2], [createBurntPickupTruck, 17, -55, -.1],
    [createLampPost, -8, 8, 0], [createStopSign, 8, 8, Math.PI / 4], [createStreetSign, -58, 8, 0],
    [createConcreteBarrier, -89, -61, .08], [createRoadBarricade, -75, -61, .2], [createUtilityPole, 61, -44, 0], [createFireHydrant, 70, -17, 0],
    [createDeadTree, -95, 67, 0], [createBurntTree, -76, -73, 0], [createHedge, 72, 59, Math.PI / 2],
    [createWoodFenceSection, 90, 64, 0], [createChainLinkFence, -94, -62, 0], [createBench, -84, 73, 0], [createPicnicTable, -72, 82, .15],
    [createMailbox, 68, 88, 0], [createPlanter, 6, 8, 0], [createWoodenShed, 99, -76, 0],
    [createDumpster, -68, -91, .1], [createGarbageBags, -71, -88, 0], [createTirePile, -90, -81, 0], [createScrapPile, -83, -91, 0],
    [createBarrelStack, -99, -88, 0], [createCrateStack, -77, -76, 0], [createWoodDebris, -91, -71, 0], [createTrashCan, 42, 7, 0],
    [createBusStopSign, -50, 48, 0], [createPlaygroundSlide, -30, 79, .2], [createPlaygroundSwings, -37, 88, 0], [createJunkPile, -66, -86, 0],
    [createTrafficCone, 25, -65, 0], [createBurntRV, 28, -87, Math.PI / 2], [createBush, 95, 88, 0],
  ];
  samples.forEach(([factory, x, z, rotation]) => factory({ scene, position: [town(x), 0, town(z)], rotation, scale: town(1) }));
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
  addAssetPackSamples(scene);
}
