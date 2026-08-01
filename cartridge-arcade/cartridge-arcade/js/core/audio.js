/**
 * audio.js — tiny 8-bit style sound effects, synthesized with the Web Audio
 * API oscillator node. No audio files, no dependencies. The AudioContext is
 * created lazily on the first user gesture (required by browser autoplay
 * policy) and every sound respects a persisted mute flag.
 */

import { readJSON, writeJSON } from './storage.js';

const MUTE_KEY = 'muted';

/** @type {AudioContext|null} */
let ctx = null;
let muted = readJSON(MUTE_KEY, false);

/** @returns {boolean} current mute state */
export function isMuted() {
  return muted;
}

/** Toggle mute, persist it, and return the new state. */
export function toggleMute() {
  muted = !muted;
  writeJSON(MUTE_KEY, muted);
  return muted;
}

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Play a single tone.
 * @param {number} freq frequency in Hz
 * @param {number} durationMs
 * @param {OscillatorType} type waveform
 * @param {number} startDelayMs delay before this tone starts, for simple sequences
 * @param {number} gain peak volume 0-1
 */
function tone(freq, durationMs, type = 'square', startDelayMs = 0, gain = 0.06) {
  if (muted) return;
  const audioCtx = ensureContext();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(audioCtx.destination);

  const startAt = audioCtx.currentTime + startDelayMs / 1000;
  const endAt = startAt + durationMs / 1000;
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, endAt);

  osc.start(startAt);
  osc.stop(endAt + 0.02);
}

/** A sequence of {freq, durationMs, type, gain} tones played back-to-back with small gaps. */
function sequence(notes) {
  let t = 0;
  for (const n of notes) {
    tone(n.freq, n.durationMs, n.type || 'square', t, n.gain);
    t += n.durationMs + (n.gapMs ?? 15);
  }
}

/** Sound library — each function is a self-contained cue used across every game. */
export const sfx = {
  /** Neutral UI click: hub cards, buttons, menu navigation. */
  click: () => tone(320, 45, 'square', 0, 0.045),
  /** A move that doesn't score: tile slide, card flip, cell placed. */
  move: () => tone(220, 40, 'square', 0, 0.04),
  /** A successful match/score/correct-answer beep. */
  score: () => sequence([{ freq: 520, durationMs: 55 }, { freq: 780, durationMs: 70 }]),
  /** A wrong answer / lost life buzz. */
  wrong: () => tone(120, 140, 'sawtooth', 0, 0.05),
  /** Game-over / loss stinger. */
  lose: () =>
    sequence([
      { freq: 300, durationMs: 90, type: 'triangle' },
      { freq: 220, durationMs: 90, type: 'triangle' },
      { freq: 140, durationMs: 180, type: 'triangle' },
    ]),
  /** Victory / clear-the-deck fanfare. */
  win: () =>
    sequence([
      { freq: 523, durationMs: 90 },
      { freq: 659, durationMs: 90 },
      { freq: 784, durationMs: 90 },
      { freq: 1046, durationMs: 160 },
    ]),
  /** A badge unlock chime, distinct from a plain win so it stands out in the log. */
  badge: () =>
    sequence([
      { freq: 660, durationMs: 60, type: 'triangle' },
      { freq: 880, durationMs: 60, type: 'triangle' },
      { freq: 1320, durationMs: 120, type: 'triangle' },
    ]),
};
