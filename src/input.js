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

export function getMoveVector() {
  let x = 0;
  let z = 0;
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
