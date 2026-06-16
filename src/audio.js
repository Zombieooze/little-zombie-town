const STORAGE_KEYS = {
  sfx: 'lzt.sfxVolume',
  music: 'lzt.musicVolume',
  muted: 'lzt.muted',
};

const DEFAULTS = { sfx: 0.75, music: 0.45, muted: false };
const OUTPUT_GAIN = { sfx: 1.65, music: 1.55 };
const gates = new Map();
let audioContext = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let controlsReady = false;
let settings = loadSettings();

const MENU_BPM = 88;
const MENU_BEAT = 60 / MENU_BPM;
const MENU_STEPS = 32;
const MENU_STEP = MENU_BEAT / 2;
const MENU_LOOKAHEAD = 0.75;
// Menu music layer switches for quick debugging/tuning.
// Flip these values and refresh the game to isolate parts of the procedural menu loop.
const MENU_MUSIC_LAYERS = {
  drums: true,
  bass: true,
  hats: true,
  pluck: false,
  lead: false,
  chords: true,
  extraFx: false,
};
const MENU_SEQUENCE = {
  // C minor neighborhood groove: simple roots/fifths keep the original pulse without the old wandering pitch motion.
  bass: [65.41, null, null, 98, 77.78, null, 65.41, null, 65.41, null, null, 98, 77.78, null, 65.41, null, 58.27, null, null, 87.31, 73.42, null, 58.27, null, 51.91, null, null, 77.78, 65.41, null, 51.91, null],
  // Sparse, original spooky-arcade hook. Rests leave space so the menu loop stays calm.
  pluck: [null, 261.63, null, 311.13, null, null, 293.66, null, null, 261.63, null, 233.08, null, null, 196, null, null, 233.08, null, 261.63, null, null, 293.66, null, null, 196, null, 233.08, null, null, 261.63, null],
  chords: [0, null, null, null, null, null, null, null, 1, null, null, null, null, null, null, null, 2, null, null, null, null, null, null, null, 3, null, null, null, null, null, null, null],
};
const MENU_CHORDS = [
  [130.81, 155.56, 196],
  [116.54, 146.83, 196],
  [103.83, 130.81, 155.56],
  [98, 123.47, 155.56],
];
let menuMusicTimer = null;
let menuMusicPlaying = false;
let menuMusicNextStep = 0;
let menuMusicNextTime = 0;
let menuMusicFadeGain = null;
let menuDelay = null;

const GAMEPLAY_BPM = 128;
const GAMEPLAY_BEAT = 60 / GAMEPLAY_BPM;
const GAMEPLAY_STEP = GAMEPLAY_BEAT / 4;
const GAMEPLAY_STEPS = 32;
const GAMEPLAY_LOOKAHEAD = 0.75;
const GAMEPLAY_INTRO_STEPS = 32;
const GAMEPLAY_BASS = [65.41, null, 65.41, 73.42, 65.41, null, 98, null, 58.27, null, 58.27, 65.41, 58.27, null, 87.31, null, 51.91, null, 51.91, 65.41, 51.91, null, 77.78, null, 58.27, null, 58.27, 73.42, 58.27, 65.41, 58.27, null];
const GAMEPLAY_PLUCK = [null, 261.63, null, 311.13, null, 392, 349.23, null, null, 233.08, null, 293.66, null, 369.99, 311.13, null, null, 207.65, null, 261.63, null, 311.13, 293.66, null, null, 233.08, null, 349.23, 311.13, null, 293.66, null];
const GAMEPLAY_LEAD = [null, null, null, null, 523.25, null, null, 466.16, null, null, null, null, 587.33, null, 523.25, null, null, null, null, null, 466.16, null, null, 392, null, null, 523.25, null, 466.16, null, null, null];
let gameplayMusicTimer = null;
let gameplayMusicPlaying = false;
let gameplayMusicNextStep = 0;
let gameplayMusicNextTime = 0;
let gameplayMusicFadeGain = null;
let gameplayDelay = null;
let gameplayMusicDucked = false;

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
  menuMusicFadeGain = audioContext.createGain();
  menuMusicFadeGain.gain.value = 0;
  menuDelay = audioContext.createDelay(0.45);
  const menuFeedback = audioContext.createGain();
  const menuDelayFilter = audioContext.createBiquadFilter();
  menuDelay.delayTime.value = 0.28;
  menuFeedback.gain.value = 0.18;
  menuDelayFilter.type = 'lowpass';
  menuDelayFilter.frequency.value = 1800;
  menuDelay.connect(menuDelayFilter).connect(menuFeedback).connect(menuDelay);
  menuDelayFilter.connect(menuMusicFadeGain);
  menuMusicFadeGain.connect(musicGain);
  gameplayMusicFadeGain = audioContext.createGain();
  gameplayMusicFadeGain.gain.value = 0;
  gameplayDelay = audioContext.createDelay(0.35);
  const gameplayFeedback = audioContext.createGain();
  const gameplayDelayFilter = audioContext.createBiquadFilter();
  gameplayDelay.delayTime.value = GAMEPLAY_STEP * 3;
  gameplayFeedback.gain.value = 0.16;
  gameplayDelayFilter.type = 'lowpass';
  gameplayDelayFilter.frequency.value = 2400;
  gameplayDelay.connect(gameplayDelayFilter).connect(gameplayFeedback).connect(gameplayDelay);
  gameplayDelayFilter.connect(gameplayMusicFadeGain);
  gameplayMusicFadeGain.connect(musicGain);
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
  setGain(sfxGain, settings.sfx * OUTPUT_GAIN.sfx);
  setGain(musicGain, settings.music * OUTPUT_GAIN.music);
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
  document.querySelectorAll('[data-audio-control=\"sfx\"]').forEach((sfx) => { sfx.value = String(settings.sfx); });
  document.querySelectorAll('[data-audio-control=\"music\"]').forEach((music) => { music.value = String(settings.music); });
  document.querySelectorAll('[data-mute-state-label]').forEach((muteLabel) => { muteLabel.textContent = settings.muted ? 'Muted' : 'Press M to mute all'; });
}

export function initAudioControls() {
  if (controlsReady) return;
  controlsReady = true;
  syncControls();
  document.querySelectorAll('[data-audio-control=\"sfx\"]').forEach((control) => {
    control.addEventListener('input', (event) => {
      unlockAudio(); setSfxVolume(event.target.value); playSound('uiClick');
    });
  });
  document.querySelectorAll('[data-audio-control=\"music\"]').forEach((control) => {
    control.addEventListener('input', (event) => {
      unlockAudio(); setMusicVolume(event.target.value);
    });
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


function connectMenuVoice(source, amp, useDelay = false) {
  if (!menuMusicFadeGain) return;
  source.connect(amp).connect(menuMusicFadeGain);
  if (useDelay && menuDelay) amp.connect(menuDelay);
}

function scheduleBass(time, freq) {
  const ctx = ensureContext();
  if (!ctx || !freq) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.985, time + MENU_STEP * 0.75);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, time);
  filter.Q.value = 2.1;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(0.34, time + 0.025);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + MENU_STEP * 0.78);
  osc.connect(filter);
  connectMenuVoice(filter, amp);
  osc.start(time);
  osc.stop(time + MENU_STEP * 0.86);
}

function schedulePluck(time, freq) {
  const ctx = ensureContext();
  if (!ctx || !freq) return;
  [0, 6].forEach((detune) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.value = detune * 0.45;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, time);
    filter.frequency.exponentialRampToValueAtTime(360, time + 0.2);
    filter.Q.value = 2.4;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(0.046, time + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    osc.connect(filter);
    connectMenuVoice(filter, amp, true);
    osc.start(time);
    osc.stop(time + 0.38);
  });
}

function scheduleHat(time, accent) {
  const ctx = ensureContext();
  if (!ctx) return;
  const duration = accent ? 0.055 : 0.032;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = accent ? 4300 : 5600;
  amp.gain.setValueAtTime(accent ? 0.052 : 0.03, time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  connectMenuVoice(filter, amp, true);
  source.start(time);
}

function scheduleChord(time, chordIndex) {
  const ctx = ensureContext();
  const chord = MENU_CHORDS[chordIndex];
  if (!ctx || !chord) return;
  chord.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (index - 1) * 2;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, time);
    filter.frequency.exponentialRampToValueAtTime(260, time + 1.25);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(0.038, time + 0.08);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 1.55);
    osc.connect(filter);
    connectMenuVoice(filter, amp, true);
    osc.start(time);
    osc.stop(time + 1.75);
  });
}

function scheduleMenuStep(step, time) {
  const index = step % MENU_STEPS;

  // MENU DRUMS
  // Reserved switch for the main menu drum layer. The current menu groove has no kick/snare voice;
  // keep this gate separate so future drum calls can be disabled without touching other layers.
  if (MENU_MUSIC_LAYERS.drums) {
    // MENU HATS
    // Light offbeat/noise ticks provide the menu pulse and can be isolated from the drum switch.
    if (MENU_MUSIC_LAYERS.hats && (index % 2 === 1 || index % 8 === 0)) scheduleHat(time, index % 8 === 0);
  }

  // MENU BASS
  // Root/fifth bass notes carry the main menu groove.
  if (MENU_MUSIC_LAYERS.bass) scheduleBass(time, MENU_SEQUENCE.bass[index]);

  // MENU PLUCK / ARP
  // Sparse spooky hook/arpeggio. Disabled by default for easier testing of the stable beat and bass.
  if (MENU_MUSIC_LAYERS.pluck) schedulePluck(time, MENU_SEQUENCE.pluck[index]);

  // MENU LEAD / CHORUS
  // No separate menu lead voice is currently scheduled; this switch is here for quick A/B testing
  // if a lead/chorus call is added back to the menu loop.
  if (MENU_MUSIC_LAYERS.lead) {
    // Intentionally empty until a menu lead/chorus voice is present.
  }

  // MENU CHORDS / PAD
  // Slow filtered triads underneath the loop.
  if (MENU_MUSIC_LAYERS.chords && MENU_SEQUENCE.chords[index] !== null) scheduleChord(time, MENU_SEQUENCE.chords[index]);

  // MENU EXTRA FX
  // Decorative one-shots/sweeps should be guarded here so they can be muted while debugging.
  if (MENU_MUSIC_LAYERS.extraFx) {
    // Intentionally empty until menu-only decorative FX are present.
  }
}

function runMenuScheduler() {
  const ctx = ensureContext();
  if (!ctx || !menuMusicPlaying) return;
  while (menuMusicNextTime < ctx.currentTime + MENU_LOOKAHEAD) {
    scheduleMenuStep(menuMusicNextStep, menuMusicNextTime);
    menuMusicNextStep = (menuMusicNextStep + 1) % MENU_STEPS;
    menuMusicNextTime += MENU_STEP;
  }
}

export function startMenuMusic() {
  const ctx = ensureContext();
  if (!ctx || menuMusicPlaying) return;
  menuMusicPlaying = true;
  menuMusicNextStep = 0;
  menuMusicNextTime = ctx.currentTime + 0.08;
  if (menuMusicFadeGain) {
    menuMusicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
    menuMusicFadeGain.gain.setValueAtTime(menuMusicFadeGain.gain.value, ctx.currentTime);
    menuMusicFadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.65);
  }
  runMenuScheduler();
  menuMusicTimer = setInterval(runMenuScheduler, 100);
}

export function stopMenuMusic(fadeSeconds = 0.45) {
  const ctx = ensureContext();
  if (!ctx || !menuMusicPlaying) return;
  menuMusicPlaying = false;
  if (menuMusicTimer) clearInterval(menuMusicTimer);
  menuMusicTimer = null;
  if (menuMusicFadeGain) {
    menuMusicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
    menuMusicFadeGain.gain.setValueAtTime(menuMusicFadeGain.gain.value, ctx.currentTime);
    menuMusicFadeGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fadeSeconds);
  }
}

function connectGameplayVoice(source, amp, useDelay = false) {
  if (!gameplayMusicFadeGain) return;
  source.connect(amp).connect(gameplayMusicFadeGain);
  if (useDelay && gameplayDelay) amp.connect(gameplayDelay);
}

function scheduleGameplayKick(time, gain = 0.26) {
  const ctx = ensureContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(118, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
  connectGameplayVoice(osc, amp);
  osc.start(time);
  osc.stop(time + 0.21);
}

function scheduleGameplaySnare(time) {
  const ctx = ensureContext();
  if (!ctx) return;
  const duration = 0.105;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1700;
  filter.Q.value = 0.9;
  amp.gain.setValueAtTime(0.11, time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  connectGameplayVoice(filter, amp);
  source.start(time);
  source.stop(time + duration + 0.01);
}

function scheduleGameplayHat(time, accent = false) {
  const ctx = ensureContext();
  if (!ctx) return;
  const duration = accent ? 0.055 : 0.028;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = accent ? 5200 : 6500;
  amp.gain.setValueAtTime(accent ? 0.05 : 0.028, time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  connectGameplayVoice(filter, amp, accent);
  source.start(time);
}

function scheduleGameplayBass(time, freq) {
  const ctx = ensureContext();
  if (!ctx || !freq) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(260, time);
  filter.frequency.exponentialRampToValueAtTime(130, time + GAMEPLAY_STEP * 1.35);
  filter.Q.value = 4.5;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(0.145, time + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + GAMEPLAY_STEP * 1.65);
  osc.connect(filter);
  connectGameplayVoice(filter, amp);
  osc.start(time);
  osc.stop(time + GAMEPLAY_STEP * 1.8);
}

function scheduleGameplayPluck(time, freq, gain = 0.055) {
  const ctx = ensureContext();
  if (!ctx || !freq) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);
  osc.detune.value = (Math.random() - 0.5) * 5;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, time);
  filter.frequency.exponentialRampToValueAtTime(420, time + 0.16);
  filter.Q.value = 6;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  osc.connect(filter);
  connectGameplayVoice(filter, amp, true);
  osc.start(time);
  osc.stop(time + 0.24);
}

function scheduleGameplayIntroStep(step, time) {
  const progress = step / GAMEPLAY_INTRO_STEPS;
  if (step % 4 === 0) scheduleGameplayKick(time, 0.12 + progress * 0.13);
  if (step >= 16 && step % 8 === 4) scheduleGameplaySnare(time);
  if (step >= 8 && step % 2 === 1) scheduleGameplayHat(time, step >= 24);
  if (step % 2 === 0) scheduleGameplayPluck(time, 220 * (1 + progress * 1.9), 0.035 + progress * 0.035);
  if (step >= 24) scheduleGameplayBass(time, GAMEPLAY_BASS[step % GAMEPLAY_STEPS]);
}

function scheduleGameplayLoopStep(step, time) {
  const index = step % GAMEPLAY_STEPS;
  if (index % 4 === 0) scheduleGameplayKick(time);
  if (index % 16 === 4 || index % 16 === 12) scheduleGameplaySnare(time);
  if (index % 2 === 1 || index % 8 === 6) scheduleGameplayHat(time, index % 8 === 6);
  scheduleGameplayBass(time, GAMEPLAY_BASS[index]);
  scheduleGameplayPluck(time, GAMEPLAY_PLUCK[index]);
  if (index % 16 >= 8) scheduleGameplayPluck(time, GAMEPLAY_LEAD[index], 0.035);
}

function runGameplayScheduler() {
  const ctx = ensureContext();
  if (!ctx || !gameplayMusicPlaying) return;
  while (gameplayMusicNextTime < ctx.currentTime + GAMEPLAY_LOOKAHEAD) {
    if (gameplayMusicNextStep < GAMEPLAY_INTRO_STEPS) {
      scheduleGameplayIntroStep(gameplayMusicNextStep, gameplayMusicNextTime);
    } else {
      scheduleGameplayLoopStep(gameplayMusicNextStep - GAMEPLAY_INTRO_STEPS, gameplayMusicNextTime);
    }
    gameplayMusicNextStep += 1;
    gameplayMusicNextTime += GAMEPLAY_STEP;
  }
}

export function startGameplayMusic() {
  const ctx = ensureContext();
  if (!ctx) return;
  stopMenuMusic(0.35);
  if (gameplayMusicPlaying) return;
  gameplayMusicPlaying = true;
  gameplayMusicDucked = false;
  gameplayMusicNextStep = 0;
  gameplayMusicNextTime = ctx.currentTime + 0.08;
  if (gameplayMusicFadeGain) {
    gameplayMusicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
    gameplayMusicFadeGain.gain.setValueAtTime(gameplayMusicFadeGain.gain.value, ctx.currentTime);
    gameplayMusicFadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.55);
  }
  runGameplayScheduler();
  gameplayMusicTimer = setInterval(runGameplayScheduler, 100);
}

export function stopGameplayMusic(fadeSeconds = 0.35) {
  const ctx = ensureContext();
  if (!ctx || !gameplayMusicPlaying) return;
  gameplayMusicPlaying = false;
  if (gameplayMusicTimer) clearInterval(gameplayMusicTimer);
  gameplayMusicTimer = null;
  gameplayMusicDucked = false;
  if (gameplayMusicFadeGain) {
    gameplayMusicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
    gameplayMusicFadeGain.gain.setValueAtTime(gameplayMusicFadeGain.gain.value, ctx.currentTime);
    gameplayMusicFadeGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fadeSeconds);
  }
}

export function setGameplayMusicDucked(ducked) {
  const ctx = ensureContext();
  if (!ctx || !gameplayMusicFadeGain || !gameplayMusicPlaying) return;
  gameplayMusicDucked = Boolean(ducked);
  gameplayMusicFadeGain.gain.cancelScheduledValues(ctx.currentTime);
  gameplayMusicFadeGain.gain.setValueAtTime(gameplayMusicFadeGain.gain.value, ctx.currentTime);
  gameplayMusicFadeGain.gain.linearRampToValueAtTime(gameplayMusicDucked ? 0.25 : 1, ctx.currentTime + 0.28);
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
