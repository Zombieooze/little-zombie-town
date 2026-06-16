const STORAGE_KEYS = {
  sfx: 'lzt.sfxVolume',
  music: 'lzt.musicVolume',
  muted: 'lzt.muted',
};

const DEFAULTS = { sfx: 0.75, music: 0.45, muted: false };
const gates = new Map();
let audioContext = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let controlsReady = false;
let settings = loadSettings();

function clamp01(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
}

function loadSettings() {
  return {
    sfx: clamp01(localStorage.getItem(STORAGE_KEYS.sfx), DEFAULTS.sfx),
    music: clamp01(localStorage.getItem(STORAGE_KEYS.music), DEFAULTS.music),
    muted: localStorage.getItem(STORAGE_KEYS.muted) === 'true',
  };
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEYS.sfx, String(settings.sfx));
  localStorage.setItem(STORAGE_KEYS.music, String(settings.music));
  localStorage.setItem(STORAGE_KEYS.muted, String(settings.muted));
}

function ensureContext() {
  if (audioContext) return audioContext;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext = new AudioCtor();
  masterGain = audioContext.createGain();
  sfxGain = audioContext.createGain();
  musicGain = audioContext.createGain();
  sfxGain.connect(masterGain);
  musicGain.connect(masterGain);
  masterGain.connect(audioContext.destination);
  applyVolumes();
  return audioContext;
}

function setGain(gain, value) {
  if (!gain || !audioContext) return;
  gain.gain.setTargetAtTime(value, audioContext.currentTime, 0.018);
}

function applyVolumes() {
  if (!audioContext) return;
  setGain(masterGain, settings.muted ? 0 : 1);
  setGain(sfxGain, settings.sfx);
  setGain(musicGain, settings.music);
}

export function unlockAudio() {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function getAudioSettings() { return { ...settings }; }
export function getMusicGainNode() { ensureContext(); return musicGain; }

export function setSfxVolume(value) {
  settings.sfx = clamp01(value, DEFAULTS.sfx);
  saveSettings(); applyVolumes(); syncControls();
}

export function setMusicVolume(value) {
  settings.music = clamp01(value, DEFAULTS.music);
  saveSettings(); applyVolumes(); syncControls();
}

export function setMutedState(muted) {
  settings.muted = Boolean(muted);
  saveSettings(); applyVolumes(); syncControls();
}

export function toggleMute() {
  setMutedState(!settings.muted);
  return settings.muted;
}

function syncControls() {
  const sfx = document.getElementById('sfx-volume');
  const music = document.getElementById('music-volume');
  const muteLabel = document.getElementById('mute-state-label');
  if (sfx) sfx.value = String(settings.sfx);
  if (music) music.value = String(settings.music);
  if (muteLabel) muteLabel.textContent = settings.muted ? 'Muted' : 'M toggles mute';
}

export function initAudioControls() {
  if (controlsReady) return;
  controlsReady = true;
  syncControls();
  document.getElementById('sfx-volume')?.addEventListener('input', (event) => {
    unlockAudio(); setSfxVolume(event.target.value); playSound('uiClick');
  });
  document.getElementById('music-volume')?.addEventListener('input', (event) => {
    unlockAudio(); setMusicVolume(event.target.value);
  });
  ['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
    window.addEventListener(type, unlockAudio, { once: true, passive: true });
  });
}

function gate(name, seconds) {
  const now = performance.now() / 1000;
  const next = gates.get(name) ?? 0;
  if (now < next) return false;
  gates.set(name, now + seconds);
  return true;
}

function tone({ freq = 440, endFreq = freq, duration = 0.12, type = 'square', gain = 0.12, attack = 0.005, destination = sfxGain, detune = 0 }) {
  const ctx = ensureContext();
  if (!ctx || !destination || settings.muted || settings.sfx <= 0) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
  osc.detune.value = detune + (Math.random() - 0.5) * 22;
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(destination);
  osc.start(t); osc.stop(t + duration + 0.02);
}

function noise({ duration = 0.08, gain = 0.08, filter = 1600, type = 'bandpass' }) {
  const ctx = ensureContext();
  if (!ctx || settings.muted || settings.sfx <= 0) return;
  const t = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const biquad = ctx.createBiquadFilter();
  source.buffer = buffer;
  biquad.type = type; biquad.frequency.value = filter;
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(biquad).connect(amp).connect(sfxGain);
  source.start(t); source.stop(t + duration + 0.02);
}

const sounds = {
  enemyHit: () => { if (gate('enemyHit', 0.055)) { tone({ freq: 210, endFreq: 125, duration: .055, gain: .055, type: 'square' }); noise({ duration: .035, gain: .035, filter: 900 }); } },
  enemyDeath: () => { if (gate('enemyDeath', .09)) { tone({ freq: 180, endFreq: 70, duration: .16, gain: .08, type: 'sawtooth' }); noise({ duration: .09, gain: .045, filter: 650 }); } },
  playerHurt: () => { if (gate('playerHurt', .28)) tone({ freq: 165, endFreq: 95, duration: .22, gain: .11, type: 'sawtooth' }); },
  playerDeath: () => { tone({ freq: 210, endFreq: 45, duration: .75, gain: .13, type: 'triangle' }); noise({ duration: .32, gain: .055, filter: 420, type: 'lowpass' }); },
  xpPickup: () => { if (gate('xpPickup', .035)) tone({ freq: 760, endFreq: 1180, duration: .07, gain: .035, type: 'triangle' }); },
  coinPickup: () => { if (gate('coinPickup', .045)) { tone({ freq: 920, endFreq: 1380, duration: .055, gain: .045, type: 'square' }); tone({ freq: 1380, endFreq: 1600, duration: .05, gain: .025, type: 'triangle' }); } },
  medkitPickup: () => { tone({ freq: 520, endFreq: 780, duration: .11, gain: .07, type: 'triangle' }); setTimeout(() => tone({ freq: 700, endFreq: 980, duration: .1, gain: .055, type: 'triangle' }), 55); },
  scrapRushPickup: () => { tone({ freq: 320, endFreq: 860, duration: .22, gain: .09, type: 'sawtooth' }); noise({ duration: .14, gain: .045, filter: 2200 }); },
  levelUp: () => [0, 80, 165].forEach((ms, i) => setTimeout(() => tone({ freq: [520, 780, 1040][i], endFreq: [700, 980, 1380][i], duration: .16, gain: .075, type: 'triangle' }), ms)),
  bossWarning: () => { tone({ freq: 95, endFreq: 62, duration: .5, gain: .13, type: 'sawtooth' }); setTimeout(() => tone({ freq: 155, endFreq: 95, duration: .28, gain: .1, type: 'square' }), 140); },
  bossSlam: () => { if (gate('bossSlam', .5)) { tone({ freq: 90, endFreq: 38, duration: .34, gain: .16, type: 'sine' }); noise({ duration: .18, gain: .08, filter: 220, type: 'lowpass' }); } },
  spitterShot: () => { if (gate('spitterShot', .18)) { tone({ freq: 430, endFreq: 260, duration: .11, gain: .055, type: 'sawtooth' }); noise({ duration: .06, gain: .035, filter: 1500 }); } },
  slimeSplat: () => { if (gate('slimeSplat', .12)) noise({ duration: .08, gain: .055, filter: 740, type: 'lowpass' }); },
  sawblade: () => { if (gate('sawblade', .18)) { tone({ freq: 460, endFreq: 720, duration: .16, gain: .055, type: 'sawtooth' }); noise({ duration: .08, gain: .035, filter: 3200 }); } },
  halo: () => { if (gate('halo', .18)) tone({ freq: 640, endFreq: 520, duration: .055, gain: .038, type: 'square' }); },
  zap: () => { if (gate('zap', .12)) { tone({ freq: 920, endFreq: 250, duration: .09, gain: .075, type: 'square' }); noise({ duration: .035, gain: .04, filter: 4800 }); } },
  flame: () => { if (gate('flame', .18)) { noise({ duration: .13, gain: .06, filter: 980, type: 'lowpass' }); tone({ freq: 190, endFreq: 145, duration: .1, gain: .04, type: 'triangle' }); } },
  nailgun: () => { if (gate('nailgun', .09)) tone({ freq: 1180, endFreq: 840, duration: .035, gain: .05, type: 'square' }); },
  pavementSlam: () => { if (gate('pavementSlam', .32)) tone({ freq: 110, endFreq: 48, duration: .28, gain: .12, type: 'sine' }); },
  snapTrap: () => { if (gate('snapTrap', .18)) { tone({ freq: 580, endFreq: 190, duration: .075, gain: .08, type: 'square' }); noise({ duration: .045, gain: .045, filter: 2600 }); } },
  turretDeploy: () => { tone({ freq: 520, endFreq: 520, duration: .06, gain: .045, type: 'square' }); setTimeout(() => tone({ freq: 720, endFreq: 620, duration: .08, gain: .05, type: 'triangle' }), 65); },
  turretShot: () => { if (gate('turretShot', .08)) tone({ freq: 980, endFreq: 760, duration: .035, gain: .038, type: 'square' }); },
  uiClick: () => { if (gate('uiClick', .035)) tone({ freq: 560, endFreq: 700, duration: .045, gain: .035, type: 'triangle' }); },
  cardSelect: () => tone({ freq: 420, endFreq: 760, duration: .09, gain: .05, type: 'triangle' }),
  shopBuy: () => { tone({ freq: 660, endFreq: 990, duration: .09, gain: .06, type: 'square' }); setTimeout(() => tone({ freq: 990, endFreq: 1320, duration: .08, gain: .045, type: 'triangle' }), 65); },
  modalOpen: () => tone({ freq: 320, endFreq: 460, duration: .08, gain: .04, type: 'triangle' }),
};

export function playSound(name) {
  if (settings.muted || settings.sfx <= 0) return;
  try { sounds[name]?.(); } catch (_) {}
}
