/**
 * app.js — boot sequence. Wires the hub, the router, the profile summary
 * panel, the mute toggle, the reset-progress control, and registers the
 * service worker for offline play. Every game module is imported here for
 * its side effect (each one calls registerGame() at the bottom of its file).
 */
import { initRouter, registerGame, showGame, showHub } from './core/router.js';
import { getProfile, getEarnedBadges, getHighScore, onProfileChange, resetAllProgress } from './core/state.js';
import { isMuted, toggleMute } from './core/audio.js';

// Import every game module for its registerGame() side effect.
import './games/tictactoe.js';
import './games/snake.js';
import './games/memory.js';
import './games/g2048.js';
import './games/pong.js';
import './games/phish.js';
import './games/cipher.js';
import './games/firewall.js';
import './games/password.js';
import './games/vuln.js';
import './games/osint.js';
import './games/incident.js';
import './games/patch.js';

const hub = document.getElementById('hub');
const GAME_IDS = [
  'tictactoe', 'snake', 'memory', 'g2048', 'pong',
  'phish', 'cipher', 'firewall', 'password', 'vuln',
  'osint', 'incident', 'patch',
];
const screens = Object.fromEntries(GAME_IDS.map((id) => [id, document.getElementById(`screen-${id}`)]));

initRouter(hub, screens);

document.querySelectorAll('.cart').forEach((btn) => {
  btn.addEventListener('click', () => showGame(btn.dataset.game));
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', showHub);
});

/* ---------- Profile summary panel ---------- */
const statGamesPlayed = document.getElementById('stat-games-played');
const statBadgesCount = document.getElementById('stat-badges-count');
const badgesContainer = document.getElementById('profile-badges');

function renderProfile() {
  const profile = getProfile();
  const badges = getEarnedBadges();
  statGamesPlayed.textContent = profile.gamesPlayed || 0;
  statBadgesCount.textContent = badges.length;

  badgesContainer.innerHTML = badges.length
    ? badges.map((b) => `<span class="profile-badge-chip">🏅 ${escapeHtml(b.label)}</span>`).join('')
    : `<span class="profile-empty">No badges yet — clear a Cyber Ops drill with zero mistakes to earn your first one.</span>`;

  // Show a "best: N" line on each hub card that has a recorded high score.
  document.querySelectorAll('.cart').forEach((cart) => {
    const gameId = cart.dataset.game;
    const best = getHighScore(gameId);
    let bestEl = cart.querySelector('.cart-best');
    if (best !== null) {
      if (!bestEl) {
        bestEl = document.createElement('span');
        bestEl.className = 'cart-best';
        cart.appendChild(bestEl);
      }
      bestEl.textContent = `Best: ${best}`;
    } else if (bestEl) {
      bestEl.remove();
    }
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

onProfileChange(renderProfile);
renderProfile();

/* ---------- Reset all progress ---------- */
document.getElementById('reset-progress').addEventListener('click', () => {
  const confirmed = window.confirm(
    'This clears every high score, badge, and play count on this device. This cannot be undone. Continue?'
  );
  if (confirmed) {
    resetAllProgress();
    renderProfile();
  }
});

/* ---------- Mute toggle ---------- */
const muteBtn = document.getElementById('mute-toggle');
function syncMuteButton() {
  const muted = isMuted();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.setAttribute('aria-pressed', String(muted));
  muteBtn.setAttribute('aria-label', muted ? 'Unmute sound effects' : 'Mute sound effects');
}
syncMuteButton();
muteBtn.addEventListener('click', () => {
  toggleMute();
  syncMuteButton();
});

/* ---------- Service worker (offline play after first load) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is a progressive enhancement — a failed registration
         (e.g. unsupported host) should never block the site from working. */
    });
  });
}
