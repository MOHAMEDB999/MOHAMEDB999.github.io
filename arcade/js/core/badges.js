/**
 * badges.js — the catalogue of "Cyber Ops" (and classic) achievement badges,
 * plus the logic that decides whether a just-finished game run earns one.
 *
 * A badge is only ever awarded once; the profile keeps a Set of earned ids.
 * Each badge's `check(result)` receives the standardized result object a
 * game passes to `session.finish()` (see core/state.js) and returns true/false.
 */

/**
 * @typedef {Object} GameResult
 * @property {string} gameId
 * @property {number} [score]
 * @property {boolean} [won]
 * @property {number} [mistakes]
 * @property {number} [cleared]
 * @property {number} [total]
 * @property {number} [moves]
 * @property {number} [seconds]
 */

export const BADGES = [
  {
    id: 'firewall-perfect',
    gameId: 'firewall',
    label: 'Cleared Firewall Duty with 0 mistakes',
    check: (r) => r.cleared === r.total && (r.mistakes ?? 0) === 0,
  },
  {
    id: 'phish-perfect',
    gameId: 'phish',
    label: 'Spotted every phish in Phish or Legit',
    check: (r) => r.cleared === r.total && (r.mistakes ?? 0) === 0,
  },
  {
    id: 'vuln-perfect',
    gameId: 'vuln',
    label: 'Found every flaw in Vuln Spotter',
    check: (r) => (r.score ?? 0) === (r.total ?? Infinity) && (r.total ?? 0) > 0,
  },
  {
    id: 'cipher-perfect',
    gameId: 'cipher',
    label: 'Broke every cipher on the first try',
    check: (r) => (r.score ?? 0) === (r.total ?? Infinity) && (r.total ?? 0) > 0,
  },
  {
    id: 'password-fortress',
    gameId: 'password',
    label: 'Built an EXCELLENT-rated password',
    check: (r) => r.won === true,
  },
  {
    id: 'osint-sharp-eye',
    gameId: 'osint',
    label: 'Spotted every OSINT leak with 0 mistakes',
    check: (r) => r.cleared === r.total && (r.mistakes ?? 0) === 0,
  },
  {
    id: 'incident-first-responder',
    gameId: 'incident',
    label: 'Sequenced every incident correctly',
    check: (r) => r.cleared === r.total && (r.mistakes ?? 0) === 0,
  },
  {
    id: 'patch-triage-master',
    gameId: 'patch',
    label: 'Nailed every patch-priority call',
    check: (r) => r.cleared === r.total && (r.mistakes ?? 0) === 0,
  },
  {
    id: '2048-tile',
    gameId: 'g2048',
    label: 'Reached the 2048 tile',
    check: (r) => r.won === true,
  },
  {
    id: 'snake-25',
    gameId: 'snake',
    label: 'Scored 25+ in Snake in one run',
    check: (r) => (r.score ?? 0) >= 25,
  },
  {
    id: 'pong-shutout',
    gameId: 'pong',
    label: 'Beat the house paddle without losing a point',
    check: (r) => r.won === true && (r.opponentScore ?? 1) === 0,
  },
  {
    id: 'memory-efficient',
    gameId: 'memory',
    label: 'Cleared Memory Match in under 20 moves',
    check: (r) => r.won === true && (r.moves ?? Infinity) <= 20,
  },
  {
    id: 'cyber-ops-complete',
    gameId: '__meta__',
    label: 'Played every Cyber Ops drill at least once',
    check: (r, profile) => {
      const cyberIds = ['phish', 'cipher', 'firewall', 'password', 'vuln', 'osint', 'incident', 'patch'];
      return cyberIds.every((id) => (profile.playCounts?.[id] ?? 0) > 0);
    },
  },
];

/**
 * Evaluate all badge conditions against a finished game result and the
 * current profile, returning any *newly* earned badges (badges already in
 * profile.badges are skipped).
 * @param {GameResult} result
 * @param {{badges: string[], playCounts: Record<string, number>}} profile
 * @returns {Array<{id: string, label: string}>}
 */
export function evaluateBadges(result, profile) {
  const earnedSet = new Set(profile.badges || []);
  const newlyEarned = [];
  for (const badge of BADGES) {
    if (earnedSet.has(badge.id)) continue;
    if (badge.gameId !== '__meta__' && badge.gameId !== result.gameId) continue;
    try {
      if (badge.check(result, profile)) {
        newlyEarned.push({ id: badge.id, label: badge.label });
      }
    } catch {
      /* a malformed result shouldn't crash the profile update */
    }
  }
  return newlyEarned;
}
