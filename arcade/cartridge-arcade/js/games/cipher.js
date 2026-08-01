/**
 * cipher.js — Cipher Breaker (cryptography). Caesar-shift decoding drill.
 */
import { registerGame } from '../core/router.js';
import { showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const encodedEl = document.getElementById('cipher-encoded');
const previewEl = document.getElementById('cipher-preview');
const shiftInput = document.getElementById('cipher-shift');
const shiftVal = document.getElementById('cipher-shift-val');
const submitBtn = document.getElementById('cipher-submit');
const feedbackEl = document.getElementById('cipher-feedback');
const roundEl = document.getElementById('cipher-round');
const totalEl = document.getElementById('cipher-total');
const scoreEl = document.getElementById('cipher-score');
const restartBtn = document.getElementById('cipher-restart');

const PHRASES = [
  'TRUST BUT VERIFY',
  'DEFENSE IN DEPTH',
  'PATCH YOUR SYSTEMS TODAY',
  'NEVER REUSE A PASSWORD',
  'BACK UP BEFORE YOU BREAK',
  'ENCRYPT DATA AT REST',
  'LEAST PRIVILEGE WINS',
  'VERIFY THE SENDER FIRST',
];

function caesarEncode(text, shift) {
  return text.split('').map((ch) => {
    if (ch >= 'A' && ch <= 'Z') {
      return String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65);
    }
    return ch;
  }).join('');
}
function caesarDecode(text, shift) {
  return caesarEncode(text, (26 - shift) % 26);
}

let order, round, score, currentShift, currentPlain, TOTAL;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  order = shuffle([...PHRASES]);
  TOTAL = order.length;
  round = 0; score = 0;
  totalEl.textContent = TOTAL;
  scoreEl.textContent = score;
  nextRound();
}

function nextRound() {
  if (round >= TOTAL) {
    finish();
    return;
  }
  submitBtn.style.display = '';
  currentPlain = order[round];
  currentShift = 1 + Math.floor(Math.random() * 25);
  encodedEl.textContent = caesarEncode(currentPlain, currentShift);
  shiftInput.value = 0;
  shiftVal.textContent = '0';
  previewEl.textContent = caesarDecode(encodedEl.textContent, 0);
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
  roundEl.textContent = round + 1;
}

function finish() {
  encodedEl.textContent = `Deck cleared! Final score: ${score} / ${TOTAL}`;
  previewEl.textContent = '';
  submitBtn.style.display = 'none';
  feedbackEl.textContent = '';

  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'cipher', score, higherIsBetter: true, total: TOTAL,
  });

  showOverlay('cipher', {
    won: true,
    title: 'Deck cleared!',
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: () => {},
  });
}

shiftInput.addEventListener('input', () => {
  const s = parseInt(shiftInput.value, 10);
  shiftVal.textContent = s;
  previewEl.textContent = caesarDecode(encodedEl.textContent, s);
});

submitBtn.addEventListener('click', () => {
  const s = parseInt(shiftInput.value, 10);
  const guess = caesarDecode(encodedEl.textContent, s);
  if (guess === currentPlain) {
    score++;
    scoreEl.textContent = score;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `Decrypted with shift ${s}. Message: "${currentPlain}"`;
  } else {
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = 'Not readable yet — keep adjusting the shift.';
    return;
  }
  round++;
  setTimeout(nextRound, 1400);
});

restartBtn.addEventListener('click', init);
registerGame('cipher', { onEnter: init });
