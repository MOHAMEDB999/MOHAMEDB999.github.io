/**
 * router.js — navigation between the hub and the thirteen game screens.
 *
 * Replaces the old instant hide/show with a short crossfade + slide so
 * switching screens feels intentional rather than a hard cut. Each game
 * module registers onEnter/onExit callbacks (same contract as the original
 * site) via registerGame(); the router calls them and also drives
 * state.recordPlay() so persistence stays centralized.
 */

import { recordPlay } from './state.js';
import { sfx } from './audio.js';

/** @type {Record<string, HTMLElement>} */
const screens = {};
/** @type {Record<string, {onEnter?: Function, onExit?: Function}>} */
const registry = {};

let hubEl = null;
let activeGame = null;
let transitioning = false;

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Call once during boot with the hub element and a map of gameId -> screen element. */
export function initRouter(hub, screenMap) {
  hubEl = hub;
  Object.assign(screens, screenMap);
}

/**
 * Register a game's lifecycle hooks. onEnter runs every time the screen is
 * shown (including replays); onExit runs when leaving the screen (used to
 * cancel animation frames / intervals so a hidden game doesn't keep running).
 * @param {string} gameId
 * @param {{onEnter?: Function, onExit?: Function}} hooks
 */
export function registerGame(gameId, hooks) {
  registry[gameId] = hooks;
}

/** @returns {string|null} the currently active game id, or null when on the hub */
export function getActiveGame() {
  return activeGame;
}

function crossfade(hideEl, showEl, onMid) {
  if (transitioning) return;
  transitioning = true;
  const reduced = prefersReducedMotion();

  if (reduced) {
    hideEl.hidden = true;
    onMid?.();
    showEl.hidden = false;
    transitioning = false;
    return;
  }

  hideEl.classList.add('screen-leaving');
  const cleanupHide = () => {
    hideEl.hidden = true;
    hideEl.classList.remove('screen-leaving');
  };
  hideEl.addEventListener('animationend', cleanupHide, { once: true });
  // Safety net in case animationend doesn't fire (e.g. display:none race).
  setTimeout(cleanupHide, 260);

  onMid?.();
  showEl.hidden = false;
  showEl.classList.add('screen-entering');
  showEl.addEventListener(
    'animationend',
    () => {
      showEl.classList.remove('screen-entering');
      transitioning = false;
    },
    { once: true }
  );
  setTimeout(() => {
    showEl.classList.remove('screen-entering');
    transitioning = false;
  }, 320);
}

/**
 * Navigate to a game screen from the hub (or between games).
 * @param {string} gameId
 */
export function showGame(gameId) {
  const target = screens[gameId];
  if (!target) return;
  sfx.click();

  const currentEl = activeGame ? screens[activeGame] : hubEl;
  if (activeGame && registry[activeGame]?.onExit) registry[activeGame].onExit();

  crossfade(currentEl, target, () => {
    activeGame = gameId;
    recordPlay(gameId);
    registry[gameId]?.onEnter?.();
  });
}

/** Navigate back to the hub. */
export function showHub() {
  if (!activeGame) return;
  sfx.click();
  const current = screens[activeGame];
  if (registry[activeGame]?.onExit) registry[activeGame].onExit();
  const leavingGame = activeGame;
  crossfade(current, hubEl, () => {
    activeGame = null;
  });
  return leavingGame;
}
