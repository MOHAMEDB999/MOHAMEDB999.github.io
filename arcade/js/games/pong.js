/**
 * pong.js — Pong vs a house-AI paddle. Adds touch-drag paddle control
 * (the original only supported mouse/keyboard) and a "shutout" badge.
 */
import { registerGame, showHub } from '../core/router.js';
import { announce, showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const canvas = document.getElementById('pong-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('pong-status');
const restartBtn = document.getElementById('pong-restart');

const W = canvas.width, H = canvas.height;
const PADDLE_W = 10, PADDLE_H = 70, BALL_R = 7;
const WIN_SCORE = 5;

let playerY, houseY, ball, playerScore, houseScore, running, loopId, upPressed, downPressed, finished;

function reset() {
  playerY = H / 2 - PADDLE_H / 2;
  houseY = H / 2 - PADDLE_H / 2;
  playerScore = 0;
  houseScore = 0;
  running = true;
  finished = false;
  resetBall(1);
  announce(statusEl, 'You: 0 — House: 0');
  if (loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(loop);
}

function resetBall(dir) {
  ball = { x: W / 2, y: H / 2, vx: 4.2 * dir, vy: Math.random() * 4 - 2 };
}

function update() {
  if (!running) return;

  if (upPressed) playerY -= 6;
  if (downPressed) playerY += 6;
  playerY = Math.max(0, Math.min(H - PADDLE_H, playerY));

  const targetY = ball.y - PADDLE_H / 2;
  const aiSpeed = 4.2;
  if (houseY < targetY) houseY = Math.min(houseY + aiSpeed, targetY);
  else if (houseY > targetY) houseY = Math.max(houseY - aiSpeed, targetY);
  houseY = Math.max(0, Math.min(H - PADDLE_H, houseY));

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; }
  if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy *= -1; }

  if (ball.x - BALL_R < PADDLE_W && ball.y > playerY && ball.y < playerY + PADDLE_H && ball.vx < 0) {
    ball.x = PADDLE_W + BALL_R;
    ball.vx *= -1.05;
    ball.vy += (ball.y - (playerY + PADDLE_H / 2)) * 0.12;
    sfx.move();
  }
  if (ball.x + BALL_R > W - PADDLE_W && ball.y > houseY && ball.y < houseY + PADDLE_H && ball.vx > 0) {
    ball.x = W - PADDLE_W - BALL_R;
    ball.vx *= -1.05;
    ball.vy += (ball.y - (houseY + PADDLE_H / 2)) * 0.12;
    sfx.move();
  }

  if (ball.x < 0) {
    houseScore++;
    checkScore();
    resetBall(1);
  } else if (ball.x > W) {
    playerScore++;
    checkScore();
    resetBall(-1);
  }
}

function checkScore() {
  announce(statusEl, `You: ${playerScore} — House: ${houseScore}`);
  if (playerScore >= WIN_SCORE || houseScore >= WIN_SCORE) {
    running = false;
    finished = true;
    const won = playerScore > houseScore;
    const { isNewHighScore, bestScore, newBadges } = finishGame({
      gameId: 'pong',
      score: playerScore,
      higherIsBetter: true,
      won,
      opponentScore: houseScore,
    });
    showOverlay('pong', {
      won,
      title: won ? 'You win!' : 'House wins',
      message: `Final: You ${playerScore} — House ${houseScore}`,
      score: playerScore,
      bestScore,
      isNewHighScore,
      newBadges,
      onPlayAgain: reset,
      onBackToHub: showHub,
    });
  }
}

function draw() {
  ctx.fillStyle = '#060410';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(139,127,176,0.35)';
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#2de2e6';
  ctx.fillRect(0, playerY, PADDLE_W, PADDLE_H);
  ctx.fillStyle = '#ff2eae';
  ctx.fillRect(W - PADDLE_W, houseY, PADDLE_W, PADDLE_H);

  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  update();
  draw();
  loopId = requestAnimationFrame(loop);
}

function keyDown(e) {
  if (document.getElementById('screen-pong').hidden) return;
  if (e.key === 'ArrowUp') { upPressed = true; e.preventDefault(); }
  if (e.key === 'ArrowDown') { downPressed = true; e.preventDefault(); }
}
function keyUp(e) {
  if (e.key === 'ArrowUp') upPressed = false;
  if (e.key === 'ArrowDown') downPressed = false;
}
function pointerToPaddle(clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = H / rect.height;
  const y = (clientY - rect.top) * scale;
  playerY = Math.max(0, Math.min(H - PADDLE_H, y - PADDLE_H / 2));
}
function mouseMove(e) {
  pointerToPaddle(e.clientY);
}
function touchMove(e) {
  if (!e.touches.length) return;
  pointerToPaddle(e.touches[0].clientY);
  e.preventDefault();
}

document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);
canvas.addEventListener('mousemove', mouseMove);
canvas.addEventListener('touchstart', touchMove, { passive: false });
canvas.addEventListener('touchmove', touchMove, { passive: false });
restartBtn.addEventListener('click', reset);

registerGame('pong', {
  onEnter: reset,
  onExit: () => { running = false; cancelAnimationFrame(loopId); },
});
