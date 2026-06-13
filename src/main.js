import * as THREE from 'three';
import { CONFIG } from './config.js';
import { initInput, consumePress } from './input.js';
import { initUI, updateHUD, showScreen, hideOverlays, showUpgrades, showEnd, setMuted, updateMenuCoins } from './ui.js';
import { addCoins } from './save.js';
import { createWorld } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnZombie, updateZombies, damageZombies, resetZombies } from './zombies.js';
import { dropXp, updatePickups, resetPickups } from './pickups.js';
import { getUpgradeChoices, applyUpgrade } from './upgrades.js';

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
let pulseTimer = 0;
let pulseVisuals = [];
let hitParticles = [];
let attackVisualTimer = 0;
let cameraShake = 0;
let pendingChoices = [];
const cameraControls = {
  yaw: Math.atan2(CONFIG.camera.offset.x, CONFIG.camera.offset.z),
  pitch: Math.atan2(CONFIG.camera.offset.y, Math.hypot(CONFIG.camera.offset.x, CONFIG.camera.offset.z)),
  distance: Math.hypot(CONFIG.camera.offset.x, CONFIG.camera.offset.y, CONFIG.camera.offset.z),
  dragging: false,
  pointerButton: null,
  lastX: 0,
  lastY: 0,
};
const cameraLimits = {
  minPitch: 0.32,
  maxPitch: 1.25,
  minDistance: 9.5,
  maxDistance: 24,
  yawSpeed: 0.0055,
  pitchSpeed: 0.0042,
  zoomSpeed: 0.0025,
};

const state = {
  elapsed: 0, health: 100, maxHealth: 100, level: 1, xp: 0, nextXp: CONFIG.level.baseXp,
  coins: 0, kills: 0, pulseCooldown: CONFIG.pulse.cooldown, pulseRange: CONFIG.pulse.range,
  pulseDamage: CONFIG.pulse.damage, speedMultiplier: 1, bossSpawned: false,
};

initInput();
initCameraControls();
createWorld(scene);
initUI({ onStart: startGame, onUpgrade: chooseUpgrade, onMenu: returnToMenu });
showScreen('menu-screen');

function resetState() {
  Object.assign(state, { elapsed: 0, health: CONFIG.player.maxHealth, maxHealth: CONFIG.player.maxHealth, level: 1, xp: 0,
    nextXp: CONFIG.level.baseXp, coins: 0, kills: 0, pulseCooldown: CONFIG.pulse.cooldown, pulseRange: CONFIG.pulse.range,
    pulseDamage: CONFIG.pulse.damage, speedMultiplier: 1, bossSpawned: false });
  spawnTimer = 0; pulseTimer = 0; pendingChoices = [];
}

function startGame() {
  resetState();
  if (player) scene.remove(player);
  resetZombies(scene); resetPickups(scene);
  pulseVisuals.forEach((v) => scene.remove(v)); pulseVisuals = [];
  hitParticles.forEach((p) => scene.remove(p)); hitParticles = [];
  attackVisualTimer = 0; cameraShake = 0;
  player = createPlayer(scene);
  hideOverlays(); document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  mode = 'playing';
}

function returnToMenu() { mode = 'menu'; showScreen('menu-screen'); updateMenuCoins(); }

function chooseUpgrade(id) {
  applyUpgrade(state, id);
  hideOverlays(); document.getElementById('hud').classList.remove('hidden');
  mode = 'playing';
}

function gainXp(amount) {
  state.xp += amount;
  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp; state.level += 1; state.nextXp = Math.floor(state.nextXp * CONFIG.level.growth);
    pendingChoices = getUpgradeChoices(); mode = 'upgrade'; showUpgrades(pendingChoices); break;
  }
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
  damageZombies(scene, player.position, state.pulseRange, state.pulseDamage, (position, type) => {
    state.kills += 1; state.coins += type.coins; dropXp(scene, position, type.xp);
  }, createHitParticles);
}

function endRun(won) {
  mode = 'ended'; addCoins(state.coins);
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

  canvas.addEventListener('wheel', (event) => {
    if (mode !== 'playing') return;
    event.preventDefault();
    cameraControls.distance = THREE.MathUtils.clamp(
      cameraControls.distance * (1 + event.deltaY * cameraLimits.zoomSpeed),
      cameraLimits.minDistance,
      cameraLimits.maxDistance,
    );
  }, { passive: false });
}

function updateCamera(delta) {
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
  if (consumePress('p') && (mode === 'playing' || mode === 'paused')) { mode = mode === 'playing' ? 'paused' : 'playing'; mode === 'paused' ? showScreen('pause-screen') : hideOverlays(); }

  if (mode === 'playing') {
    state.elapsed += delta;
    const savedSpeed = CONFIG.player.speed;
    CONFIG.player.speed = savedSpeed * state.speedMultiplier;
    attackVisualTimer = Math.max(0, attackVisualTimer - delta);
    cameraShake = Math.max(0, cameraShake - delta);
    updatePlayer(player, delta, attackVisualTimer, cameraControls.yaw);
    CONFIG.player.speed = savedSpeed;
    spawnTimer -= delta; pulseTimer -= delta;
    if (spawnTimer <= 0) {
      const spawned = spawnZombie(scene, { elapsed: state.elapsed, level: state.level, bossSpawned: state.bossSpawned });
      if (spawned?.userData.typeKey === 'boss') state.bossSpawned = true;
      spawnTimer = CONFIG.zombie.spawnEvery * Math.max(.38, 1 - state.elapsed / 520);
    }
    updateZombies(player, delta, (damage) => { state.health = Math.max(0, state.health - damage); });
    updatePickups(scene, player, delta, gainXp);
    if (pulseTimer <= 0) { doPulse(); pulseTimer = state.pulseCooldown; }
    if (state.health <= 0) endRun(false);
    if (state.elapsed >= CONFIG.runDuration) endRun(true);
    updateHUD(state); updateCamera(delta);
  }

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
  renderer.render(scene, camera);
}

tick();
