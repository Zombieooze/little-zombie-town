import { buyPermanentUpgrade, getPermanentUpgradeLevels, getTotalCoins, resetPermanentProgress } from './save.js';
import { PERMANENT_UPGRADES, getPermanentUpgradeCost } from './permanent-upgrades.js';
import { getActiveAbilityIds, getAbilityDisplayName, getAbilityMaxLevel } from './abilities.js';
import { PASSIVE_UPGRADE_VALUES, UPGRADES } from './upgrades.js';
import { playSound, unlockAudio } from './audio.js';

const $ = (id) => document.getElementById(id);
const screens = ['menu-screen', 'shop-screen', 'pause-screen', 'upgrade-screen', 'end-screen'];

let selectedUpgradeIndex = 0;
let upgradeControllerSelectionActive = false;
let selectedMenuIndex = 0;
const menuGroups = {
  menu: { root: 'menu-screen', selector: '#start-button, #shop-button, #menu-fullscreen-button:not(.hidden)' },
  shop: { root: 'shop-screen', selector: '#shop-back-button, #shop-reset-button, .shop-buy-button:not(:disabled)' },
  paused: { root: 'pause-screen', selector: '#resume-button, #restart-run-button' },
  ended: { root: 'end-screen', selector: '#again-button, #menu-button' },
};
let toastTimer = null;
let damageFlashTimer = null;
let activeConfirmModal = null;

export function initUI({ onStart, onUpgrade, onMenu, onShop, onPause, onResume, onRestart, onFullscreen }) {
  document.addEventListener('click', (event) => {
    if (event.target.closest('button')) { unlockAudio(); playSound('uiClick'); }
  });
  $('start-button').addEventListener('click', onStart);
  $('shop-button').addEventListener('click', onShop);
  $('shop-back-button').addEventListener('click', onMenu);
  $('shop-cards').addEventListener('click', (event) => {
    const button = event.target.closest('[data-shop-upgrade]');
    if (!button) return;
    const bought = buyPermanentUpgrade(button.dataset.shopUpgrade);
    playSound(bought?.ok ? 'shopBuy' : 'uiClick');
    renderShop();
    updateMenuCoins();
  });
  $('shop-reset-button').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'RESET ALL PROGRESS?',
      message: 'This will clear your saved coins and permanent upgrades. This cannot be undone.',
      confirmText: 'RESET PROGRESS',
      cancelText: 'CANCEL',
      danger: true,
    });
    if (!confirmed) return;
    resetPermanentProgress();
    renderShop();
    updateMenuCoins();
  });
  $('again-button').addEventListener('click', onStart);
  $('menu-button').addEventListener('click', onMenu);
  $('pause-button').addEventListener('click', onPause);
  $('resume-button').addEventListener('click', onResume);
  $('restart-run-button').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'RETURN TO MAIN MENU?',
      message: 'Bank the coins from this run and return to the main menu?',
      confirmText: 'BANK COINS & LEAVE',
      cancelText: 'STAY IN RUN',
    });
    if (confirmed) onRestart();
  });
  $('menu-fullscreen-button').addEventListener('click', onFullscreen);
  $('game-fullscreen-button').addEventListener('click', onFullscreen);
  $('upgrade-cards').addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'touch') setUpgradeControllerSelectionActive(false);
  });
  $('upgrade-cards').addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'touch') setUpgradeControllerSelectionActive(false);
  });
  $('upgrade-cards').addEventListener('click', (event) => {
    const button = event.target.closest('[data-upgrade]');
    if (button) onUpgrade(button.dataset.upgrade);
  });
  document.addEventListener('fullscreenchange', () => setFullscreenActive(!!document.fullscreenElement));
  updateMenuCoins();
  setFullscreenActive(!!document.fullscreenElement);
}

export function isConfirmModalOpen() {
  return !!activeConfirmModal;
}

export function showConfirmModal({ title, message, confirmText = 'CONFIRM', cancelText = 'CANCEL', danger = false }) {
  if (activeConfirmModal) activeConfirmModal.resolve(false);

  const modal = $('confirm-modal');
  const panel = modal?.querySelector('.confirm-modal-panel');
  const titleEl = $('confirm-modal-title');
  const messageEl = $('confirm-modal-message');
  const confirmButton = $('confirm-modal-confirm');
  const cancelButton = $('confirm-modal-cancel');
  if (!modal || !panel || !titleEl || !messageEl || !confirmButton || !cancelButton) {
    return Promise.resolve(false);
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmButton.textContent = confirmText;
  cancelButton.textContent = cancelText;
  confirmButton.classList.toggle('danger-button', danger);

  return new Promise((resolve) => {
    const previousFocus = document.activeElement;

    const close = (confirmed) => {
      modal.classList.add('hidden');
      modal.removeEventListener('click', onBackdropClick);
      confirmButton.removeEventListener('click', onConfirm);
      cancelButton.removeEventListener('click', onCancel);
      window.removeEventListener('keydown', onKeyDown, true);
      activeConfirmModal = null;
      if (previousFocus?.focus) previousFocus.focus({ preventScroll: true });
      resolve(confirmed);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);
    const onBackdropClick = (event) => {
      if (!panel.contains(event.target)) close(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(false);
      }
    };

    activeConfirmModal = { resolve: close };
    modal.classList.remove('hidden');
    modal.addEventListener('click', onBackdropClick);
    confirmButton.addEventListener('click', onConfirm, { once: true });
    cancelButton.addEventListener('click', onCancel, { once: true });
    window.addEventListener('keydown', onKeyDown, true);
    cancelButton.focus({ preventScroll: true });
  });
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
  const cards = [...$('upgrade-cards').querySelectorAll('[data-upgrade]')];
  return cards[selectedUpgradeIndex]?.dataset.upgrade || cards[0]?.dataset.upgrade;
}

export function setUpgradeControllerSelectionActive(active) {
  upgradeControllerSelectionActive = active;
  updateUpgradeSelection();
}

function updateUpgradeSelection() {
  const cards = [...$('upgrade-cards').querySelectorAll('[data-upgrade]')];
  cards.forEach((card, index) => card.classList.toggle('controller-selected', upgradeControllerSelectionActive && index === selectedUpgradeIndex));
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

function formatBonus(value, suffix = '') {
  if (!Number.isFinite(value)) return `0${suffix}`;
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`;
}

function renderHudList(targetId, items, emptyText) {
  const target = $(targetId);
  if (!items.length) {
    target.classList.add('empty-list');
    target.textContent = emptyText;
    return;
  }
  target.classList.remove('empty-list');
  target.innerHTML = items.map((item) => `
    <div class="hud-list-row">
      <span>${item.name}</span>
      <strong>${item.value}</strong>
    </div>`).join('');
}

function getPassiveRows(state) {
  const counts = state.passiveUpgradeCounts || {};
  const rows = UPGRADES.filter((upgrade) => counts[upgrade.id] > 0).map((upgrade) => {
    const level = counts[upgrade.id];
    const values = PASSIVE_UPGRADE_VALUES[upgrade.id] || {};
    let value = `Lv ${level}`;
    if (upgrade.id === 'firstAidTraining') value = `+${values.maxHealth * level} HP · Lv ${level}`;
    if (upgrade.id === 'runningShoes') value = `${formatBonus((Math.pow(values.speedMultiplier, level) - 1) * 100, '%')} · Lv ${level}`;
    if (upgrade.id === 'energyDrink') value = `${formatBonus((Math.pow(values.damageMultiplier, level) - 1) * 100, '%')} · Lv ${level}`;
    if (upgrade.id === 'coffeeRush') value = `${formatBonus((1 - Math.pow(values.cooldownMultiplier, level)) * 100, '%')} speed · Lv ${level}`;
    if (upgrade.id === 'scrapMagnet') value = `${formatBonus((Math.pow(values.pickupMagnetMultiplier, level) - 1) * 100, '%')} · Lv ${level}`;
    return { name: upgrade.name, value };
  });

  const derived = [
    { name: 'Damage Up', value: formatBonus(((state.damageMultiplier || 1) - 1) * 100, '%'), show: (state.damageMultiplier || 1) > 1.001 && !counts.energyDrink },
    { name: 'Coin Find', value: formatBonus(((state.coinMultiplier || 1) - 1) * 100, '%'), show: (state.coinMultiplier || 1) > 1.001 },
    { name: 'XP Gain', value: formatBonus(((state.xpMultiplier || 1) - 1) * 100, '%'), show: (state.xpMultiplier || 1) > 1.001 },
    { name: 'Health Regen', value: formatBonus(state.healthRegen || 0, ' HP/s'), show: (state.healthRegen || 0) > 0 },
    { name: 'Pickup Radius', value: formatBonus(((state.pickupMagnetMultiplier || 1) - 1) * 100, '%'), show: (state.pickupMagnetMultiplier || 1) > 1.001 && !counts.scrapMagnet },
    { name: 'Move Speed', value: formatBonus(((state.speedMultiplier || 1) - 1) * 100, '%'), show: (state.speedMultiplier || 1) > 1.001 && !counts.runningShoes },
    { name: 'Crit Chance', value: formatBonus((state.critChance || 0) * 100, '%'), show: (state.critChance || 0) > 0 },
  ].filter((row) => row.show);

  return [...rows, ...derived].slice(0, 7);
}

export function updateHUD(state) {
  const remaining = Math.max(0, (state.runDuration ?? 0) - state.elapsed);
  const timerValue = state.runDuration ? remaining : state.elapsed;
  const minutes = Math.floor(timerValue / 60);
  const seconds = Math.floor(timerValue % 60).toString().padStart(2, '0');
  $('hud-timer').textContent = `${minutes}:${seconds}`;
  $('hud-health').textContent = `${Math.ceil(state.health)}/${state.maxHealth}`;
  $('hud-level').textContent = state.level;
  $('hud-coins').textContent = state.coins;
  $('hud-kills').textContent = state.kills;
  $('hud-xp-text').textContent = `${Math.floor(state.xp)}/${state.nextXp}`;
  $('hud-health-bar').style.width = `${Math.min(100, Math.max(0, (state.health / state.maxHealth) * 100))}%`;
  $('hud-xp-bar').style.width = `${Math.min(100, Math.max(0, (state.xp / state.nextXp) * 100))}%`;
  const abilities = getActiveAbilityIds(state).map((id) => ({ name: getAbilityDisplayName(id), value: `${state.abilities.levels?.[id] ?? 1}/${getAbilityMaxLevel(id)}` }));
  renderHudList('hud-abilities', abilities, 'None owned');
  renderHudList('hud-passives', getPassiveRows(state), 'No bonuses yet');
}

export function showUpgrades(options, showControllerSelection = false) {
  selectedUpgradeIndex = 0;
  upgradeControllerSelectionActive = showControllerSelection;
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
