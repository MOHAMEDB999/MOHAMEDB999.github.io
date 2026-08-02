/**
 * ui.js — shared UI pieces every game uses instead of hand-rolling its own:
 *   - a consistent game-over / victory overlay (score, best, play again, hub)
 *   - toast notifications for newly-earned badges
 *   - a tiny helper for pushing text into aria-live status regions
 *
 * This is what makes "every game reports score/status the same way" true in
 * practice: games call showOverlay(...) with a plain data object and never
 * touch DOM/animation/audio wiring themselves.
 */

import { sfx } from './audio.js';
import { confettiBurst, shakeAndFlash } from './particles.js';

/**
 * Push text into an element that's already wired as an aria-live region.
 * Kept as a named helper (rather than inline textContent everywhere) so the
 * intent — "this is a screen-reader announcement, not just a label" — is
 * visible in game code.
 * @param {HTMLElement|null} el
 * @param {string} text
 */
export function announce(el, text) {
  if (!el) return;
  el.textContent = text;
}

/**
 * @typedef {Object} OverlayConfig
 * @property {boolean} won
 * @property {string} title
 * @property {string} [message]
 * @property {number} [score]
 * @property {number|null} [bestScore]
 * @property {boolean} [isNewHighScore]
 * @property {Array<{id:string,label:string}>} [newBadges]
 * @property {() => void} onPlayAgain
 * @property {() => void} onBackToHub
 */

/**
 * Populate and reveal the shared game-over/victory overlay inside a game
 * screen, and fire the matching audio/particle feedback.
 * @param {string} gameId
 * @param {OverlayConfig} cfg
 */
export function showOverlay(gameId, cfg) {
  const screen = document.getElementById(`screen-${gameId}`);
  if (!screen) return;
  const overlay = screen.querySelector('[data-overlay]');
  if (!overlay) return;

  const scoreLine =
    typeof cfg.score === 'number'
      ? `<div class="overlay-score">Score: <b>${cfg.score}</b>${
          cfg.bestScore !== null && cfg.bestScore !== undefined
            ? ` &nbsp;·&nbsp; Best: <b>${cfg.bestScore}</b>${cfg.isNewHighScore ? ' <span class="overlay-new">NEW!</span>' : ''}`
            : ''
        }</div>`
      : '';

  const badgeLines = (cfg.newBadges || [])
    .map((b) => `<div class="overlay-badge">🏅 Badge unlocked — ${escapeHtml(b.label)}</div>`)
    .join('');

  overlay.innerHTML = `
    <div class="overlay-panel" role="alertdialog" aria-labelledby="overlay-title-${gameId}">
      <div class="overlay-title ${cfg.won ? 'is-win' : 'is-loss'}" id="overlay-title-${gameId}">${escapeHtml(cfg.title)}</div>
      ${cfg.message ? `<p class="overlay-message">${escapeHtml(cfg.message)}</p>` : ''}
      ${scoreLine}
      ${badgeLines}
      <div class="overlay-actions">
        <button class="btn primary" data-overlay-again type="button">Play again</button>
        <button class="btn" data-overlay-hub type="button">← Hub</button>
      </div>
    </div>
  `;
  overlay.hidden = false;

  overlay.querySelector('[data-overlay-again]').addEventListener(
    'click',
    () => {
      hideOverlay(gameId);
      cfg.onPlayAgain?.();
    },
    { once: true }
  );
  overlay.querySelector('[data-overlay-hub]').addEventListener(
    'click',
    () => {
      hideOverlay(gameId);
      cfg.onBackToHub?.();
    },
    { once: true }
  );

  // Focus the panel for keyboard/screen-reader users so the outcome is
  // announced immediately without hunting for it.
  const panel = overlay.querySelector('.overlay-panel');
  panel.setAttribute('tabindex', '-1');
  panel.focus();

  if (cfg.won) {
    sfx.win();
    confettiBurst();
  } else {
    sfx.lose();
    shakeAndFlash(screen);
  }
  if (cfg.newBadges?.length) {
    cfg.newBadges.forEach((b, i) => setTimeout(() => toast(`🏅 ${b.label}`), 500 + i * 900));
  }
}

/** Hide a game's overlay, if present. */
export function hideOverlay(gameId) {
  const screen = document.getElementById(`screen-${gameId}`);
  const overlay = screen?.querySelector('[data-overlay]');
  if (overlay) {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
}

let toastContainer = null;
function ensureToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-stack';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('role', 'status');
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Show a short-lived toast notification (used for badge unlocks so they're
 * visible even when the overlay that triggered them has already closed).
 * @param {string} message
 */
export function toast(message) {
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  sfx.badge();
  requestAnimationFrame(() => el.classList.add('is-visible'));
  setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 400);
  }, 3600);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export { escapeHtml };

// Safety net: Escape always closes whatever overlay is currently open,
// even if a game's own button wiring ever breaks.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openOverlay = document.querySelector('[data-overlay]:not([hidden])');
  if (!openOverlay) return;
  const hubBtn = openOverlay.querySelector('[data-overlay-hub]');
  if (hubBtn) hubBtn.click();
});

