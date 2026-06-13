const keys = new Set();
const pressed = new Set();
const touchMove = { x: 0, z: 0 };
const MOBILE_QUERY = '(hover: none), (pointer: coarse), (max-width: 820px), (max-height: 520px)';
let mobileControlsReady = false;

function setMobileClass() {
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const isMobileLayout = window.matchMedia(MOBILE_QUERY).matches || isTouchDevice;
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
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!keys.has(key)) pressed.add(key);
    keys.add(key);
    if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
}

export function getMoveVector() {
  let x = touchMove.x;
  let z = touchMove.z;
  if (keys.has('a')) x -= 1;
  if (keys.has('d')) x += 1;
  if (keys.has('w')) z -= 1;
  if (keys.has('s')) z += 1;
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

export function isDown(key) { return keys.has(key.toLowerCase()); }
export function consumePress(key) {
  key = key.toLowerCase();
  const had = pressed.has(key);
  pressed.delete(key);
  return had;
}
