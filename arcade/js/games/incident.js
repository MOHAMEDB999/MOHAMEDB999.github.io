/**
 * incident.js — Incident Responder (incident response). Given a short breach
 * scenario, put the four response phases — contain, eradicate, recover,
 * review — in the correct order. Decision-making/sequencing only; no real
 * tooling or exploit content.
 */
import { registerGame, showHub } from '../core/router.js';
import { showOverlay, escapeHtml } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';
import { enableDragReorder, moveItem } from '../core/reorder.js';

const scenarioEl = document.getElementById('incident-scenario');
const listEl = document.getElementById('incident-list');
const submitBtn = document.getElementById('incident-submit');
const feedbackEl = document.getElementById('incident-feedback');
const scoreEl = document.getElementById('incident-score');
const countEl = document.getElementById('incident-count');
const totalEl = document.getElementById('incident-total');
const restartBtn = document.getElementById('incident-restart');

const PHASE_LABELS = ['Contain', 'Eradicate', 'Recover', 'Review'];

const DECK = [
  { title: 'Ransomware has encrypted files on a shared file server.', steps: [
      'Isolate the infected file server from the network to stop the ransomware spreading.',
      'Identify and remove the ransomware payload and any backdoors left on the server.',
      'Restore affected files from the most recent clean backup and validate their integrity.',
      'Document the timeline and update detection rules to catch this ransomware strain earlier.',
  ]},
  { title: 'A phishing email led to a compromised employee account.', steps: [
      'Disable the compromised account and force a password reset.',
      'Revoke any active sessions and API tokens issued under that account.',
      'Re-enable the account with MFA enforced and monitor it for further suspicious activity.',
      'Send a company-wide reminder on phishing red flags and tighten email filtering rules.',
  ]},
  { title: 'An unpatched web server was exploited to plant a webshell.', steps: [
      'Take the affected web server offline or place it behind a restrictive firewall rule.',
      'Remove the webshell and any other malicious files the attacker planted.',
      'Patch the vulnerability, rebuild the server from a known-good image, and bring it back online.',
      'Run a post-incident review to see why the patch was missed and adjust the patch cadence.',
  ]},
  { title: "An employee accidentally uploads a database backup to a public cloud bucket.", steps: [
      'Immediately make the storage bucket private to stop further public access.',
      'Determine exactly what was exposed and rotate any credentials or keys contained in the backup.',
      'Notify affected parties as required and restore proper access controls on the bucket.',
      'Add automated scanning to catch publicly-exposed storage before it happens again.',
  ]},
  { title: "A DDoS attack is overwhelming the company's public website.", steps: [
      'Enable DDoS mitigation and rate limiting at the network edge to absorb the traffic.',
      'Identify and block the malicious traffic sources feeding the attack.',
      'Confirm the site is stable under normal load and scale resources back down.',
      'Document the attack pattern and update the incident-response runbook for next time.',
  ]},
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
  deck = shuffle([...DECK]);
  idx = 0; score = 0; over = false; mistakes = 0;
  totalEl.textContent = deck.length;
  scoreEl.textContent = 0;
  render();
}

function render() {
  if (over) return;
  countEl.textContent = Math.min(idx + 1, deck.length);
  const scenario = deck[idx];
  scenarioEl.textContent = scenario.title;

  // correctIndex[i] is the phase order 0-3 for scenario.steps[i]; shuffle a
  // working order of indexes 0..3 to present the steps scrambled.
  order = shuffle([0, 1, 2, 3]);
  renderList();
  submitBtn.disabled = false;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
}

function renderList() {
  const scenario = deck[idx];
  listEl.innerHTML = order.map((stepIdx, pos) => `
    <li class="incident-step" data-step="${stepIdx}" tabindex="0" aria-label="Position ${pos + 1}: ${escapeHtml(scenario.steps[stepIdx])}">
      <span class="step-num">${pos + 1}</span>
      <span>${escapeHtml(scenario.steps[stepIdx])}</span>
      <span class="incident-move-btns">
        <button type="button" data-move="up" aria-label="Move up" ${pos === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-move="down" aria-label="Move down" ${pos === order.length - 1 ? 'disabled' : ''}>↓</button>
      </span>
    </li>
  `).join('');

  listEl.querySelectorAll('.incident-step').forEach((li, pos) => {
    li.querySelector('[data-move="up"]')?.addEventListener('click', () => { order = moveItem(order, pos, pos - 1); sfx.click(); renderList(); });
    li.querySelector('[data-move="down"]')?.addEventListener('click', () => { order = moveItem(order, pos, pos + 1); sfx.click(); renderList(); });
  });

  enableDragReorder(listEl, (from, to) => { order = moveItem(order, from, to); sfx.click(); renderList(); });
}

function submit() {
  if (over) return;
  submitBtn.disabled = true;
  const correct = order.every((stepIdx, pos) => stepIdx === pos);

  const rows = listEl.querySelectorAll('.incident-step');
  rows.forEach((row, pos) => {
    row.classList.add(order[pos] === pos ? 'correct-slot' : 'wrong-slot');
  });

  if (correct) {
    score++;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `Correct sequence: ${PHASE_LABELS.join(' → ')}.`;
  } else {
    mistakes++;
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = `Not quite — the intended order was ${PHASE_LABELS.join(' → ')}.`;
  }
  scoreEl.textContent = score;

  setTimeout(() => {
    idx++;
    if (idx >= deck.length) { endGame(); return; }
    render();
  }, 2200);
}

function endGame() {
  over = true;
  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'incident', score, higherIsBetter: true,
    cleared: score, total: deck.length, mistakes,
  });
  showOverlay('incident', {
    won: true,
    title: 'Shift complete',
    message: `Correctly sequenced ${score} / ${deck.length} incidents.`,
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

submitBtn.addEventListener('click', submit);
restartBtn.addEventListener('click', init);
registerGame('incident', { onEnter: init });
