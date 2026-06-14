import * as THREE from 'three';
import { CONFIG } from './config.js';
import { initInput, consumePress, resetTouchMovement } from './input.js';
import { initUI, updateHUD, showScreen, hideOverlays, showUpgrades, showEnd, setMuted, updateMenuCoins, setGameActionsVisible, setPauseButtonVisible } from './ui.js';
import { addCoins } from './save.js';
import { createWorld } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnZombie, updateZombies, damageZombies, resetZombies, getSpawnDelay } from './zombies.js';
import { dropXp, dropMedkit, updatePickups, resetPickups, countWorldMedkits } from './pickups.js';
import { getUpgradeChoices, applyUpgrade } from './upgrades.js';
import { resetAbilities, updateAbilities, unlockAbility, applyAbilityUpgrade, isAbilityCard } from './abilities.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 160);
const clock = new THREE.Clock();
let player;
let mode = 'menu';
let muted = false;
let spawnTimer = 0;
let worldMedkitTimer = CONFIG.medkit.worldFirstSpawn;
let pulseTimer = 0;
let pulseVisuals = [];
let hitParticles = [];
let healFloaters = [];
let attackVisualTimer = 0;
let cameraShake = 0;
let pendingChoices = [];
const cameraControls = {
  yaw: Math.atan2(CONFIG.camera.offset.x, CONFIG.camera.offset.z),
  pitch: Math.atan2(CONFIG.camera.offset.y, Math.hypot(CONFIG.camera.offset.x, CONFIG.camera.offset.z)),
  distance: Math.hypot(CONFIG.camera.offset.x, CONFIG.camera.offset.y, CONFIG.camera.offset.z),
  targetDistance: Math.hypot(CONFIG.camera.offset.x, CONFIG.camera.offset.y, CONFIG.camera.offset.z),
  dragging: false,
  touchPointerId: null,
  pointerButton: null,
  lastX: 0,
  lastY: 0,
  touchPointers: new Map(),
  pinching: false,
  pinchStartDistance: 0,
  pinchStartCameraDistance: 0,
};
const cameraLimits = {
  minPitch: 0.32,
  maxPitch: 1.25,
  minDistance: CONFIG.camera.minDistance,
  maxDistance: CONFIG.camera.maxDistance,
  yawSpeed: 0.0055,
  pitchSpeed: 0.0042,
  touchYawSpeed: 0.0042,
  touchPitchSpeed: 0.0034,
  zoomSpeed: 0.0025,
};

const state = {
  elapsed: 0, health: 100, maxHealth: 100, level: 1, xp: 0, nextXp: CONFIG.level.baseXp,
  coins: 0, kills: 0, pulseCooldown: CONFIG.pulse.cooldown, pulseRange: CONFIG.pulse.range,
  pulseDamage: CONFIG.pulse.damage, speedMultiplier: 1, bossSpawnCount: 0, batKnockback: 0,
};

initInput();
initCameraControls();
createWorld(scene);
initUI({ onStart: startGame, onUpgrade: chooseUpgrade, onMenu: returnToMenu, onPause: pauseGame, onResume: resumeGame, onFullscreen: requestGameFullscreen });
showScreen('menu-screen');

function resetState() {
  Object.assign(state, { elapsed: 0, health: CONFIG.player.maxHealth, maxHealth: CONFIG.player.maxHealth, level: 1, xp: 0,
    nextXp: CONFIG.level.baseXp, coins: 0, kills: 0, pulseCooldown: CONFIG.pulse.cooldown, pulseRange: CONFIG.pulse.range,
    pulseDamage: CONFIG.pulse.damage, speedMultiplier: 1, bossSpawnCount: 0, batKnockback: 0 });
  resetAbilities(scene, state);
  spawnTimer = 0; worldMedkitTimer = CONFIG.medkit.worldFirstSpawn; pulseTimer = 0; pendingChoices = [];
}

function startGame() {
  resetState();
  if (player) scene.remove(player);
  resetZombies(scene); resetPickups(scene);
  resetAbilities(scene, state);
  pulseVisuals.forEach((v) => scene.remove(v)); pulseVisuals = [];
  hitParticles.forEach((p) => scene.remove(p)); hitParticles = [];
  healFloaters.forEach((p) => scene.remove(p)); healFloaters = [];
  attackVisualTimer = 0; cameraShake = 0;
  player = createPlayer(scene);
  hideOverlays(); document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  setGameActionsVisible(true); setPauseButtonVisible(true); document.body.classList.remove('paused');
  mode = 'playing';
}

function returnToMenu() { mode = 'menu'; setGameActionsVisible(false); document.body.classList.remove('paused'); showScreen('menu-screen'); updateMenuCoins(); }

function pauseGame() {
  if (mode !== 'playing') return;
  mode = 'paused';
  resetTouchMovement();
  stopCameraTouchControls();
  document.body.classList.add('paused');
  showScreen('pause-screen');
}

function resumeGame() {
  if (mode !== 'paused') return;
  mode = 'playing';
  document.body.classList.remove('paused');
  hideOverlays();
  document.getElementById('hud').classList.remove('hidden');
}

async function requestGameFullscreen() {
  const root = document.getElementById('game-root');
  try {
    if (!document.fullscreenElement && root?.requestFullscreen) await root.requestFullscreen();
    if (screen.orientation?.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch (_) {
    // Fullscreen and orientation lock support varies across mobile browsers. Playing remains optional.
  }
}

function chooseUpgrade(id) {
  if (id.startsWith('unlock_')) unlockAbility(scene, state, id.replace('unlock_', ''), player);
  else if (isAbilityCard(id)) applyAbilityUpgrade(scene, state, id, player);
  else applyUpgrade(state, id);
  hideOverlays(); document.getElementById('hud').classList.remove('hidden');
  setPauseButtonVisible(true);
  mode = 'playing';
}

function getXpReward(baseAmount) {
  const elapsedAfterMultiplier = Math.max(0, state.elapsed - CONFIG.rewards.xpMultiplierStartTime);
  const elapsedMinutes = elapsedAfterMultiplier / 60;
  const multiplier = Math.min(
    CONFIG.rewards.maxXpMultiplier,
    1 + elapsedMinutes * CONFIG.rewards.xpMultiplierPerMinute,
  );
  return Math.ceil(baseAmount * multiplier);
}

function getNextLevelXp() {
  const growth = state.level >= CONFIG.level.lateGrowthStartLevel ? CONFIG.level.lateGrowth : CONFIG.level.growth;
  return Math.floor(state.nextXp * growth);
}

function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp; state.level += 1; state.nextXp = getNextLevelXp();
    pendingChoices = getUpgradeChoices(state); mode = 'upgrade'; setPauseButtonVisible(false); stopCameraTouchControls(); resetTouchMovement(); showUpgrades(pendingChoices); break;
  }
}

function collectPickup(pickup) {
  if (pickup.kind === 'xp') {
    gainXp(pickup.value);
    return;
  }
  if (pickup.kind === 'medkit') {
    const oldHealth = state.health;
    state.health = Math.min(state.maxHealth, state.health + pickup.healAmount);
    createHealFloater(player.position, Math.ceil(state.health - oldHealth));
  }
}

function createHealFloater(position, amount) {
  if (amount <= 0) return;
  const canvasText = document.createElement('canvas');
  canvasText.width = 128; canvasText.height = 64;
  const ctx = canvasText.getContext('2d');
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#9d1f2d';
  ctx.lineWidth = 6;
  const text = `+${amount} HP`;
  ctx.strokeText(text, 64, 42);
  ctx.fillText(text, 64, 42);
  const texture = new THREE.CanvasTexture(canvasText);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.set(position.x, 2.6, position.z);
  sprite.scale.set(2.4, 1.2, 1);
  sprite.userData = { life: .9, maxLife: .9 };
  scene.add(sprite); healFloaters.push(sprite);
}

function maybeDropMedkit(position, type, typeKey) {
  const chance = type.medkitChance ?? CONFIG.zombie.types[typeKey]?.medkitChance ?? 0;
  if (Math.random() < chance) dropMedkit(scene, position, 'zombie');
}

function scheduleNextWorldMedkit() {
  const { worldSpawnMin, worldSpawnMax } = CONFIG.medkit;
  worldMedkitTimer = worldSpawnMin + Math.random() * (worldSpawnMax - worldSpawnMin);
}

function spawnWorldMedkit() {
  if (countWorldMedkits() >= CONFIG.medkit.maxWorldActive) return;
  const angle = Math.random() * Math.PI * 2;
  const distance = CONFIG.medkit.spawnMinDistance + Math.random() * (CONFIG.medkit.spawnMaxDistance - CONFIG.medkit.spawnMinDistance);
  const half = CONFIG.arenaSize / 2 - 3;
  const position = new THREE.Vector3(
    THREE.MathUtils.clamp(player.position.x + Math.cos(angle) * distance, -half, half),
    0,
    THREE.MathUtils.clamp(player.position.z + Math.sin(angle) * distance, -half, half),
  );
  dropMedkit(scene, position, 'world');
}

function createPulseVisual() {
  const arc = new THREE.Mesh(new THREE.RingGeometry(state.pulseRange * .72, state.pulseRange, 48, 1, -Math.PI * .68, Math.PI * 1.36), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: .9, side: THREE.DoubleSide }));
  arc.rotation.x = -Math.PI / 2; arc.rotation.z = -player.rotation.y; arc.position.copy(player.position); arc.position.y = .16;
  arc.userData.life = CONFIG.pulse.visualDuration; arc.userData.maxLife = CONFIG.pulse.visualDuration; arc.scale.setScalar(.25);
  scene.add(arc); pulseVisuals.push(arc);
  attackVisualTimer = CONFIG.pulse.visualDuration; cameraShake = .12;
}

function createHitParticles(position) {
  for (let i = 0; i < 5; i++) {
    const spark = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .16), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff1a8 : 0xffb703, transparent: true, opacity: 1 }));
    spark.position.set(position.x + (Math.random() - .5) * .55, 1 + Math.random() * .85, position.z + (Math.random() - .5) * .55);
    spark.userData = { life: .36, velocity: new THREE.Vector3((Math.random() - .5) * 3, 2 + Math.random() * 2, (Math.random() - .5) * 3) };
    scene.add(spark); hitParticles.push(spark);
  }
}

function doPulse() {
  createPulseVisual();
  damageZombies(scene, player.position, state.pulseRange, state.pulseDamage, (position, type, typeKey) => {
    state.kills += 1; state.coins += type.coins; dropXp(scene, position, getXpReward(type.xp));
    maybeDropMedkit(position, type, typeKey);
  }, createHitParticles, state.batKnockback);
}

function endRun(won) {
  mode = 'ended'; setGameActionsVisible(false); document.body.classList.remove('paused'); addCoins(state.coins);
  showEnd({ won, time: state.elapsed, kills: state.kills, level: state.level, coins: state.coins });
}

function initCameraControls() {
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  canvas.addEventListener('mousedown', (event) => {
    if (mode !== 'playing' || (event.button !== 2 && event.button !== 0)) return;
    event.preventDefault();
    cameraControls.dragging = true;
    cameraControls.pointerButton = event.button;
    cameraControls.lastX = event.clientX;
    cameraControls.lastY = event.clientY;
    if (event.button === 2 && canvas.requestPointerLock) canvas.requestPointerLock();
  });

  const stopDrag = () => {
    cameraControls.dragging = false;
    cameraControls.pointerButton = null;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  };

  window.addEventListener('mouseup', (event) => {
    if (!cameraControls.dragging || event.button !== cameraControls.pointerButton) return;
    stopDrag();
  });
  window.addEventListener('blur', stopDrag);

  window.addEventListener('mousemove', (event) => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && !cameraControls.dragging) return;
    const movementX = locked ? event.movementX : event.clientX - cameraControls.lastX;
    const movementY = locked ? event.movementY : event.clientY - cameraControls.lastY;
    cameraControls.lastX = event.clientX;
    cameraControls.lastY = event.clientY;
    cameraControls.yaw -= movementX * cameraLimits.yawSpeed;
    cameraControls.pitch = THREE.MathUtils.clamp(
      cameraControls.pitch + movementY * cameraLimits.pitchSpeed,
      cameraLimits.minPitch,
      cameraLimits.maxPitch,
    );
  });


  const getPinchDistance = () => {
    const points = [...cameraControls.touchPointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const beginPinch = () => {
    const pinchDistance = getPinchDistance();
    if (pinchDistance <= 0) return;
    cameraControls.pinching = true;
    cameraControls.touchPointerId = null;
    cameraControls.pinchStartDistance = pinchDistance;
    cameraControls.pinchStartCameraDistance = cameraControls.targetDistance;
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (mode !== 'playing' || event.pointerType === 'mouse') return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    cameraControls.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraControls.touchPointers.size >= 2) {
      beginPinch();
      return;
    }
    if (event.clientX < window.innerWidth * 0.45) return;
    cameraControls.touchPointerId = event.pointerId;
    cameraControls.lastX = event.clientX;
    cameraControls.lastY = event.clientY;
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!cameraControls.touchPointers.has(event.pointerId) && cameraControls.touchPointerId !== event.pointerId) return;
    event.preventDefault();
    if (cameraControls.touchPointers.has(event.pointerId)) cameraControls.touchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cameraControls.pinching && cameraControls.touchPointers.size >= 2) {
      const pinchDistance = getPinchDistance();
      if (pinchDistance > 0) {
        cameraControls.targetDistance = THREE.MathUtils.clamp(
          cameraControls.pinchStartCameraDistance * (cameraControls.pinchStartDistance / pinchDistance),
          cameraLimits.minDistance,
          cameraLimits.maxDistance,
        );
      }
      return;
    }
    if (cameraControls.touchPointerId !== event.pointerId) return;
    const movementX = event.clientX - cameraControls.lastX;
    const movementY = event.clientY - cameraControls.lastY;
    cameraControls.lastX = event.clientX;
    cameraControls.lastY = event.clientY;
    cameraControls.yaw -= movementX * cameraLimits.touchYawSpeed;
    cameraControls.pitch = THREE.MathUtils.clamp(
      cameraControls.pitch + movementY * cameraLimits.touchPitchSpeed,
      cameraLimits.minPitch,
      cameraLimits.maxPitch,
    );
  });

  const stopTouchDrag = (event) => {
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    cameraControls.touchPointers.delete(event.pointerId);
    if (cameraControls.touchPointerId === event.pointerId) cameraControls.touchPointerId = null;
    if (cameraControls.touchPointers.size < 2) cameraControls.pinching = false;
  };
  canvas.addEventListener('pointerup', stopTouchDrag);
  canvas.addEventListener('pointercancel', stopTouchDrag);

  canvas.addEventListener('wheel', (event) => {
    if (mode !== 'playing') return;
    event.preventDefault();
    cameraControls.targetDistance = THREE.MathUtils.clamp(
      cameraControls.targetDistance * (1 + event.deltaY * cameraLimits.zoomSpeed),
      cameraLimits.minDistance,
      cameraLimits.maxDistance,
    );
  }, { passive: false });
}

function stopCameraTouchControls() {
  cameraControls.touchPointerId = null;
  cameraControls.pinching = false;
  cameraControls.touchPointers.clear();
}

function updateCamera(delta) {
  cameraControls.distance = THREE.MathUtils.lerp(cameraControls.distance, cameraControls.targetDistance, 1 - Math.exp(-14 * delta));
  const target = new THREE.Vector3(player.position.x, 0.8, player.position.z);
  const horizontalDistance = Math.cos(cameraControls.pitch) * cameraControls.distance;
  const desired = target.clone().add(new THREE.Vector3(
    Math.sin(cameraControls.yaw) * horizontalDistance,
    Math.sin(cameraControls.pitch) * cameraControls.distance,
    Math.cos(cameraControls.yaw) * horizontalDistance,
  ));
  if (cameraShake > 0) desired.x += (Math.random() - .5) * cameraShake;
  camera.position.copy(desired);
  camera.lookAt(target);
}

function resize() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix();
  }
}

function tick() {
  requestAnimationFrame(tick);
  const delta = Math.min(clock.getDelta(), 0.05);
  resize();
  if (consumePress('m')) { muted = !muted; setMuted(muted); }
  if ((consumePress('p') || consumePress('escape')) && (mode === 'playing' || mode === 'paused')) { mode === 'playing' ? pauseGame() : resumeGame(); }

  if (mode === 'playing') {
    state.elapsed += delta;
    const savedSpeed = CONFIG.player.speed;
    CONFIG.player.speed = savedSpeed * state.speedMultiplier;
    attackVisualTimer = Math.max(0, attackVisualTimer - delta);
    cameraShake = Math.max(0, cameraShake - delta);
    updatePlayer(player, delta, attackVisualTimer, cameraControls.yaw);
    CONFIG.player.speed = savedSpeed;
    spawnTimer -= delta; pulseTimer -= delta; worldMedkitTimer -= delta;
    if (spawnTimer <= 0) {
      const spawned = spawnZombie(scene, { elapsed: state.elapsed, level: state.level, bossSpawnCount: state.bossSpawnCount });
      if (spawned?.userData.typeKey === 'boss') state.bossSpawnCount += 1;
      spawnTimer = getSpawnDelay(state.elapsed);
    }
    if (worldMedkitTimer <= 0) {
      spawnWorldMedkit();
      scheduleNextWorldMedkit();
    }
    updateZombies(player, delta, (damage) => { state.health = Math.max(0, state.health - damage); });
    updatePickups(scene, player, delta, collectPickup);
    if (pulseTimer <= 0) { doPulse(); pulseTimer = state.pulseCooldown; }
    updateAbilities(scene, state, player, delta, (position, type, typeKey) => {
      state.kills += 1; state.coins += type.coins; dropXp(scene, position, getXpReward(type.xp));
      maybeDropMedkit(position, type, typeKey);
    }, createHitParticles);
    if (state.health <= 0) endRun(false);
    if (state.elapsed >= CONFIG.runDuration) endRun(true);
    updateHUD(state); updateCamera(delta);
  }

  if (mode === 'playing') {
  pulseVisuals = pulseVisuals.filter((ring) => {
    ring.userData.life -= delta;
    const t = Math.max(0, ring.userData.life / ring.userData.maxLife);
    ring.material.opacity = t * .9; ring.scale.setScalar(.25 + (1 - t) * .9);
    if (ring.userData.life <= 0) { scene.remove(ring); return false; }
    return true;
  });
  hitParticles = hitParticles.filter((spark) => {
    spark.userData.life -= delta; spark.position.addScaledVector(spark.userData.velocity, delta);
    spark.userData.velocity.y -= 7 * delta; spark.material.opacity = Math.max(0, spark.userData.life / .36);
    if (spark.userData.life <= 0) { scene.remove(spark); return false; }
    return true;
  });
  healFloaters = healFloaters.filter((sprite) => {
    sprite.userData.life -= delta;
    sprite.position.y += delta * 1.1;
    sprite.material.opacity = Math.max(0, sprite.userData.life / sprite.userData.maxLife);
    if (sprite.userData.life <= 0) {
      sprite.material.map.dispose(); sprite.material.dispose(); scene.remove(sprite); return false;
    }
    return true;
  });
  }
  renderer.render(scene, camera);
}

tick();
