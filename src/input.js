const keys = new Set();
const pressed = new Set();

export function initInput() {
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!keys.has(key)) pressed.add(key);
    keys.add(key);
    if (['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
}

export function getMoveVector(cameraYaw = 0) {
  let strafe = 0;
  let forwardInput = 0;
  if (keys.has('a')) strafe -= 1;
  if (keys.has('d')) strafe += 1;
  if (keys.has('w')) forwardInput += 1;
  if (keys.has('s')) forwardInput -= 1;

  const inputLength = Math.hypot(strafe, forwardInput) || 1;
  strafe /= inputLength;
  forwardInput /= inputLength;

  const forward = { x: -Math.sin(cameraYaw), z: -Math.cos(cameraYaw) };
  const right = { x: Math.cos(cameraYaw), z: -Math.sin(cameraYaw) };
  return {
    x: right.x * strafe + forward.x * forwardInput,
    z: right.z * strafe + forward.z * forwardInput,
  };
}

export function isDown(key) { return keys.has(key.toLowerCase()); }
export function consumePress(key) {
  key = key.toLowerCase();
  const had = pressed.has(key);
  pressed.delete(key);
  return had;
}


const cameraDrag = { dragging: false, deltaX: 0, zoomDelta: 0 };

export function initCameraInput(canvas) {
  canvas.addEventListener('pointerdown', (event) => {
    cameraDrag.dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', (event) => {
    cameraDrag.dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', () => { cameraDrag.dragging = false; });
  canvas.addEventListener('pointermove', (event) => {
    if (cameraDrag.dragging) cameraDrag.deltaX += event.movementX;
  });
  canvas.addEventListener('wheel', (event) => {
    cameraDrag.zoomDelta += Math.sign(event.deltaY) * 0.08;
    event.preventDefault();
  }, { passive: false });
}

export function consumeCameraInput() {
  const input = { deltaX: cameraDrag.deltaX, zoomDelta: cameraDrag.zoomDelta };
  cameraDrag.deltaX = 0;
  cameraDrag.zoomDelta = 0;
  return input;
}
