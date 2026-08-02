# Cartridge // Arcade

A free, installable browser arcade: 13 minigames, plain HTML/CSS/JS (ES
modules), no build step, no dependencies to install. Progress (high scores,
badges, play counts) is saved on-device via `localStorage`.

**Classics:** Tic-Tac-Toe, Snake, Memory Match, 2048, Pong.

**Cyber Ops** (defensive security drills, one per field):
- **Phish or Legit** — social engineering / email security
- **Cipher Breaker** — cryptography (Caesar cipher)
- **Firewall Duty** — network security (timed allow/block against a ruleset)
- **Password Fortress** — authentication (live strength meter + crack-time estimate)
- **Vuln Spotter** — application security (spot the flawed line in short code snippets)
- **OSINT Trail** — privacy awareness (spot what a public profile leaks)
- **Incident Responder** — incident response (sequence contain → eradicate → recover → review)
- **Patch Priority** — risk triage (rank vulnerabilities by real-world priority)

All eight Cyber Ops games are purely educational and defensive — they teach
recognition and decision-making (what phishing looks like, why MD5 is a bad
password hash, which CVE to patch first) and never provide working exploit
code, attack payloads, or real OSINT tooling.

## Project structure

```
index.html            single HTML shell: hub + all 13 game screens
manifest.json          PWA manifest
sw.js                   service worker (offline app-shell caching)
robots.txt, sitemap.xml SEO
package.json            npm script for a local dev server (no build step)

css/
  tokens.css            design tokens (colors, fonts, spacing) — single source of truth
  base.css               resets, CRT scanline effect, marquee header, skip link
  components.css         hub cards, profile panel, buttons, game-over overlay, toasts, transitions
  games.css               per-game visuals (all 13 games)
  a11y.css                 focus states, sr-only utility

js/
  app.js                  boot: wires hub, profile panel, mute toggle, reset control, service worker
  core/
    storage.js            safe localStorage wrapper
    state.js               shared profile/high-score/badge persistence layer
    badges.js               badge catalogue + evaluation
    audio.js                 Web Audio oscillator SFX + mute toggle
    particles.js              confetti burst + screen shake/flash (reduced-motion aware)
    ui.js                      shared game-over/victory overlay + toast notifications
    router.js                  hub <-> game navigation with transitions
    reorder.js                  shared drag/keyboard reordering for the two ranking games
  games/
    tictactoe.js, snake.js, memory.js, g2048.js, pong.js,
    phish.js, cipher.js, firewall.js, password.js, vuln.js,
    osint.js, incident.js, patch.js

assets/
  favicon.svg, icon-192.svg, icon-512.svg, icon-maskable.svg, og-image.svg
  (all inline SVG — no external image files)
```

Every game reports through the same shared framework instead of ten+
copy-pasted patterns: `recordPlay(gameId)` on entry, `finishGame(result)` on
game over (which updates the high score, checks badge conditions, and
persists everything), and `showOverlay(...)` for a consistent win/lose screen
with score, best score, "play again," and "back to hub."

## Run it locally

No build step required — just serve the folder over HTTP (ES modules don't
load from `file://`). One option, using the included script:

```bash
npm run dev
```

This runs `http-server` via `npx` (no install step) and serves the site at
`http://localhost:8080`. Any other static file server works too, e.g.:

```bash
python3 -m http.server 8080
```

## Deploy to GitHub Pages (mohamedb999.github.io)

Since your Pages repo is `mohamedb999.github.io`, anything you push to its
`main` branch is served at the root of that URL.

1. Copy the entire contents of this folder (`index.html`, `css/`, `js/`,
   `assets/`, `manifest.json`, `sw.js`, `robots.txt`, `sitemap.xml`) into the
   root of your `mohamedb999.github.io` repo.
2. Commit and push:
   ```bash
   git add .
   git commit -m "Rebuild arcade: 13 games, PWA, accessibility, persistence"
   git push origin main
   ```
3. Visit `https://mohamedb999.github.io/` — it can take a minute or two to
   update after a push.
4. On a supported browser/OS, you should see an "install" affordance (address
   bar icon on desktop Chrome/Edge, "Add to Home Screen" on mobile) since the
   site now ships a manifest and service worker. After the first visit, the
   whole arcade keeps working offline.

## Notes & known limitations

- Fonts (`Press Start 2P`, `VT323`) load from Google Fonts via CDN. If you
  need fully offline-from-first-load behavior with no external requests at
  all, self-host the two font files and update the `<link>` tags in
  `index.html` plus the service worker's cache list accordingly.
- The Open Graph / Twitter preview image (`assets/og-image.svg`) is an inline
  SVG to avoid any external image dependency. Some link-preview crawlers
  (notably Twitter/X) only render raster images for cards — if you need a
  guaranteed preview there, export `og-image.svg` to a 1200×630 PNG and point
  `og:image`/`twitter:image` at that instead.
- Lighthouse scores were audited manually against Lighthouse's known
  criteria (semantic HTML, contrast, meta tags, ARIA, alt text, viewport,
  etc.) rather than a live Lighthouse run, since this environment can't
  launch a browser. Run Lighthouse yourself in Chrome DevTools after
  deploying to confirm the 90+ numbers.
- All progress is stored in `localStorage`, scoped to whatever origin the
  site is served from — it won't sync across devices or browsers.
