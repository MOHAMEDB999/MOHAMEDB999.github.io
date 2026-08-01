/**
 * snake.js — classic Snake with persisted high score and a "score 25+" badge.
 */
import { registerGame } from '../core/router.js';
import { announce, showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame, getHighScore } from '../core/state.js';

const canvas = document.getElementById('snake-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('snake-status');
const restartBtn = document.getElementById('snake-restart');

const CELL = 20;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;

let snake, dir, nextDir, food, score, running, gameOver, loopId, lastTime, stepMs;
let touchStartX, touchStartY;

function reset() {
  snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  running = false;
  gameOver = false;
  stepMs = 110;
  placeFood();
  const best = getHighScore('snake');
  announce(statusEl, `Score: 0${best !== null ? ` — best: ${best}` : ''} — press an arrow key to start`);
  draw();
}

function placeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function draw() {
  ctx.fillStyle = '#060410';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ff2eae';
  ctx.shadowColor = '#ff2eae';
  ctx.shadowBlur = 8;
  ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
  ctx.shadowBlur = 0;

  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#ffd23f' : '#2de2e6';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (
    head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
    snake.some((s) => s.x === head.x && s.y === head.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score++;
    sfx.score();
    announce(statusEl, `Score: ${score}`);
    placeFood();
    stepMs = Math.max(60, stepMs - 2);
  } else {
    snake.pop();
  }
  draw();
}

function endGame() {
  gameOver = true;
  running = false;
  draw();
  cancelAnimationFrame(loopId);

  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'snake',
    score,
    higherIsBetter: true,
  });

  showOverlay('snake', {
    won: false,
    title: 'Game over',
    message: `The snake ran into ${score === 0 ? 'the wall' : 'something'}.`,
    score,
    bestScore,
    isNewHighScore,
    newBadges,
    onPlayAgain: reset,
    onBackToHub: () => {},
  });
}

function loop(ts) {
  if (!running) return;
  if (!lastTime) lastTime = ts;
  if (ts - lastTime >= stepMs) {
    lastTime = ts;
    step();
  }
  loopId = requestAnimationFrame(loop);
}

function start() {
  if (running || gameOver) return;
  running = true;
  lastTime = 0;
  loopId = requestAnimationFrame(loop);
}

function setDir(x, y) {
  if (dir.x === -x && dir.y === -y) return;
  nextDir = { x, y };
  start();
}

function keyHandler(e) {
  if (document.getElementById('screen-snake').hidden) return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'w'].includes(k)) { setDir(0, -1); e.preventDefault(); }
  else if (['arrowdown', 's'].includes(k)) { setDir(0, 1); e.preventDefault(); }
  else if (['arrowleft', 'a'].includes(k)) { setDir(-1, 0); e.preventDefault(); }
  else if (['arrowright', 'd'].includes(k)) { setDir(1, 0); e.preventDefault(); }
}

canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY;
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX, dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
  else setDir(0, dy > 0 ? 1 : -1);
}, { passive: true });

document.addEventListener('keydown', keyHandler);
restartBtn.addEventListener('click', reset);

registerGame('snake', {
  onEnter: reset,
  onExit: () => { running = false; cancelAnimationFrame(loopId); },
});
