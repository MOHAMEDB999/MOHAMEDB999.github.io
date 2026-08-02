/**
 * osint.js — OSINT Trail (privacy awareness). A fictional public profile's
 * posts are shown; the player clicks every post that leaks something an
 * attacker could use (travel dates, security-question answers, spare-key
 * locations, etc.) and submits their selection for the whole profile at
 * once. Purely defensive pattern-recognition — no real accounts, no
 * scraping, no actual OSINT tooling involved.
 */
import { registerGame, showHub } from '../core/router.js';
import { showOverlay, escapeHtml } from '../core/ui.js';
import { sfx } from '../core/audio.js';
import { finishGame } from '../core/state.js';

const profileEl = document.getElementById('osint-profile');
const submitBtn = document.getElementById('osint-submit');
const feedbackEl = document.getElementById('osint-feedback');
const scoreEl = document.getElementById('osint-score');
const mistakesEl = document.getElementById('osint-mistakes');
const countEl = document.getElementById('osint-count');
const totalEl = document.getElementById('osint-total');
const restartBtn = document.getElementById('osint-restart');

const DECK = [
  { handle: '@alex.renner', posts: [
      { text: 'Two weeks in Bali starting today ☀️ — house-sitter cancelled last minute, hope it\'s fine!', leak: true,
        why: 'Announces exact travel dates and that the house will sit unoccupied for two weeks.' },
      { text: 'Coffee > everything today.', leak: false },
      { text: '10 years since I graduated from Lincoln High! Go Wolves.', leak: true,
        why: "High school name is a common security-question answer ('what high school did you attend?')." },
      { text: 'Meet our new puppy, Biscuit! 🐶', leak: true,
        why: 'Pet names are a frequent password/security-question choice, so this hands out a likely guess.' },
      { text: 'Loving my new badge photo at work today.', leak: false },
  ]},
  { handle: '@priya.k', posts: [
      { text: 'My mom, Susan Whitfield, turns 60 this week! 🎉', leak: true,
        why: "Publishes a parent's full name, a common answer to 'mother's maiden name' security questions." },
      { text: "Can't wait for the concert tonight!", leak: false },
      { text: 'Just set up autopay with my new card ending in 4471.', leak: true,
        why: 'Sharing even a partial card number gives an attacker a head start on card-related social engineering.' },
      { text: 'Home alone this weekend, finally some quiet!', leak: true,
        why: 'Directly announces the home is unoccupied and for how long.' },
      { text: 'Loved this book, highly recommend.', leak: false },
  ]},
  { handle: '@marcus_devops', posts: [
      { text: 'Excited to start my new role as Senior DevOps Engineer at Nimbus Cloud next Monday!', leak: false },
      { text: "My daughter's first day of kindergarten at Oakwood Elementary 🎒", leak: true,
        why: "Names the specific school a minor attends — useful for targeted social engineering against the family." },
      { text: 'Working late tonight, house is empty till midnight.', leak: true,
        why: 'A real-time announcement that the home is currently unoccupied.' },
      { text: 'Throwback to my first car, a red Civic 🚗', leak: false },
      { text: 'Fun fact: my security-question answer is the street I grew up on, Maple Ave.', leak: true,
        why: "Openly states the exact answer to a common security question ('what street did you grow up on')." },
  ]},
  { handle: '@traveler_jen', posts: [
      { text: 'Landing in Tokyo in 3 hours! First international trip 😍', leak: true,
        why: 'Announces upcoming travel plans and exact timing in real time.' },
      { text: 'My favorite ramen spot near our old apartment on 5th street.', leak: true,
        why: 'Ties a past home address detail to a routine location, useful for building a profile of the person.' },
      { text: "Can't believe how humid it is today.", leak: false },
      { text: 'Hotel front-desk number if anyone needs to reach me: 555-0142.', leak: true,
        why: 'Publicly shares a phone number tied to an exact travel location and date.' },
      { text: 'Best coffee of my life this morning.', leak: false },
  ]},
  { handle: '@small_biz_owner', posts: [
      { text: 'Store is closed for a family emergency, back Monday.', leak: true,
        why: 'Tells the public the business location will be unattended over a specific window.' },
      { text: 'New product drop this Friday, so excited!', leak: false },
      { text: 'My admin login is the same everywhere for convenience lol.', leak: true,
        why: 'Explicitly admits to password reuse, which turns one breach into many.' },
      { text: 'Shoutout to our accountant Dana for another great quarter!', leak: false },
      { text: 'Just shared our WiFi password with the whole team in the group chat.', leak: true,
        why: 'Casually distributes a shared credential over an unsecured channel, widening exposure.' },
  ]},
  { handle: '@newlywed_sam', posts: [
      { text: 'Just changed my last name everywhere — new signature is Sam Whitcombe-Reyes!', leak: false },
      { text: 'Wedding registry is up, and yes, our home address is on it if you want to send a gift 🏡', leak: true,
        why: 'Publicly links a home address to a household, which can enable targeted scams or physical risk.' },
      { text: 'Honeymoon starts tomorrow — two weeks in Greece!', leak: true,
        why: 'Publishes upcoming travel dates before departure, telegraphing when the home will be empty.' },
      { text: "So grateful for all the kind messages today.", leak: false },
      { text: 'Locked myself out and the spare key is under the mat as always 😅', leak: true,
        why: 'Reveals the exact hiding spot of a spare house key.' },
  ]},
];

let deck, idx, score, mistakes, selected, over;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  deck = shuffle([...DECK]);
  idx = 0; score = 0; mistakes = 0; over = false;
  totalEl.textContent = deck.length;
  updateHud();
  render();
}

function updateHud() {
  scoreEl.textContent = score;
  mistakesEl.textContent = mistakes;
  countEl.textContent = Math.min(idx + 1, deck.length);
}

function render() {
  if (over) return;
  selected = new Set();
  const profile = deck[idx];
  profileEl.innerHTML = `
    <div class="field" style="margin-bottom:10px;"><b>Profile</b><br><span>${escapeHtml(profile.handle)}</span></div>
    ${profile.posts.map((p, i) => `
      <div class="osint-post" data-i="${i}" role="checkbox" aria-checked="false" tabindex="0"
           aria-label="${escapeHtml(p.text)}">
        <div class="handle">${escapeHtml(profile.handle)}</div>
        <div class="text">${escapeHtml(p.text)}</div>
      </div>
    `).join('')}
  `;
  profileEl.querySelectorAll('.osint-post').forEach((el) => {
    el.addEventListener('click', () => togglePost(el));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePost(el); }
    });
  });
  submitBtn.disabled = false;
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback-box';
}

function togglePost(el) {
  const i = parseInt(el.dataset.i, 10);
  if (selected.has(i)) {
    selected.delete(i);
    el.classList.remove('leak-selected');
    el.setAttribute('aria-checked', 'false');
  } else {
    selected.add(i);
    el.classList.add('leak-selected');
    el.setAttribute('aria-checked', 'true');
    sfx.click();
  }
}

function submit() {
  if (over) return;
  const profile = deck[idx];
  const posts = profileEl.querySelectorAll('.osint-post');
  submitBtn.disabled = true;

  let exact = true;
  const explanations = [];
  profile.posts.forEach((p, i) => {
    const wasSelected = selected.has(i);
    if (p.leak && wasSelected) posts[i].classList.add('leak-correct');
    if (p.leak && !wasSelected) { posts[i].classList.add('leak-missed'); exact = false; }
    if (!p.leak && wasSelected) { exact = false; }
    if (p.leak) explanations.push(p.why);
  });

  if (exact) {
    score++;
    sfx.score();
    feedbackEl.className = 'feedback-box correct';
    feedbackEl.textContent = `All leaks found. ${explanations.join(' ')}`;
  } else {
    mistakes++;
    sfx.wrong();
    feedbackEl.className = 'feedback-box incorrect';
    feedbackEl.textContent = `Not quite — the real leaks: ${explanations.join(' ')}`;
  }
  updateHud();

  setTimeout(() => {
    idx++;
    if (idx >= deck.length) { endGame(); return; }
    render();
  }, 2600);
}

function endGame() {
  over = true;
  const { isNewHighScore, bestScore, newBadges } = finishGame({
    gameId: 'osint', score, higherIsBetter: true,
    cleared: score, total: deck.length, mistakes,
  });
  showOverlay('osint', {
    won: true,
    title: 'Trail complete',
    message: `Correctly cleared ${score} / ${deck.length} profiles.`,
    score, bestScore, isNewHighScore, newBadges,
    onPlayAgain: init,
    onBackToHub: showHub,
  });
}

submitBtn.addEventListener('click', submit);
restartBtn.addEventListener('click', init);
registerGame('osint', { onEnter: init });
