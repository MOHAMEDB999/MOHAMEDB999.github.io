/**
 * particles.js — lightweight canvas confetti burst + CSS screen-shake/flash,
 * used for game-over and victory moments. Both no-op (or reduce to a static
 * flash) when the user has prefers-reduced-motion enabled.
 */

const COLORS = ['#2de2e6', '#ff2eae', '#ffd23f', '#6dff6d', '#ff8a3d', '#39ff6a'];

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let confettiCanvas = null;
let confettiCtx = null;

function ensureCanvas() {
  if (confettiCanvas) return confettiCanvas;
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti-canvas';
  confettiCanvas.setAttribute('aria-hidden', 'true');
  confettiCanvas.style.position = 'fixed';
  confettiCanvas.style.inset = '0';
  confettiCanvas.style.width = '100vw';
  confettiCanvas.style.height = '100vh';
  confettiCanvas.style.pointerEvents = 'none';
  confettiCanvas.style.zIndex = '900';
  // Defensive: this canvas must always be transparent. It covers the full
  // viewport, so any accidental global `canvas { background: ... }` rule
  // elsewhere in the app would black out the entire page during a win.
  confettiCanvas.style.background = 'transparent';
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext('2d');
  return confettiCanvas;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Fire a confetti burst from the center-top of the viewport (or a given
 * origin). Fully skipped under reduced motion — a static win screen already
 * communicates victory without needing motion.
 * @param {{x?: number, y?: number, count?: number}} [opts]
 */
export function confettiBurst(opts = {}) {
  if (prefersReducedMotion()) return;

  const canvas = ensureCanvas();
  resizeCanvas();
  const originX = opts.x ?? window.innerWidth / 2;
  const originY = opts.y ?? window.innerHeight * 0.25;
  const count = opts.count ?? 80;

  const particles = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 60 + Math.random() * 30,
    };
  });

  let frame = 0;
  function tick() {
    frame++;
    confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life >= p.maxLife) continue;
      alive = true;
      p.life++;
      p.vy += 0.15; // gravity
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      const fade = 1 - p.life / p.maxLife;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rotation);
      confettiCtx.globalAlpha = Math.max(0, fade);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    }
    if (alive) {
      requestAnimationFrame(tick);
    } else {
      confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(tick);
}

/**
 * Briefly shake and red-flash the given element (or the whole game panel) to
 * signal a loss / mistake. Reduces to a plain flash (no translation) under
 * reduced motion.
 * @param {HTMLElement} el
 */
export function shakeAndFlash(el) {
  if (!el) return;
  el.classList.remove('fx-shake', 'fx-shake-reduced');
  // Force reflow so the animation can restart if triggered twice in a row.
  void el.offsetWidth;
  el.classList.add(prefersReducedMotion() ? 'fx-shake-reduced' : 'fx-shake');
  el.addEventListener(
    'animationend',
    () => el.classList.remove('fx-shake', 'fx-shake-reduced'),
    { once: true }
  );
}

/** Add a brief scale/glow pulse to an element to mark a score event. */
export function scorePulse(el) {
  if (!el) return;
  el.classList.remove('fx-pulse');
  void el.offsetWidth;
  el.classList.add('fx-pulse');
  el.addEventListener('animationend', () => el.classList.remove('fx-pulse'), { once: true });
}
