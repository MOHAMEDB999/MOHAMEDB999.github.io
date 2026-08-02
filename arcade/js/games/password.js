/**
 * password.js — Password Fortress (authentication). Live strength meter +
 * illustrative crack-time estimate across three rising targets.
 */
import { registerGame, showHub } from '../core/router.js';
import { showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const input = document.getElementById('pw-input');
const meterFill = document.getElementById('pw-meter');
const ratingEl = document.getElementById('pw-rating');
const crackEl = document.getElementById('pw-crack');
const checklistEl = document.getElementById('pw-checklist');
const submitBtn = document.getElementById('pw-submit');
const feedbackEl = document.getElementById('pw-feedback');
const roundEl = document.getElementById('pw-round');
const targetLabelEl = document.getElementById('pw-target-label');
const clearedEl = document.getElementById('pw-cleared');
const restartBtn = document.getElementById('password-restart');

const COMMON = ['password', '123456', 'qwerty', 'letmein', 'iloveyou', 'admin', 'welcome', 'monkey', 'football', 'dragon', 'abc123', '111111'];
const RATINGS = ['VERY WEAK', 'WEAK', 'FAIR', 'GOOD', 'STRONG', 'EXCELLENT'];
const RATING_COLORS = ['#ff2eae', '#ff5b4d', '#ff8a3d', '#ffd23f', '#6dff6d', '#39ff6a'];
const TARGETS = [2, 3, 4]; // rating index thresholds for the 3 rounds

let round, cleared, usedPasswords;

function init() {
  round = 0; cleared = 0; usedPasswords = [];
  clearedEl.textContent = 0;
  input.disabled = false;
  submitBtn.style.display = '';
  startRound();
}

function startRound() {
  if (round >= TARGETS.length) {
    finish();
    return;
  }
  submitBtn.style.display = '';
  input.disabled = false;
  roundEl.textContent = round + 1;
  targetLabelEl.textContent = RATINGS[TARGETS[round]];
  input.value = '';
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
  evaluate('');
  input.focus();
}

function score(pw) {
  if (!pw) return { idx: 0, entropy: 0 };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  pool = Math.max(pool, 1);

  let entropy = pw.length * Math.log2(pool);

  const lower = pw.toLowerCase();
  const isCommon = COMMON.some((c) => lower.includes(c));
  const isSequential = /0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer/.test(lower);
  const isRepeated = /(.)\1{2,}/.test(pw);

  if (isCommon) entropy *= 0.25;
  if (isSequential) entropy *= 0.6;
  if (isRepeated) entropy *= 0.6;

  let idx;
  if (entropy < 20) idx = 0;
  else if (entropy < 32) idx = 1;
  else if (entropy < 45) idx = 2;
  else if (entropy < 60) idx = 3;
  else if (entropy < 75) idx = 4;
  else idx = 5;

  return { idx, entropy, isCommon, isSequential, isRepeated, pool };
}

function crackTimeLabel(entropy) {
  // illustrative estimate assuming 10 billion guesses/sec (generic offline-attack ballpark)
  const guesses = Math.pow(2, entropy);
  const seconds = guesses / 1e10;
  if (seconds < 1) return 'instantly';
  const units = [
    ['centuries', 100 * 365 * 24 * 3600],
    ['years', 365 * 24 * 3600],
    ['days', 24 * 3600],
    ['hours', 3600],
    ['minutes', 60],
    ['seconds', 1],
  ];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const v = seconds / size;
      return `${v >= 1000 ? v.toExponential(1) : v.toFixed(1)} ${name}`;
    }
  }
  return 'instantly';
}

function evaluate(pw) {
  const r = score(pw);
  const pct = Math.min(100, (r.idx / 5) * 100);
  meterFill.style.width = pw ? Math.max(6, pct) + '%' : '0%';
  meterFill.style.background = RATING_COLORS[r.idx];
  ratingEl.textContent = pw ? RATINGS[r.idx] : '—';
  ratingEl.style.color = pw ? RATING_COLORS[r.idx] : 'var(--text)';
  crackEl.textContent = pw ? crackTimeLabel(r.entropy) : '—';

  const checks = [
    { label: '12+ characters', ok: pw.length >= 12 },
    { label: 'upper + lower case', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { label: 'a number', ok: /[0-9]/.test(pw) },
    { label: 'a symbol', ok: /[^a-zA-Z0-9]/.test(pw) },
    { label: 'not a common password', ok: pw.length > 0 && !r.isCommon },
    { label: 'no obvious sequence/repeat', ok: pw.length > 0 && !r.isSequential && !r.isRepeated },
  ];
  checklistEl.innerHTML = checks.map((c) => `<span class="${c.ok ? 'ok' : ''}">${c.ok ? '✓' : '○'} ${c.label}</span>`).join('');

  return r;
}

function finish() {
  submitBtn.style.display = 'none';
  input.disabled = true;

  const { newBadges } = finishGame({
    gameId: 'password',
    won: true,
    score: cleared,
    higherIsBetter: true,
  });

  showOverlay('password', {
    won: true,
    title: 'All targets cleared!',
    message: `You built ${cleared} qualifying passwords.`,
    newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

input.addEventListener('input', () => evaluate(input.value));

submitBtn.addEventListener('click', () => {
  const pw = input.value;
  if (!pw) {
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = 'Type a password first.';
    return;
  }
  if (usedPasswords.includes(pw)) {
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = 'Already used that one this run — try a fresh password.';
    return;
  }
  const r = score(pw);
  if (r.idx >= TARGETS[round]) {
    usedPasswords.push(pw);
    cleared++;
    clearedEl.textContent = cleared;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `Target cleared at ${RATINGS[r.idx]}. Estimated crack time: ${crackTimeLabel(r.entropy)}.`;
    round++;
    setTimeout(startRound, 1500);
  } else {
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = `Currently rated ${RATINGS[r.idx]} — needs to reach ${RATINGS[TARGETS[round]]}.`;
  }
});

restartBtn.addEventListener('click', init);
registerGame('password', { onEnter: init });
