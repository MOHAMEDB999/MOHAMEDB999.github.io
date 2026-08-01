/**
 * firewall.js — Firewall Duty (network security). Timed allow/block drill
 * against a fixed ruleset.
 */
import { registerGame } from '../core/router.js';
import { showOverlay } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const cardEl = document.getElementById('firewall-card');
const rulesEl = document.getElementById('firewall-rules');
const feedbackEl = document.getElementById('firewall-feedback');
const scoreEl = document.getElementById('firewall-score');
const livesEl = document.getElementById('firewall-lives');
const countEl = document.getElementById('firewall-count');
const totalEl = document.getElementById('firewall-total');
const allowBtn = document.getElementById('firewall-allow');
const blockBtn = document.getElementById('firewall-block');
const restartBtn = document.getElementById('firewall-restart');
const timerFill = document.getElementById('firewall-timer');

const RULES = [
  'ALLOW — HTTPS (port 443)',
  'ALLOW — DNS (port 53)',
  'BLOCK — Telnet (port 23)',
  'BLOCK — any host on blacklist 203.0.113.0/24',
  'BLOCK — SMB (port 445) from outside the LAN',
];

const DECK = [
  { src: '198.51.100.7', port: 443, proto: 'HTTPS', note: 'Employee laptop reaching a cloud SaaS login page.', allow: true },
  { src: '192.168.1.44', port: 53, proto: 'DNS', note: 'Internal workstation resolving a domain name.', allow: true },
  { src: '203.0.113.9', port: 443, proto: 'HTTPS', note: 'Traffic from a blacklisted subnet, even on a normally-safe port.', allow: false },
  { src: '10.0.0.15', port: 23, proto: 'Telnet', note: 'Unencrypted remote login attempt.', allow: false },
  { src: '172.16.4.2', port: 445, proto: 'SMB', note: 'File-share request arriving from outside the LAN.', allow: false },
  { src: '192.168.1.12', port: 443, proto: 'HTTPS', note: 'Internal host browsing an external HTTPS site.', allow: true },
  { src: '203.0.113.101', port: 53, proto: 'DNS', note: 'DNS query, but source is on the blacklisted subnet.', allow: false },
  { src: '198.51.100.20', port: 23, proto: 'Telnet', note: 'Legacy device attempting a Telnet session.', allow: false },
  { src: '192.168.1.5', port: 53, proto: 'DNS', note: 'Standard internal DNS lookup.', allow: true },
  { src: '8.8.8.8', port: 443, proto: 'HTTPS', note: 'Response traffic from a public DNS-over-HTTPS resolver.', allow: true },
  { src: '172.16.4.90', port: 445, proto: 'SMB', note: 'Internal file-share access between two LAN hosts.', allow: true },
  { src: '203.0.113.55', port: 22, proto: 'SSH', note: 'SSH attempt from the blacklisted subnet.', allow: false },
  { src: '192.168.1.31', port: 445, proto: 'SMB', note: 'Internal backup job connecting to a LAN file server.', allow: true },
  { src: '45.33.10.2', port: 23, proto: 'Telnet', note: 'External host probing for an open Telnet port.', allow: false },
];

let deck, idx, score, lives, over, timerId, TIME_LIMIT, mistakes;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  rulesEl.innerHTML = RULES.map((r) => `<div class="rule">▸ <b>${r}</b></div>`).join('');
  deck = shuffle([...DECK]);
  idx = 0; score = 0; lives = 3; over = false; mistakes = 0;
  TIME_LIMIT = 6000;
  totalEl.textContent = deck.length;
  updateHud();
  render();
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  countEl.textContent = Math.min(idx + 1, deck.length);
}

function render() {
  if (over) return;
  clearInterval(timerId);
  const p = deck[idx];
  cardEl.innerHTML = `
    <div class="field"><b>Source</b> <span>${p.src}</span></div>
    <div class="field"><b>Port / Protocol</b> <span>${p.port} — ${p.proto}</span></div>
    <div class="body-text">${p.note}</div>
  `;
  allowBtn.disabled = false;
  blockBtn.disabled = false;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';

  timerFill.style.width = '100%';
  const start = Date.now();
  timerId = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.max(0, 100 - (elapsed / TIME_LIMIT) * 100);
    timerFill.style.width = pct + '%';
    if (elapsed >= TIME_LIMIT) {
      clearInterval(timerId);
      answer(null);
    }
  }, 50);
}

function answer(saysAllow) {
  if (over) return;
  clearInterval(timerId);
  const p = deck[idx];
  allowBtn.disabled = true;
  blockBtn.disabled = true;
  const correct = saysAllow === p.allow;
  if (correct) {
    score++;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `Correct — ${p.allow ? 'ALLOW' : 'BLOCK'} matches the ruleset.`;
  } else {
    lives--;
    mistakes++;
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    const reason = saysAllow === null ? 'Too slow — ' : 'Not quite — ';
    feedbackEl.textContent = `${reason}correct call was ${p.allow ? 'ALLOW' : 'BLOCK'}.`;
  }
  updateHud();

  setTimeout(() => {
    if (lives <= 0) { endGame(false); return; }
    idx++;
    if (idx >= deck.length) { endGame(true); return; }
    render();
  }, 1400);
}

function endGame(cleared) {
  over = true;
  clearInterval(timerId);
  timerFill.style.width = '0%';
  allowBtn.disabled = true;
  blockBtn.disabled = true;

  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'firewall', score, higherIsBetter: true,
    cleared: score, total: deck.length, mistakes,
  });

  showOverlay('firewall', {
    won: cleared,
    title: cleared ? 'Shift complete!' : 'Breach — out of lives',
    message: `Final score: ${score} / ${deck.length}.`,
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: () => {},
  });
}

allowBtn.addEventListener('click', () => answer(true));
blockBtn.addEventListener('click', () => answer(false));
restartBtn.addEventListener('click', init);
registerGame('firewall', { onEnter: init, onExit: () => clearInterval(timerId) });
