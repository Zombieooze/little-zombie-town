import * as THREE from 'three';
import { CONFIG } from './config.js';
import { initInput, consumePress, resetTouchMovement, updateGamepadInput, getGamepadLookVector, consumeGamepadPress, setControllerStatusCallback, isGamepadDown } from './input.js';
import { initUI, updateHUD, showScreen, hideOverlays, showUpgrades, showEnd, setMuted, updateMenuCoins, setGameActionsVisible, setPauseButtonVisible, setFullscreenActive, showControllerMessage, moveUpgradeSelection, getSelectedUpgradeId, moveMenuSelection, activateMenuSelection, showDamageFlash, showBossWarning, updateBossHealthBar, showShop } from './ui.js';
import { addCoins, getPermanentUpgradeLevels } from './save.js';
import { calculatePermanentStats } from './permanent-upgrades.js';
import { createWorld } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnZombie, spawnBossZombie, getActiveBoss, updateZombies, damageZombies, resetZombies, getSpawnDelay } from './zombies.js';
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
let controllerNavCooldown = 0;
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
  gamepadZoomSpeed: 13,
};

const state = {
  elapsed: 0, health: 100, maxHealth: 100, level: 1, xp: 0, nextXp: CONFIG.level.baseXp,
  coins: 0, kills: 0, pulseCooldown: CONFIG.pulse.cooldown, pulseRange: CONFIG.pulse.range,
  pulseDamage: CONFIG.pulse.damage, damageMultiplier: 1, speedMultiplier: 1, pickupMagnetMultiplier: 1, coinMultiplier: 1, xpMultiplier: 1, healthRegen: 0, maxStamina: 0, stamina: 0, bossSpawnCount: 0, bossEventsTriggered: [], batKnockback: 0, cooldownMultiplier: 1, damageReduction: 0, critChance: 0, sprintSpeedMultiplier: 1, staminaRegenMultiplier: 1, passiveUpgradeCounts: {},
};

setControllerStatusCallback(showControllerMessage);
initInput();
initCameraControls();
createWorld(scene);
initUI({ onStart: startGame, onUpgrade: chooseUpgrade, onMenu: returnToMenu, onShop: openShop, onPause: pauseGame, onResume: resumeGame, onFullscreen: requestGameFullscreen });
showScreen('menu-screen');

function resetState() {
  const permanentStats = calculatePermanentStats(getPermanentUpgradeLevels());
  Object.assign(state, { elapsed: 0, health: permanentStats.maxHealth, maxHealth: permanentStats.maxHealth, level: 1, xp: 0,
    nextXp: CONFIG.level.baseXp, coins: 0, kills: 0, pulseCooldown: permanentStats.pulseCooldown, pulseRange: CONFIG.pulse.range,
    pulseDamage: CONFIG.pulse.damage, damageMultiplier: permanentStats.damageMultiplier, speedMultiplier: permanentStats.speedMultiplier, pickupMagnetMultiplier: permanentStats.pickupMagnetMultiplier,
    coinMultiplier: permanentStats.coinMultiplier, xpMultiplier: permanentStats.xpMultiplier, healthRegen: permanentStats.healthRegen, maxStamina: permanentStats.maxStamina, stamina: permanentStats.stamina, bossSpawnCount: 0, bossEventsTriggered: [], batKnockback: 0, cooldownMultiplier: 1, damageReduction: 0, critChance: 0, sprintSpeedMultiplier: 1, staminaRegenMultiplier: 1, passiveUpgradeCounts: {} });
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
  updateBossHealthBar(null);
  player = createPlayer(scene);
  hideOverlays(); document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  setGameActionsVisible(true); setPauseButtonVisible(true); document.body.classList.remove('paused');
  mode = 'playing';
}

function returnToMenu() { mode = 'menu'; setGameActionsVisible(false); updateBossHealthBar(null); document.body.classList.remove('paused'); showScreen('menu-screen'); updateMenuCoins(); }

function openShop() {
  mode = 'shop';
  setGameActionsVisible(false);
  document.body.classList.remove('paused');
  showShop();
}

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
    if (document.fullscreenElement) {
      if (document.exitFullscreen) await document.exitFullscreen();
    } else if (root?.requestFullscreen) {
      await root.requestFullscreen();
      if (screen.orientation?.lock) await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (_) {
    // Fullscreen and orientation lock support varies across mobile browsers. Playing remains optional.
  } finally {
    setFullscreenActive(!!document.fullscreenElement);
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
  return Math.ceil(baseAmount * multiplier * Math.max(0, state.xpMultiplier || 1));
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

function damagePlayer(damage) {
  if (!Number.isFinite(damage) || damage <= 0 || state.health <= 0) return;
  const reducedDamage = Math.max(1, damage - (state.damageReduction ?? 0));
  state.health = Math.max(0, state.health - reducedDamage);
  showDamageFlash();
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

function trySpawnBossEvents(previousElapsed) {
  for (const spawnTime of CONFIG.boss.spawnTimes) {
    if (state.bossEventsTriggered.includes(spawnTime)) continue;
    if (previousElapsed < spawnTime && state.elapsed >= spawnTime) {
      state.bossEventsTriggered.push(spawnTime);
      const spawned = spawnBossZombie(scene, { elapsed: state.elapsed, level: state.level });
      if (spawned) {
        state.bossSpawnCount += 1;
        showBossWarning('GRAVEBREAKER HAS AWAKENED!');
      }
    }
  }
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

function awardCoins(baseCoins) {
  const safeBase = Math.max(0, Number(baseCoins) || 0);
  return Math.max(0, Math.round(safeBase * state.coinMultiplier));
}

function playerDamageAmount(amount) {
  const critMultiplier = Math.random() < Math.max(0, state.critChance || 0) ? 2 : 1;
  return amount * Math.max(0, state.damageMultiplier || 1) * critMultiplier;
}

function doPulse() {
  createPulseVisual();
  damageZombies(scene, player.position, state.pulseRange, playerDamageAmount(state.pulseDamage), (position, type, typeKey) => {
    state.kills += 1; state.coins += awardCoins(type.coins); dropXp(scene, position, getXpReward(type.xp));
    maybeDropMedkit(position, type, typeKey);
  }, createHitParticles, state.batKnockback);
}

function endRun(won) {
  mode = 'ended'; setGameActionsVisible(false); document.body.classList.remove('paused'); addCoins(state.coins);
  updateBossHealthBar(null);
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
  const gamepadLook = getGamepadLookVector();
  cameraControls.yaw -= gamepadLook.x * CONFIG.gamepad.cameraSensitivity * delta;
  cameraControls.pitch = THREE.MathUtils.clamp(
    cameraControls.pitch + gamepadLook.y * CONFIG.gamepad.cameraSensitivity * delta,
    cameraLimits.minPitch,
    cameraLimits.maxPitch,
  );
  const zoomOut = isGamepadDown('lb') || isGamepadDown('lt');
  const zoomIn = isGamepadDown('rb') || isGamepadDown('rt');
  if (zoomOut || zoomIn) {
    const zoomDirection = (zoomOut ? 1 : 0) + (zoomIn ? -1 : 0);
    cameraControls.targetDistance = THREE.MathUtils.clamp(
      cameraControls.targetDistance + zoomDirection * cameraLimits.gamepadZoomSpeed * delta,
      cameraLimits.minDistance,
      cameraLimits.maxDistance,
    );
  }
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


function consumeControllerNav(negativeButtons, positiveButtons) {
  if (controllerNavCooldown > 0) return 0;
  const negative = negativeButtons.some((button) => isGamepadDown(button));
  const positive = positiveButtons.some((button) => isGamepadDown(button));
  if (negative === positive) return 0;
  controllerNavCooldown = 0.22;
  return negative ? -1 : 1;
}

function handleControllerMenus(delta) {
  controllerNavCooldown = Math.max(0, controllerNavCooldown - delta);
  const vertical = consumeControllerNav(['dpad-up', 'stick-up'], ['dpad-down', 'stick-down']);
  const horizontal = consumeControllerNav(['dpad-left', 'stick-left'], ['dpad-right', 'stick-right']);

  if (mode === 'menu') {
    if (vertical || horizontal) moveMenuSelection('menu', vertical || horizontal);
    if (consumeGamepadPress('a')) activateMenuSelection('menu');
    return;
  }

  if (mode === 'shop') {
    if (vertical || horizontal) moveMenuSelection('shop', vertical || horizontal);
    if (consumeGamepadPress('a')) activateMenuSelection('shop');
    if (consumeGamepadPress('b')) returnToMenu();
    return;
  }

  if (mode === 'paused') {
    if (vertical || horizontal) moveMenuSelection('paused', vertical || horizontal);
    if (consumeGamepadPress('a')) activateMenuSelection('paused');
    if (consumeGamepadPress('b')) resumeGame();
    return;
  }

  if (mode === 'ended') {
    if (vertical || horizontal) moveMenuSelection('ended', vertical || horizontal);
    if (consumeGamepadPress('a')) activateMenuSelection('ended');
    return;
  }

  if (mode === 'upgrade') {
    const direction = horizontal || consumeControllerNav(['dpad-left', 'stick-left'], ['dpad-right', 'stick-right']);
    if (direction) moveUpgradeSelection(direction);
    if (consumeGamepadPress('a')) {
      const selectedUpgradeId = getSelectedUpgradeId();
      if (selectedUpgradeId) chooseUpgrade(selectedUpgradeId);
    }
  }
}

function tick() {
  requestAnimationFrame(tick);
  const delta = Math.min(clock.getDelta(), 0.05);
  resize();
  updateGamepadInput();
  if (consumePress('m')) { muted = !muted; setMuted(muted); }
  if ((consumePress('p') || consumePress('escape') || consumeGamepadPress('start')) && (mode === 'playing' || mode === 'paused')) { mode === 'playing' ? pauseGame() : resumeGame(); }
  handleControllerMenus(delta);

  if (mode === 'playing') {
    const previousElapsed = state.elapsed;
    state.elapsed += delta;
    attackVisualTimer = Math.max(0, attackVisualTimer - delta);
    cameraShake = Math.max(0, cameraShake - delta);
    updatePlayer(player, delta, attackVisualTimer, cameraControls.yaw, state.speedMultiplier, state.sprintSpeedMultiplier);
    spawnTimer -= delta; pulseTimer -= delta; worldMedkitTimer -= delta;
    trySpawnBossEvents(previousElapsed);
    if (spawnTimer <= 0) {
      spawnZombie(scene, { elapsed: state.elapsed, level: state.level });
      spawnTimer = getSpawnDelay(state.elapsed);
    }
    if (worldMedkitTimer <= 0) {
      spawnWorldMedkit();
      scheduleNextWorldMedkit();
    }
    updateZombies(scene, player, delta, damagePlayer);
    updatePickups(scene, player, delta, collectPickup, state.pickupMagnetMultiplier);
    if (state.healthRegen > 0 && state.health > 0 && state.health < state.maxHealth) {
      state.health = Math.min(state.maxHealth, state.health + state.healthRegen * delta);
    }
    if (pulseTimer <= 0) { doPulse(); pulseTimer = Math.max(0.1, state.pulseCooldown); }
    updateAbilities(scene, state, player, delta, (position, type, typeKey) => {
      state.kills += 1; state.coins += awardCoins(type.coins); dropXp(scene, position, getXpReward(type.xp));
      maybeDropMedkit(position, type, typeKey);
    }, createHitParticles);
    if (state.health <= 0) endRun(false);
    if (state.elapsed >= CONFIG.runDuration) endRun(true);
    updateHUD(state); updateBossHealthBar(getActiveBoss()); updateCamera(delta);
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
