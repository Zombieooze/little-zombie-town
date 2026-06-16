import { buyPermanentUpgrade, getPermanentUpgradeLevels, getTotalCoins, resetPermanentProgress } from './save.js';
import { PERMANENT_UPGRADES, getPermanentUpgradeCost } from './permanent-upgrades.js';
import { getAbilityDisplayName, MAX_ABILITY_LEVEL } from './abilities.js';

const $ = (id) => document.getElementById(id);
const screens = ['menu-screen', 'shop-screen', 'pause-screen', 'upgrade-screen', 'end-screen'];

let selectedUpgradeIndex = 0;
let selectedMenuIndex = 0;
const menuGroups = {
  menu: { root: 'menu-screen', selector: '#start-button, #shop-button, #menu-fullscreen-button:not(.hidden)' },
  shop: { root: 'shop-screen', selector: '#shop-back-button, #shop-reset-button, .shop-buy-button:not(:disabled)' },
  paused: { root: 'pause-screen', selector: '#resume-button' },
  ended: { root: 'end-screen', selector: '#again-button, #menu-button' },
};
let toastTimer = null;
let damageFlashTimer = null;

export function initUI({ onStart, onUpgrade, onMenu, onShop, onPause, onResume, onFullscreen }) {
  $('start-button').addEventListener('click', onStart);
  $('shop-button').addEventListener('click', onShop);
  $('shop-back-button').addEventListener('click', onMenu);
  $('shop-cards').addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-upgrade]');
    if (!button) return;
    buyPermanentUpgrade(button.dataset.shopUpgrade);
    renderShop();
    updateMenuCoins();
  });
  $('shop-reset-button').addEventListener('click', () => {
    if (!confirm('Reset all progress? This will clear saved coins and permanent upgrades.')) return;
    resetPermanentProgress();
    renderShop();
    updateMenuCoins();
  });
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


export function showDamageFlash() {
  const flash = $('damage-flash');
  if (!flash) return;
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
  clearTimeout(damageFlashTimer);
  damageFlashTimer = setTimeout(() => flash.classList.remove('active'), 430);
}

export function showControllerMessage(message) {
  const toast = $('controller-toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 1800);
}

function getMenuButtons(context) {
  const group = menuGroups[context];
  if (!group) return [];
  return [...$(group.root).querySelectorAll(group.selector)].filter((button) => button.offsetParent !== null);
}

export function moveMenuSelection(context, direction) {
  const buttons = getMenuButtons(context);
  if (!buttons.length) return;
  selectedMenuIndex = (selectedMenuIndex + direction + buttons.length) % buttons.length;
  updateMenuSelection(context);
}

export function activateMenuSelection(context) {
  const buttons = getMenuButtons(context);
  const button = buttons[selectedMenuIndex] || buttons[0];
  if (button) button.click();
}

function updateMenuSelection(context) {
  Object.keys(menuGroups).forEach((key) => getMenuButtons(key).forEach((button) => button.classList.remove('controller-selected')));
  const buttons = getMenuButtons(context);
  if (!buttons.length) return;
  selectedMenuIndex = Math.min(selectedMenuIndex, buttons.length - 1);
  buttons[selectedMenuIndex].classList.add('controller-selected');
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
  selectedMenuIndex = 0;
  screens.forEach((id) => {
    $(id).classList.toggle('hidden', id !== name);
    $(id).classList.toggle('active', id === name);
  });
  $('hud').classList.toggle('hidden', name === 'menu-screen' || name === 'end-screen');
  const context = name === 'menu-screen' ? 'menu' : name === 'shop-screen' ? 'shop' : name === 'pause-screen' ? 'paused' : name === 'end-screen' ? 'ended' : null;
  if (context) updateMenuSelection(context);
}

export function hideOverlays() { screens.filter((id) => id !== 'menu-screen').forEach((id) => { $(id).classList.add('hidden'); $(id).classList.remove('active'); }); }
export function setGameActionsVisible(visible) { $('game-actions').classList.toggle('hidden', !visible); }
export function setPauseButtonVisible(visible) { $('pause-button').classList.toggle('hidden', !visible); }
export function updateMenuCoins() { $('menu-total-coins').textContent = getTotalCoins(); }

export function showShop() {
  renderShop();
  showScreen('shop-screen');
}

function renderShop() {
  const totalCoins = getTotalCoins();
  const levels = getPermanentUpgradeLevels();
  $('shop-total-coins').textContent = totalCoins;
  $('shop-cards').innerHTML = PERMANENT_UPGRADES.map((upgrade) => {
    const level = levels[upgrade.id] ?? 0;
    const maxLevel = upgrade.max;
    const isMaxed = level >= maxLevel;
    const cost = isMaxed ? 0 : getPermanentUpgradeCost(upgrade, level);
    const affordable = totalCoins >= cost;
    const pips = Array.from({ length: maxLevel }, (_, index) => `<span class="shop-pip ${index < level ? 'filled' : ''}"></span>`).join('');
    return `
      <article class="shop-card">
        <div class="shop-card-top"><span class="shop-emoji">${upgrade.emoji}</span><div><h3>${upgrade.name}</h3><small>Lv. ${level}/${maxLevel}</small></div></div>
        <p>${upgrade.description}</p>
        <div class="shop-pips" aria-label="${level} of ${maxLevel} levels">${pips}</div>
        <p class="shop-benefit">${level ? upgrade.effect(level) : 'No bonus yet'}</p>
        <button class="shop-buy-button ${isMaxed ? 'maxed' : ''}" data-shop-upgrade="${upgrade.id}" ${isMaxed || !affordable ? 'disabled' : ''}>${isMaxed ? 'MAXED' : `Buy · ${cost}`}</button>
      </article>`;
  }).join('');
}
export function setMuted(muted) { $('hud-muted').classList.toggle('hidden', !muted); }

export function showBossWarning(message = 'GRAVEBREAKER HAS AWAKENED!') {
  const warning = $('boss-warning');
  if (!warning) return;
  warning.textContent = message;
  warning.classList.remove('hidden');
  warning.classList.remove('active');
  void warning.offsetWidth;
  warning.classList.add('active');
  setTimeout(() => warning.classList.add('hidden'), 3600);
}

export function updateBossHealthBar(boss) {
  const bar = $('boss-health');
  if (!bar) return;
  if (!boss?.userData || boss.userData.health <= 0) {
    bar.classList.add('hidden');
    return;
  }
  const name = boss.userData.displayName || 'Gravebreaker';
  const maxHealth = boss.userData.maxHealth || boss.userData.health || 1;
  const percent = Math.max(0, Math.min(100, (boss.userData.health / maxHealth) * 100));
  $('boss-health-name').textContent = name;
  $('boss-health-fill').style.width = `${percent}%`;
  bar.classList.remove('hidden');
}

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
  selectedUpgradeIndex = options.length === 3 ? 1 : 0;
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
