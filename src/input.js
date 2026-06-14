import { CONFIG } from './config.js';

const keys = new Set();
const pressed = new Set();
const touchMove = { x: 0, z: 0 };
const gamepadMove = { x: 0, y: 0, z: 0 };
const gamepadLook = { x: 0, y: 0 };
const gamepadButtons = new Set();
const previousGamepadButtons = new Set();
const gamepadButtonPressed = new Set();
const MOBILE_QUERY = '(hover: none), (pointer: coarse), (max-width: 820px), (max-height: 520px)';
const SMALL_SCREEN_QUERY = '(max-width: 820px), (max-height: 520px)';
let mobileControlsReady = false;
let activeGamepadIndex = null;
let controllerStatusCallback = null;

function setMobileClass() {
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const isSmallScreen = window.matchMedia(SMALL_SCREEN_QUERY).matches;
  const isMobileLayout = isCoarsePointer || isSmallScreen;
  document.body.classList.toggle('mobile-controls-enabled', isMobileLayout);
  document.body.classList.toggle('mobile-touch-device', isTouchDevice);
}

function pressKey(key) {
  key = key.toLowerCase();
  if (!keys.has(key)) pressed.add(key);
  keys.add(key);
}

function releaseKey(key) {
  keys.delete(key.toLowerCase());
}

function applyDeadzone(value, deadzone = CONFIG.gamepad.deadzone) {
  if (Math.abs(value) < deadzone) return 0;
  const scaled = (Math.abs(value) - deadzone) / (1 - deadzone);
  return Math.sign(value) * Math.min(1, scaled);
}

function normalizeStick(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y };
  return { x: x / length, y: y / length };
}

function findFirstGamepad() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  return pads.find((pad) => pad?.connected) || null;
}

function setActiveGamepad(gamepad, connectedMessage = false) {
  if (!gamepad) return;
  const changed = activeGamepadIndex !== gamepad.index;
  activeGamepadIndex = gamepad.index;
  if ((changed || connectedMessage) && controllerStatusCallback) controllerStatusCallback('Controller connected');
}

function clearGamepadState(message) {
  activeGamepadIndex = null;
  gamepadMove.x = 0; gamepadMove.y = 0; gamepadMove.z = 0;
  gamepadLook.x = 0; gamepadLook.y = 0;
  gamepadButtons.clear(); previousGamepadButtons.clear(); gamepadButtonPressed.clear();
  if (message && controllerStatusCallback) controllerStatusCallback(message);
}

function readButton(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return !!button && (button.pressed || button.value > 0.5);
}

function refreshGamepadButtons(gamepad) {
  previousGamepadButtons.clear();
  gamepadButtons.forEach((button) => previousGamepadButtons.add(button));
  gamepadButtons.clear();

  // Xbox-style defaults: button 0 = A, 1 = B, 4/5 = LB/RB, 9 = Start/Menu.
  if (readButton(gamepad, 0)) gamepadButtons.add('a');
  if (readButton(gamepad, 1)) gamepadButtons.add('b');
  if (readButton(gamepad, 4)) gamepadButtons.add('lb');
  if (readButton(gamepad, 5)) gamepadButtons.add('rb');
  // Some browser/controller pairs expose triggers as buttons; let them mirror bumper zoom safely.
  if (readButton(gamepad, 6)) gamepadButtons.add('lt');
  if (readButton(gamepad, 7)) gamepadButtons.add('rt');
  const fallbackStartPressed = gamepad.mapping !== 'standard' && (readButton(gamepad, 7) || readButton(gamepad, 8));
  if (readButton(gamepad, 9) || fallbackStartPressed) gamepadButtons.add('start');
  if (readButton(gamepad, 12)) gamepadButtons.add('dpad-up');
  if (readButton(gamepad, 13)) gamepadButtons.add('dpad-down');
  if (readButton(gamepad, 14)) gamepadButtons.add('dpad-left');
  if (readButton(gamepad, 15)) gamepadButtons.add('dpad-right');
  if (gamepadMove.y < -0.7) gamepadButtons.add('stick-up');
  if (gamepadMove.y > 0.7) gamepadButtons.add('stick-down');
  if (gamepadMove.x < -0.7) gamepadButtons.add('stick-left');
  if (gamepadMove.x > 0.7) gamepadButtons.add('stick-right');

  gamepadButtonPressed.clear();
  gamepadButtons.forEach((button) => {
    if (!previousGamepadButtons.has(button)) gamepadButtonPressed.add(button);
  });
}

export function setControllerStatusCallback(callback) {
  controllerStatusCallback = callback;
}

export function updateGamepadInput() {
  if (!navigator.getGamepads) return;
  let gamepad = activeGamepadIndex === null ? null : navigator.getGamepads()[activeGamepadIndex];
  if (!gamepad?.connected) {
    gamepad = findFirstGamepad();
    if (gamepad) setActiveGamepad(gamepad);
    else { clearGamepadState(); return; }
  }

  const axes = gamepad.axes || [];
  const left = normalizeStick(applyDeadzone(axes[0] || 0), applyDeadzone(axes[1] || 0));
  const right = normalizeStick(applyDeadzone(axes[2] || 0), applyDeadzone(axes[3] || 0));
  gamepadMove.x = left.x;
  gamepadMove.y = left.y;
  gamepadMove.z = left.y;
  gamepadLook.x = right.x;
  gamepadLook.y = right.y;
  refreshGamepadButtons(gamepad);
}

function initMobileControls() {
  if (mobileControlsReady) return;
  mobileControlsReady = true;
  const joystick = document.getElementById('touch-joystick');
  const thumb = document.getElementById('touch-joystick-thumb');
  const jumpButton = document.getElementById('touch-jump-button');
  if (!joystick || !thumb || !jumpButton) return;

  const resetJoystick = () => {
    touchMove.x = 0;
    touchMove.z = 0;
    thumb.style.transform = 'translate(-50%, -50%)';
    joystick.classList.remove('active');
  };

  const updateJoystick = (event) => {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.34;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clamped;
    const knobY = Math.sin(angle) * clamped;
    const strength = maxDistance > 0 ? clamped / maxDistance : 0;
    touchMove.x = Math.cos(angle) * strength;
    touchMove.z = Math.sin(angle) * strength;
    thumb.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  };

  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    joystick.setPointerCapture(event.pointerId);
    joystick.classList.add('active');
    updateJoystick(event);
  });
  joystick.addEventListener('pointermove', (event) => {
    if (!joystick.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    updateJoystick(event);
  });
  joystick.addEventListener('pointerup', (event) => {
    if (joystick.hasPointerCapture(event.pointerId)) joystick.releasePointerCapture(event.pointerId);
    resetJoystick();
  });
  joystick.addEventListener('pointercancel', resetJoystick);
  joystick.addEventListener('lostpointercapture', resetJoystick);

  jumpButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    jumpButton.setPointerCapture(event.pointerId);
    pressKey(' ');
  });
  jumpButton.addEventListener('pointerup', (event) => {
    event.preventDefault();
    if (jumpButton.hasPointerCapture(event.pointerId)) jumpButton.releasePointerCapture(event.pointerId);
    releaseKey(' ');
  });
  jumpButton.addEventListener('pointercancel', () => releaseKey(' '));
  jumpButton.addEventListener('lostpointercapture', () => releaseKey(' '));
}

export function initInput() {
  setMobileClass();
  initMobileControls();
  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  if (mobileMedia.addEventListener) mobileMedia.addEventListener('change', setMobileClass);
  else mobileMedia.addListener(setMobileClass);
  window.addEventListener('resize', setMobileClass);
  window.addEventListener('orientationchange', setMobileClass);
  window.addEventListener('gamepadconnected', (event) => setActiveGamepad(event.gamepad, true));
  window.addEventListener('gamepaddisconnected', (event) => {
    if (activeGamepadIndex === event.gamepad.index) clearGamepadState('Controller disconnected');
  });
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!keys.has(key)) pressed.add(key);
    keys.add(key);
    if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
}

export function resetTouchMovement() {
  touchMove.x = 0;
  touchMove.z = 0;
}

export function getMoveVector() {
  let x = touchMove.x + gamepadMove.x;
  let z = touchMove.z + gamepadMove.z;
  if (keys.has('a')) x -= 1;
  if (keys.has('d')) x += 1;
  if (keys.has('w')) z -= 1;
  if (keys.has('s')) z += 1;
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export function getGamepadLookVector() { return { ...gamepadLook }; }
export function isGamepadDown(button) { return gamepadButtons.has(button); }
export function consumeGamepadPress(button) {
  const had = gamepadButtonPressed.has(button);
  gamepadButtonPressed.delete(button);
  return had;
}
export function isDown(key) { return keys.has(key.toLowerCase()); }
export function consumePress(key) {
  key = key.toLowerCase();
  const had = pressed.has(key);
  pressed.delete(key);
  return had;
}
