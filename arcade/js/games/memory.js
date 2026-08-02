/**
 * memory.js — Memory Match with a "cleared in under 20 moves" badge and a
 * persisted best (fewest moves) score.
 */
import { registerGame, showHub } from '../core/router.js';
import { announce, showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { scorePulse } from '../core/particles.js';
import { finishGame, getHighScore } from '../core/state.js';

const grid = document.getElementById('memory-grid');
const statusEl = document.getElementById('memory-status');
const restartBtn = document.getElementById('memory-restart');
const SYMBOLS = ['👾', '🕹️', '👻', '🍄', '💎', '⭐', '🚀', '🔑'];

let cards, flipped, matchedCount, moves, lock;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  cards = shuffle([...SYMBOLS, ...SYMBOLS]).map((sym, i) => ({ id: i, sym, matched: false }));
  flipped = [];
  matchedCount = 0;
  moves = 0;
  lock = false;
  const best = getHighScore('memory');
  announce(statusEl, `Moves: 0${best !== null ? ` — best: ${best}` : ''}`);
  render();
}

function render() {
  grid.innerHTML = '';
  cards.forEach((c) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className =
      'mem-card' + (c.matched ? ' matched' : '') + (flipped.includes(c.id) || c.matched ? '' : ' hidden-face');
    el.textContent = c.matched || flipped.includes(c.id) ? c.sym : '?';
    el.setAttribute('aria-label', c.matched ? `Matched: ${c.sym}` : flipped.includes(c.id) ? c.sym : 'Face-down card');
    el.style.border = '1px solid var(--panel-edge)';
    el.style.background = 'inherit';
    el.style.font = 'inherit';
    if (!c.matched) {
      el.addEventListener('click', () => flip(c.id, el));
    } else {
      el.disabled = true;
    }
    grid.appendChild(el);
  });
}

function flip(id, el) {
  if (lock) return;
  const card = cards.find((c) => c.id === id);
  if (card.matched || flipped.includes(id)) return;

  flipped.push(id);
  sfx.move();
  render();

  if (flipped.length === 2) {
    moves++;
    const best = getHighScore('memory');
    announce(statusEl, `Moves: ${moves}${best !== null ? ` — best: ${best}` : ''}`);
    lock = true;
    const [a, b] = flipped.map((i) => cards.find((c) => c.id === i));
    if (a.sym === b.sym) {
      a.matched = true; b.matched = true;
      matchedCount += 2;
      flipped = [];
      lock = false;
      sfx.score();
      render();
      if (matchedCount === cards.length) {
        finish();
      }
    } else {
      setTimeout(() => {
        flipped = [];
        lock = false;
        render();
      }, 700);
    }
  }
}

function finish() {
  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'memory',
    score: moves,
    higherIsBetter: false, // fewer moves is better
    won: true,
    moves,
  });
  announce(statusEl, `Cleared in ${moves} moves!`);
  showOverlay('memory', {
    won: true,
    title: 'Board cleared!',
    message: `Cleared in ${moves} moves.`,
    score: moves,
    bestScore,
    isNewHighScore,
    newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

restartBtn.addEventListener('click', init);
registerGame('memory', { onEnter: init });
