/**
 * tictactoe.js — 2-player local Tic-Tac-Toe.
 */
import { registerGame, showHub } from '../core/router.js';
import { announce, showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { scorePulse } from '../core/particles.js';

const boardEl = document.getElementById('ttt-board');
const statusEl = document.getElementById('ttt-status');
const resetBtn = document.getElementById('ttt-reset');

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board, turn, over;

/** Reset to a fresh round. */
function init() {
  board = Array(9).fill(null);
  turn = 'X';
  over = false;
  render();
  announce(statusEl, "Player X's turn");
}

function render() {
  boardEl.innerHTML = '';
  board.forEach((mark, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = mark || '';
    b.setAttribute('role', 'gridcell');
    b.setAttribute('aria-label', mark ? `Cell ${i + 1}: ${mark}` : `Cell ${i + 1}: empty`);
    if (mark) b.dataset.mark = mark;
    b.disabled = !!mark || over;
    b.addEventListener('click', () => play(i, b));
    boardEl.appendChild(b);
  });
}

/** @param {number} i cell index 0-8 */
function play(i, btnEl) {
  if (board[i] || over) return;
  board[i] = turn;
  sfx.move();
  scorePulse(btnEl);
  const win = WINS.find((c) => c.every((x) => board[x] === turn));
  if (win) {
    over = true;
    announce(statusEl, `Player ${turn} wins!`);
    render();
    showOverlay('tictactoe', {
      won: true,
      title: `Player ${turn} wins!`,
      onPlayAgain: init,
      onBackToHub: showHub,
    });
    return;
  }
  if (board.every(Boolean)) {
    over = true;
    announce(statusEl, "It's a draw.");
    render();
    showOverlay('tictactoe', {
      won: false,
      title: "It's a draw",
      message: 'No winner this round.',
      onPlayAgain: init,
      onBackToHub: showHub,
    });
    return;
  }
  turn = turn === 'X' ? 'O' : 'X';
  announce(statusEl, `Player ${turn}'s turn`);
  render();
}

resetBtn.addEventListener('click', init);
registerGame('tictactoe', { onEnter: init });
