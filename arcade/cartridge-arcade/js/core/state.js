/**
 * state.js — the shared framework every game reports through.
 *
 * Instead of each game hand-rolling its own localStorage reads/writes, every
 * game calls the same three functions:
 *   - recordPlay(gameId)               when the player enters a game
 *   - finishGame(result)               when a run ends (win, loss, or clear)
 *   - getHighScore(gameId)             to render "best: N" in the UI
 *
 * This keeps persistence format, badge evaluation, and profile stats
 * consistent across all thirteen games instead of ten copy-pasted patterns.
 */

import { readJSON, writeJSON, clearAll } from './storage.js';
import { evaluateBadges, BADGES } from './badges.js';

const PROFILE_KEY = 'profile';
const HIGHSCORES_KEY = 'highscores';

const DEFAULT_PROFILE = () => ({
  gamesPlayed: 0,
  playCounts: {},
  badges: [],
  bestStreaks: {},
  lastPlayedAt: null,
});

/** @type {Array<(profile: object) => void>} */
const listeners = [];

/** Subscribe to profile changes (used by the hub to live-update the summary panel). */
export function onProfileChange(fn) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function notify(profile) {
  listeners.forEach((fn) => {
    try {
      fn(profile);
    } catch {
      /* a listener error shouldn't break persistence */
    }
  });
}

/** @returns {object} the current profile, creating a default one if none exists */
export function getProfile() {
  return readJSON(PROFILE_KEY, DEFAULT_PROFILE());
}

function saveProfile(profile) {
  writeJSON(PROFILE_KEY, profile);
  notify(profile);
}

/** @returns {Record<string, number>} map of gameId -> best score */
export function getAllHighScores() {
  return readJSON(HIGHSCORES_KEY, {});
}

/** @returns {number|null} the stored best score for a game, or null if none yet */
export function getHighScore(gameId) {
  const all = getAllHighScores();
  return Object.prototype.hasOwnProperty.call(all, gameId) ? all[gameId] : null;
}

function saveHighScore(gameId, value) {
  const all = getAllHighScores();
  all[gameId] = value;
  writeJSON(HIGHSCORES_KEY, all);
}

/**
 * Call when a player opens a game screen. Increments play counts used for
 * the profile summary and the "played every Cyber Ops drill" badge.
 * @param {string} gameId
 */
export function recordPlay(gameId) {
  const profile = getProfile();
  profile.gamesPlayed += 1;
  profile.playCounts[gameId] = (profile.playCounts[gameId] || 0) + 1;
  profile.lastPlayedAt = new Date().toISOString();
  saveProfile(profile);
}

/**
 * Call when a game run ends. Updates the high score if beaten, evaluates
 * badge conditions, and persists everything in one go.
 *
 * @param {import('./badges.js').GameResult & {higherIsBetter?: boolean}} result
 * @returns {{isNewHighScore: boolean, bestScore: number|null, newBadges: Array<{id:string,label:string}>}}
 */
export function finishGame(result) {
  const { gameId, higherIsBetter = true } = result;
  const profile = getProfile();

  let isNewHighScore = false;
  let bestScore = getHighScore(gameId);
  if (typeof result.score === 'number') {
    if (
      bestScore === null ||
      (higherIsBetter ? result.score > bestScore : result.score < bestScore)
    ) {
      saveHighScore(gameId, result.score);
      bestScore = result.score;
      isNewHighScore = true;
    }
  }

  if (typeof result.streak === 'number') {
    const prevStreak = profile.bestStreaks[gameId] || 0;
    if (result.streak > prevStreak) profile.bestStreaks[gameId] = result.streak;
  }

  const newBadges = evaluateBadges(result, profile);
  if (newBadges.length) {
    profile.badges = [...(profile.badges || []), ...newBadges.map((b) => b.id)];
  }

  saveProfile(profile);
  return { isNewHighScore, bestScore, newBadges };
}

/** @returns {Array<{id: string, label: string}>} the full list of earned badges, in catalogue order */
export function getEarnedBadges() {
  const profile = getProfile();
  const earned = new Set(profile.badges || []);
  return BADGES.filter((b) => earned.has(b.id)).map((b) => ({ id: b.id, label: b.label }));
}

/** Wipe every stored game stat, high score, and badge. Used by the "reset all progress" control. */
export function resetAllProgress() {
  clearAll();
  notify(DEFAULT_PROFILE());
}
