/**
 * storage.js — thin, safe wrapper around localStorage.
 *
 * All keys are namespaced under "cartridge:" so this site never collides
 * with anything else that might share the origin. Every call is wrapped in
 * try/catch because localStorage can throw (private browsing, storage full,
 * disabled by the browser) and a game should degrade gracefully — not crash —
 * if persistence isn't available.
 */

const PREFIX = 'cartridge:';

/** @returns {boolean} whether localStorage is actually usable right now */
export function storageAvailable() {
  try {
    const testKey = `${PREFIX}__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON value from localStorage.
 * @param {string} key
 * @param {*} fallback value to return if missing or unreadable
 */
export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Write a JSON value to localStorage.
 * @param {string} key
 * @param {*} value
 * @returns {boolean} success
 */
export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Remove a single namespaced key. */
export function removeKey(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Remove every key this site has ever written (used by "reset all progress"). */
export function clearAll() {
  try {
    const toRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}
