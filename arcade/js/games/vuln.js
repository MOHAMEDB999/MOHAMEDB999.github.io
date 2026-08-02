/**
 * vuln.js — Vuln Spotter (application security). Read a short snippet,
 * click the line that introduces the flaw. Recognition only — no working
 * exploit code is ever generated.
 */
import { registerGame, showHub } from '../core/router.js';
import { showOverlay, escapeHtml } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const codeEl = document.getElementById('vuln-code');
const explainEl = document.getElementById('vuln-explain');
const nextBtn = document.getElementById('vuln-next');
const scoreEl = document.getElementById('vuln-score');
const countEl = document.getElementById('vuln-count');
const totalEl = document.getElementById('vuln-total');
const restartBtn = document.getElementById('vuln-restart');

const DECK = [
  { lines: [
      'function login(user, pass) {',
      '  const query = "SELECT * FROM users WHERE " +',
      "    \"name='\" + user + \"' AND pass='\" + pass + \"'\";",
      '  return db.run(query);',
      '}',
    ], vulnLine: 2,
    why: "User input is concatenated straight into the SQL string. A parameterized query or prepared statement should be used instead so input can never change the query's structure." },
  { lines: [
      'app.get("/profile", (req, res) => {',
      '  const name = req.query.name;',
      '  res.send("<h1>Welcome " + name + "</h1>");',
      '});',
    ], vulnLine: 2,
    why: 'The request value is written into the HTML response unescaped — a classic reflected XSS. Output should be escaped or rendered through a templating engine that auto-escapes.' },
  { lines: [
      'const db = new Client({',
      '  host: "prod-db.internal",',
      '  user: "app",',
      '  password: "Summer2023!"',
      '});',
    ], vulnLine: 3,
    why: 'A production credential is hardcoded in source. Secrets belong in environment variables or a secrets manager, never committed to the codebase.' },
  { lines: [
      'function hashPassword(pw) {',
      '  return crypto.createHash("md5").update(pw).digest("hex");',
      '}',
    ], vulnLine: 1,
    why: 'MD5 is fast and unsalted, which makes password hashes easy to brute-force. Use a slow, salted algorithm designed for passwords, like bcrypt or Argon2.' },
  { lines: [
      'function resetToken() {',
      '  return Math.random().toString(36).slice(2);',
      '}',
    ], vulnLine: 1,
    why: "Math.random() is not cryptographically secure and its output can be predicted. Security tokens need a CSPRNG, such as the platform's crypto.randomBytes." },
  { lines: [
      'app.get("/redirect", (req, res) => {',
      '  const url = req.query.url;',
      '  res.redirect(url);',
      '});',
    ], vulnLine: 2,
    why: 'Redirecting straight to a user-supplied URL enables open-redirect attacks used in phishing. Destinations should be checked against an allow-list.' },
  { lines: [
      'function comparePins(a, b) {',
      '  return a === b;',
      '}',
    ], vulnLine: 1,
    why: 'A plain equality check on secret values can leak timing information. Sensitive comparisons should use a constant-time comparison function.' },
  { lines: [
      'app.post("/upload", (req, res) => {',
      '  const path = "/uploads/" + req.body.filename;',
      '  fs.writeFileSync(path, req.body.data);',
      '});',
    ], vulnLine: 1,
    why: 'The filename comes straight from the request, so a value like "../../etc/passwd" could write outside the uploads folder. Filenames need sanitizing before use in a path.' },
  { lines: [
      'const cfg = {',
      '  cookie: { httpOnly: false, secure: false }',
      '};',
    ], vulnLine: 1,
    why: 'Without httpOnly and secure flags, session cookies are readable by client-side scripts and can be sent over plain HTTP, widening the attack surface for theft.' },
  { lines: [
      'function runCommand(input) {',
      '  return eval(input);',
      '}',
    ], vulnLine: 1,
    why: 'Passing untrusted input into eval() lets an attacker run arbitrary code. Avoid eval entirely and use a safe, purpose-built parser instead.' },
];

let deck, idx, score, answered;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  deck = shuffle([...DECK]);
  idx = 0; score = 0;
  totalEl.textContent = deck.length;
  scoreEl.textContent = score;
  render();
}

function render() {
  answered = false;
  explainEl.style.display = 'none';
  nextBtn.style.display = 'none';
  countEl.textContent = Math.min(idx + 1, deck.length);

  if (idx >= deck.length) {
    finish();
    return;
  }

  const snip = deck[idx];
  codeEl.innerHTML = snip.lines.map((line, i) => `
    <div class="code-line" data-line="${i}" role="listitem" tabindex="0" aria-label="Line ${i + 1}: ${escapeHtml(line.trim())}">
      <span class="ln">${i + 1}</span><span class="code-text">${escapeHtml(line)}</span>
    </div>
  `).join('');

  codeEl.querySelectorAll('.code-line').forEach((el) => {
    el.addEventListener('click', () => selectLine(parseInt(el.dataset.line, 10)));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectLine(parseInt(el.dataset.line, 10));
      }
    });
  });
}

function selectLine(lineIdx) {
  if (answered) return;
  answered = true;
  const snip = deck[idx];
  const rows = codeEl.querySelectorAll('.code-line');
  rows.forEach((r) => r.classList.remove('selected'));

  if (lineIdx === snip.vulnLine) {
    score++;
    scoreEl.textContent = score;
    sfx.score();
    rows[lineIdx].classList.add('correct-line');
  } else {
    sfx.wrong();
    rows[lineIdx].classList.add('wrong-line');
    rows[snip.vulnLine].classList.add('correct-line');
  }

  explainEl.style.display = '';
  explainEl.innerHTML = `<b>${lineIdx === snip.vulnLine ? 'Correct.' : 'The real issue:'}</b> ${escapeHtml(snip.why)}`;
  nextBtn.style.display = '';
}

function finish() {
  codeEl.innerHTML = `<div class="code-line"><span class="code-text">Deck cleared! Final score: ${score} / ${deck.length}</span></div>`;

  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'vuln', score, higherIsBetter: true, total: deck.length,
  });

  showOverlay('vuln', {
    won: true,
    title: 'Deck cleared!',
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

nextBtn.addEventListener('click', () => { idx++; render(); });
restartBtn.addEventListener('click', init);
registerGame('vuln', { onEnter: init });
