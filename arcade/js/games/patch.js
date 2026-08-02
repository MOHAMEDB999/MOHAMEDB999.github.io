/**
 * patch.js — Patch Priority (risk triage). Given a short list of
 * vulnerabilities with CVSS-style severity scores, rank them from
 * highest to lowest priority to patch under a limited maintenance window.
 */
import { registerGame, showHub } from '../core/router.js';
import { showOverlay, escapeHtml } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';
import { enableDragReorder, moveItem } from '../core/reorder.js';

const listEl = document.getElementById('patch-list');
const submitBtn = document.getElementById('patch-submit');
const feedbackEl = document.getElementById('patch-feedback');
const scoreEl = document.getElementById('patch-score');
const countEl = document.getElementById('patch-count');
const totalEl = document.getElementById('patch-total');
const restartBtn = document.getElementById('patch-restart');

function sevLabel(score) {
  if (score >= 9) return { label: 'CRITICAL', cls: 'sev-critical' };
  if (score >= 7) return { label: 'HIGH', cls: 'sev-high' };
  if (score >= 4) return { label: 'MEDIUM', cls: 'sev-medium' };
  return { label: 'LOW', cls: 'sev-low' };
}

const DECK = [
  [
    { name: 'Remote code execution in public API endpoint', cvss: 9.8, desc: 'Unauthenticated attacker can run arbitrary code on the server.' },
    { name: 'SQL injection in login form', cvss: 8.6, desc: 'Attacker can read or modify database contents via the login field.' },
    { name: 'Reflected XSS in search results page', cvss: 6.1, desc: "Malicious script runs in a victim's browser via a crafted search link." },
    { name: 'Missing HttpOnly flag on session cookie', cvss: 3.1, desc: 'Session cookie is readable by client-side scripts if XSS occurs elsewhere.' },
  ],
  [
    { name: 'Authentication bypass via crafted JWT', cvss: 9.1, desc: 'A malformed token lets an attacker skip login entirely.' },
    { name: 'Privilege escalation in admin panel', cvss: 7.7, desc: 'A regular user can gain admin rights through a logic flaw.' },
    { name: 'Verbose error messages leak stack traces', cvss: 5.0, desc: 'Error pages reveal internal file paths and framework versions.' },
    { name: 'Self-signed certificate warning on internal tool', cvss: 2.6, desc: 'Browser warning on an internal-only diagnostics dashboard.' },
  ],
  [
    { name: 'Unauthenticated file upload allows webshell', cvss: 9.4, desc: 'Any visitor can upload and execute a malicious script.' },
    { name: 'CSRF on funds-transfer endpoint', cvss: 8.1, desc: "A forged request can move money without the user's consent." },
    { name: 'Directory listing enabled on static assets', cvss: 5.4, desc: 'File and folder names are browsable, aiding reconnaissance.' },
    { name: 'Outdated jQuery version with a known low-risk issue', cvss: 3.4, desc: "A dependency is behind, but the known issue needs unusual conditions." },
  ],
  [
    { name: 'Hardcoded admin credentials in shipped firmware', cvss: 9.9, desc: 'Every device ships with the same undocumented admin login.' },
    { name: "Broken access control exposes other users' invoices", cvss: 8.2, desc: "Changing an ID in the URL reveals another customer's billing data." },
    { name: 'Rate limiting missing on password-reset endpoint', cvss: 6.5, desc: 'An attacker can hammer the reset flow to enumerate accounts.' },
    { name: 'Verbose HTTP server banner reveals software version', cvss: 2.2, desc: 'Response headers disclose the exact web server version in use.' },
  ],
  [
    { name: 'Deserialization flaw allows remote code execution', cvss: 9.6, desc: 'Untrusted data is deserialized directly into executable objects.' },
    { name: 'Broken authentication allows session fixation', cvss: 8.0, desc: 'An attacker can force a known session ID onto a victim.' },
    { name: 'Open redirect used in phishing campaigns', cvss: 6.3, desc: 'A trusted domain redirects to attacker-controlled pages.' },
    { name: 'Missing security headers (X-Frame-Options)', cvss: 3.8, desc: 'Page can be embedded in a clickjacking iframe.' },
  ],
];

let deck, idx, score, order, over, mistakes;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  deck = shuffle(DECK.map((round) => [...round]));
  idx = 0; score = 0; over = false; mistakes = 0;
  totalEl.textContent = deck.length;
  scoreEl.textContent = 0;
  render();
}

/** correctOrder is the round's items sorted by cvss descending, as their fixed index. */
function correctOrder(round) {
  return round.map((_, i) => i).sort((a, b) => round[b].cvss - round[a].cvss);
}

function render() {
  if (over) return;
  countEl.textContent = Math.min(idx + 1, deck.length);
  order = shuffle([0, 1, 2, 3]);
  renderList();
  submitBtn.disabled = false;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
}

function renderList() {
  const round = deck[idx];
  listEl.innerHTML = order.map((itemIdx, pos) => {
    const item = round[itemIdx];
    const sev = sevLabel(item.cvss);
    return `
    <li class="patch-card" data-item="${itemIdx}" tabindex="0" aria-label="Position ${pos + 1}: ${escapeHtml(item.name)}, CVSS ${item.cvss}">
      <div class="patch-head">
        <span class="patch-name">${pos + 1}. ${escapeHtml(item.name)}</span>
        <span class="cvss ${sev.cls}">${sev.label} ${item.cvss}</span>
      </div>
      <div class="patch-desc">${escapeHtml(item.desc)}</div>
      <div class="patch-move-btns" style="margin-top:8px;">
        <button type="button" data-move="up" aria-label="Move up" ${pos === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-move="down" aria-label="Move down" ${pos === order.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    </li>`;
  }).join('');

  listEl.querySelectorAll('.patch-card').forEach((li, pos) => {
    li.querySelector('[data-move="up"]')?.addEventListener('click', () => { order = moveItem(order, pos, pos - 1); sfx.click(); renderList(); });
    li.querySelector('[data-move="down"]')?.addEventListener('click', () => { order = moveItem(order, pos, pos + 1); sfx.click(); renderList(); });
  });

  enableDragReorder(listEl, (from, to) => { order = moveItem(order, from, to); sfx.click(); renderList(); });
}

function submit() {
  if (over) return;
  submitBtn.disabled = true;
  const round = deck[idx];
  const correct = correctOrder(round);
  const isCorrect = order.every((itemIdx, pos) => itemIdx === correct[pos]);

  const rows = listEl.querySelectorAll('.patch-card');
  rows.forEach((row, pos) => {
    row.classList.add(order[pos] === correct[pos] ? 'correct-slot' : 'wrong-slot');
  });

  if (isCorrect) {
    score++;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = "Correct — that's the right patch priority order.";
  } else {
    mistakes++;
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    const orderedNames = correct.map((i) => round[i].name).join(' → ');
    feedbackEl.textContent = `Not quite — highest to lowest priority: ${orderedNames}.`;
  }
  scoreEl.textContent = score;

  setTimeout(() => {
    idx++;
    if (idx >= deck.length) { endGame(); return; }
    render();
  }, 2600);
}

function endGame() {
  over = true;
  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'patch', score, higherIsBetter: true,
    cleared: score, total: deck.length, mistakes,
  });
  showOverlay('patch', {
    won: true,
    title: 'Maintenance window closed',
    message: `Correctly triaged ${score} / ${deck.length} rounds.`,
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

submitBtn.addEventListener('click', submit);
restartBtn.addEventListener('click', init);
registerGame('patch', { onEnter: init });
