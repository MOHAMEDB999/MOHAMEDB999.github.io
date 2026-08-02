/**
 * phish.js — Phish or Legit (social engineering). A deck-based recognition
 * drill: read a message, decide report vs trust. Purely defensive — no
 * working phishing content is ever generated or provided.
 */
import { registerGame, showHub } from '../core/router.js';
import { announce, showOverlay, escapeHtml } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const cardEl = document.getElementById('phish-card');
const feedbackEl = document.getElementById('phish-feedback');
const scoreEl = document.getElementById('phish-score');
const livesEl = document.getElementById('phish-lives');
const countEl = document.getElementById('phish-count');
const totalEl = document.getElementById('phish-total');
const legitBtn = document.getElementById('phish-legit');
const reportBtn = document.getElementById('phish-report');
const restartBtn = document.getElementById('phish-restart');

const DECK = [
  { from: 'billing@paypa1-secure.com', subject: 'Your account will be suspended in 24 hours',
    body: 'We detected unusual activity. Click the link below and confirm your password immediately to avoid suspension.',
    phishing: true, why: "The domain swaps an 'l' for the digit '1', and it manufactures urgency to rush you past checking the link." },
  { from: 'no-reply@github.com', subject: '[GitHub] New sign-in to your account',
    body: 'We noticed a new sign-in from Chrome on macOS in Algiers, DZ. If this was you, no action is needed. If not, secure your account.',
    phishing: false, why: 'Genuine domain, no link pressure, and it gives you a safe no-action path if the login was you.' },
  { from: 'hr@yourcompany-payroll-update.net', subject: 'Action required: update your direct deposit info',
    body: 'Payroll system migration. Please log in within 2 hours using the link below or your next paycheck may be delayed.',
    phishing: true, why: 'A lookalike external domain pretending to be internal HR, plus a tight deadline to pressure quick clicks.' },
  { from: 'notifications@slack.com', subject: 'You have 3 unread messages in #general',
    body: 'Open Slack to catch up on the conversation. This is an automated summary — you can turn these off in your notification settings.',
    phishing: false, why: "Matches Slack's real domain and a routine, low-pressure notification with no login request." },
  { from: 'security@apple-id-verify.com', subject: 'Your Apple ID has been locked',
    body: 'Unauthorized access was blocked. Verify your identity now by entering your Apple ID and password on the page below.',
    phishing: true, why: "Apple doesn't own that domain, and asking you to re-enter your password on a linked page is a classic credential-harvest pattern." },
  { from: 'calendar-notification@google.com', subject: 'Reminder: Team standup in 15 minutes',
    body: 'Your event "Team standup" starts at 10:00 AM. Join the call from your calendar.',
    phishing: false, why: "A routine calendar reminder from Google's real domain, no credentials or links to external sites requested." },
  { from: 'ceo.office@company-exec-mail.com', subject: 'Quick favor, are you at your desk?',
    body: "I'm in back-to-back meetings and need you to purchase gift cards for a client. Reply here and I'll send details.",
    phishing: true, why: 'Impersonating an executive from a lookalike domain, plus a gift-card request — a well-known business-email-compromise pattern.' },
  { from: 'support@dropbox.com', subject: 'Someone shared "Q3 budget.xlsx" with you',
    body: 'Click view file to open it in Dropbox. You can also see it anytime by signing in at dropbox.com directly.',
    phishing: false, why: 'Consistent real domain, and it explicitly reminds you that you can verify by typing the address yourself.' },
  { from: 'admin@banklogin-secure-verify.info', subject: 'Unusual withdrawal blocked on your account',
    body: 'We stopped a $2,450 withdrawal. Confirm this was not you by verifying your card number and PIN below.',
    phishing: true, why: 'A generic, unofficial domain and a request for a PIN — no legitimate bank ever asks for your PIN by email.' },
  { from: 'newsletter@nytimes.com', subject: 'Your weekly digest is here',
    body: "This week's top stories, hand-picked for you. Manage your subscription preferences anytime.",
    phishing: false, why: 'A standard newsletter from a real domain with no account or payment info requested.' },
];

let deck, idx, score, lives, over, mistakes;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  deck = shuffle([...DECK]);
  idx = 0; score = 0; lives = 3; over = false; mistakes = 0;
  totalEl.textContent = deck.length;
  updateHud();
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
  render();
}

function updateHud() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  countEl.textContent = Math.min(idx + 1, deck.length);
}

function render() {
  if (over) return;
  const msg = deck[idx];
  cardEl.innerHTML = `
    <div class="field"><b>From</b><br><span>${escapeHtml(msg.from)}</span></div>
    <div class="field"><b>Subject</b><br><span>${escapeHtml(msg.subject)}</span></div>
    <div class="body-text">${escapeHtml(msg.body)}</div>
  `;
  legitBtn.disabled = false;
  reportBtn.disabled = false;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
}

function answer(saysPhishing) {
  if (over) return;
  const msg = deck[idx];
  legitBtn.disabled = true;
  reportBtn.disabled = true;
  const correct = saysPhishing === msg.phishing;
  if (correct) {
    score++;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `Correct — ${msg.why}`;
  } else {
    lives--;
    mistakes++;
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = `Not quite — ${msg.why}`;
  }
  updateHud();

  setTimeout(() => {
    if (lives <= 0) { endGame(false); return; }
    idx++;
    if (idx >= deck.length) { endGame(true); return; }
    render();
  }, 1800);
}

function endGame(cleared) {
  over = true;
  legitBtn.disabled = true;
  reportBtn.disabled = true;
  feedbackEl.textContent = '';

  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'phish', score, higherIsBetter: true,
    cleared: score, total: deck.length, mistakes,
  });

  showOverlay('phish', {
    won: cleared,
    title: cleared ? 'Inbox cleared!' : 'Out of lives',
    message: `Final score: ${score} / ${deck.length}.`,
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

legitBtn.addEventListener('click', () => answer(false));
reportBtn.addEventListener('click', () => answer(true));
restartBtn.addEventListener('click', init);
registerGame('phish', { onEnter: init });
