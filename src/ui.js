import { getTotalCoins } from './save.js';
import { getAbilityDisplayName, MAX_ABILITY_LEVEL } from './abilities.js';

const $ = (id) => document.getElementById(id);
const screens = ['menu-screen', 'pause-screen', 'upgrade-screen', 'end-screen'];

let selectedUpgradeIndex = 0;
let toastTimer = null;

export function initUI({ onStart, onUpgrade, onMenu, onPause, onResume, onFullscreen }) {
  $('start-button').addEventListener('click', onStart);
  $('again-button').addEventListener('click', onStart);
  $('menu-button').addEventListener('click', onMenu);
  $('pause-button').addEventListener('click', onPause);
  $('resume-button').addEventListener('click', onResume);
  $('menu-fullscreen-button').addEventListener('click', onFullscreen);
  $('game-fullscreen-button').addEventListener('click', onFullscreen);
  $('upgrade-cards').addEventListener('click', (event) => {
    const button = event.target.closest('[data-upgrade]');
    if (button) onUpgrade(button.dataset.upgrade);
  });
  document.addEventListener('fullscreenchange', () => setFullscreenActive(!!document.fullscreenElement));
  updateMenuCoins();
  setFullscreenActive(!!document.fullscreenElement);
}

export function setFullscreenActive(active) {
  const label = active ? 'Exit Fullscreen' : 'Fullscreen';
  const icon = active ? '↙' : '⛶';
  $('menu-fullscreen-button').textContent = label;
  $('game-fullscreen-button').textContent = icon;
  $('game-fullscreen-button').setAttribute('aria-label', label);
}

export function showControllerMessage(message) {
  const toast = $('controller-toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
}

export function moveUpgradeSelection(direction) {
  const cards = [...$('upgrade-cards').querySelectorAll('[data-upgrade]')];
  if (!cards.length) return;
  selectedUpgradeIndex = (selectedUpgradeIndex + direction + cards.length) % cards.length;
  updateUpgradeSelection();
}

export function getSelectedUpgradeId() {
  return $('upgrade-cards').querySelector('.controller-selected')?.dataset.upgrade || $('upgrade-cards').querySelector('[data-upgrade]')?.dataset.upgrade;
}

function updateUpgradeSelection() {
  const cards = [...$('upgrade-cards').querySelectorAll('[data-upgrade]')];
  cards.forEach((card, index) => card.classList.toggle('controller-selected', index === selectedUpgradeIndex));
}

export function showScreen(name) {
  screens.forEach((id) => {
    $(id).classList.toggle('hidden', id !== name);
    $(id).classList.toggle('active', id === name);
  });
  $('hud').classList.toggle('hidden', name === 'menu-screen' || name === 'end-screen');
}

export function hideOverlays() { screens.filter((id) => id !== 'menu-screen').forEach((id) => { $(id).classList.add('hidden'); $(id).classList.remove('active'); }); }
export function setGameActionsVisible(visible) { $('game-actions').classList.toggle('hidden', !visible); }
export function setPauseButtonVisible(visible) { $('pause-button').classList.toggle('hidden', !visible); }
export function updateMenuCoins() { $('menu-total-coins').textContent = getTotalCoins(); }
export function setMuted(muted) { $('hud-muted').classList.toggle('hidden', !muted); }

export function updateHUD(state) {
  const minutes = Math.floor(state.elapsed / 60);
  const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
  $('hud-timer').textContent = `${minutes}:${seconds}`;
  $('hud-health').textContent = `${Math.ceil(state.health)}/${state.maxHealth}`;
  $('hud-level').textContent = state.level;
  $('hud-coins').textContent = state.coins;
  $('hud-abilities').textContent = state.abilities?.chosen?.map((id) => `${getAbilityDisplayName(id)} ${state.abilities.levels?.[id] ?? 1}/${MAX_ABILITY_LEVEL}`).join(' | ') || 'None';
  $('hud-xp-bar').style.width = `${Math.min(100, (state.xp / state.nextXp) * 100)}%`;
}

export function showUpgrades(options) {
  selectedUpgradeIndex = 0;
  $('upgrade-cards').innerHTML = options.map((upgrade) => `
    <button class="upgrade-card" data-upgrade="${upgrade.id}">
      <h3>${upgrade.name}</h3><p>${upgrade.description}</p>
    </button>`).join('');
  showScreen('upgrade-screen');
  updateUpgradeSelection();
}

export function showEnd({ won, time, kills, level, coins }) {
  $('end-title').textContent = won ? 'You survived Little Zombie Town!' : 'The town got you!';
  $('end-stats').innerHTML = `
    <div>Time survived: ${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, '0')}</div>
    <div>Zombies cleared: ${kills}</div><div>Level reached: ${level}</div><div>Coins earned: ${coins}</div>`;
  showScreen('end-screen');
  updateMenuCoins();
}
