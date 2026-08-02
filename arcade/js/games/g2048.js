/**
 * g2048.js — 2048 with persisted high score and a "reached the 2048 tile" badge.
 */
import { registerGame, showHub } from '../core/router.js';
import { announce, showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame, getHighScore } from '../core/state.js';

const boardEl = document.getElementById('g2048-board');
const statusEl = document.getElementById('g2048-status');
const restartBtn = document.getElementById('g2048-restart');
const SIZE = 4;

let grid, score, over, won, touchStartX, touchStartY;

const TILE_COLORS = {
  2: '#180f30', 4: '#241a44', 8: '#33206a', 16: '#3d1f82',
  32: '#5a1f8f', 64: '#7a1f8f', 128: '#a3208a', 256: '#c92a7e',
  512: '#e8386b', 1024: '#ff5b4d', 2048: '#ffd23f',
};

function init() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  over = false;
  won = false;
  addTile(); addTile();
  render();
  const best = getHighScore('g2048');
  announce(statusEl, `Score: 0${best !== null ? ` — best: ${best}` : ''}`);
}

function addTile() {
  const empty = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function render() {
  boardEl.innerHTML = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const el = document.createElement('div');
      el.className = 'tile-2048';
      el.setAttribute('role', 'gridcell');
      if (v) {
        el.textContent = v;
        el.setAttribute('aria-label', String(v));
        el.style.background = TILE_COLORS[v] || '#ffd23f';
        el.style.color = v <= 8 ? '#8b7fb0' : '#0a0714';
      } else {
        el.setAttribute('aria-label', 'empty');
      }
      boardEl.appendChild(el);
    }
  }
}

function slideRowLeft(row) {
  let vals = row.filter((v) => v !== 0);
  let gained = 0;
  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i] === vals[i + 1]) {
      vals[i] *= 2;
      gained += vals[i];
      vals.splice(i + 1, 1);
    }
  }
  while (vals.length < SIZE) vals.push(0);
  return { row: vals, gained };
}

function rotateGridCW(g) {
  const n = g.length;
  const res = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) res[c][n - 1 - r] = g[r][c];
  return res;
}

function move(dir) {
  if (over) return;
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[dir];
  let g = grid;
  for (let i = 0; i < rotations; i++) g = rotateGridCW(g);

  let moved = false;
  let totalGain = 0;
  const newGrid = g.map((row) => {
    const before = row.join(',');
    const { row: newRow, gained } = slideRowLeft(row);
    if (newRow.join(',') !== before) moved = true;
    totalGain += gained;
    return newRow;
  });

  let restored = newGrid;
  for (let i = 0; i < (4 - rotations) % 4; i++) restored = rotateGridCW(restored);

  if (moved) {
    grid = restored;
    score += totalGain;
    if (totalGain > 0) sfx.move();
    addTile();
    render();
    const best = getHighScore('g2048');
    announce(statusEl, `Score: ${score}${best !== null ? ` — best: ${best}` : ''}`);
    checkWinLose();
  }
}

function checkWinLose() {
  if (!won) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 2048) {
          won = true;
          announce(statusEl, `Score: ${score} — 2048 reached!`);
          const { isNewHighScore, bestScore, newBadges } = finishGame({
            gameId: 'g2048', score, higherIsBetter: true, won: true,
          });
          showOverlay('g2048', {
            won: true,
            title: '2048 reached!',
            message: 'Keep playing for a higher score, or start fresh.',
            score, bestScore, isNewHighScore, newBadges,
            onPlayAgain: init,
            onBackToHub: showHub,
          });
          return;
        }
      }
    }
  }
  const hasEmpty = grid.some((row) => row.includes(0));
  if (hasEmpty) return;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      if (c < SIZE - 1 && grid[r][c + 1] === v) return;
      if (r < SIZE - 1 && grid[r + 1][c] === v) return;
    }
  }
  over = true;
  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'g2048', score, higherIsBetter: true, won: false,
  });
  announce(statusEl, `Game over — final score: ${score}`);
  showOverlay('g2048', {
    won: false,
    title: 'No more moves',
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

function keyHandler(e) {
  if (document.getElementById('screen-g2048').hidden) return;
  const k = e.key.toLowerCase();
  const map = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
  if (map[k]) { e.preventDefault(); move(map[k]); }
}

boardEl.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
}, { passive: true });
boardEl.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}, { passive: true });

document.addEventListener('keydown', keyHandler);
restartBtn.addEventListener('click', init);
registerGame('g2048', { onEnter: init });
