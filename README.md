# MOHAMEDB999.github.io

Personal portfolio and project hub for **Mohamed Benabdelghani**, a Cybersecurity / Computer Science student at USTHB. This site is deployed via GitHub Pages and hosts the **Arcade** project below.

## 🕹️ Arcade

**Live Demo:** [https://mohamedb999.github.io/arcade/](https://mohamedb999.github.io/arcade/)
**Source:** [`/arcade`](./arcade)

### Overview
Arcade is a free, installable browser game collection built with plain HTML, CSS, and JavaScript (ES modules) — no build step, no external runtime dependencies. It combines 5 classic arcade games with 8 original "Cyber Ops" games designed to teach defensive cybersecurity concepts in a fun, interactive way (e.g. recognizing phishing emails, understanding password strength, prioritizing vulnerability patches). All gameplay progress (high scores, badges, play counts) is saved on-device via `localStorage`.

### Features
- 🎮 **13 playable games**: Tic-Tac-Toe, Snake, Memory Match, 2048, Pong, Phish or Legit, Cipher Breaker, Firewall Duty, Password Fortress, Vuln Spotter, OSINT Trail, Incident Responder, Patch Priority
- 📱 **Progressive Web App (PWA)** — installable on desktop and mobile via manifest.json
- 📶 **Offline support** — service worker (`sw.js`) caches the app shell for offline play
- 🎓 **Cybersecurity-themed educational content** — the 8 "Cyber Ops" games are purely defensive/educational (no exploit code or attack payloads)
- ♿ **Accessibility-focused UI** — focus states, reduced-motion support, semantic HTML
- 💾 **Persistent local progress** — high scores and badges saved via `localStorage`, no backend required

> Note: this project is a web-based PWA. It does not currently include a separate native Android application/wrapper.

### Screenshots
_No screenshots have been added to the repository yet. This section will be updated with in-app screenshots (hub screen, a classic game, and a Cyber Ops game)._

### Tech Stack
- **HTML5 / CSS3** — layout, design tokens, CRT-style visual theme
- **JavaScript (ES Modules)** — no framework, no bundler
- **PWA**: `manifest.json` + `sw.js` (service worker) for installability and offline caching
- **Storage**: browser `localStorage` for state/progress persistence

### Project Structure
```
arcade/
├── index.html        # Single-page shell: hub + all 13 game screens
├── manifest.json     # PWA manifest
├── sw.js             # Service worker (offline caching)
├── css/              # tokens, base styles, components, per-game visuals, accessibility
├── js/
│   ├── app.js        # Boot: hub wiring, mute toggle, service worker registration
│   ├── core/         # storage, shared state, badges, audio, particles, UI overlays, router
│   └── games/        # one module per game (13 total)
└── assets/           # inline SVG icons (favicon, app icons, OG image)
```

### Running Locally
ES modules require the site to be served over HTTP (they won't load from `file://`).

```bash
git clone https://github.com/MOHAMEDB999/MOHAMEDB999.github.io.git
cd MOHAMEDB999.github.io/arcade
npm run dev        # serves via http-server at http://localhost:8080
# or, without Node:
python3 -m http.server 8080
```

### Deployment
This project is deployed automatically via **GitHub Pages** from the `main` branch. Any change pushed to `main` is published at [https://mohamedb999.github.io](https://mohamedb999.github.io) within a minute or two.

### Future Improvements
- Add real screenshots/GIFs of gameplay to this README
- Self-host fonts to remove the remaining external Google Fonts request for fully offline-from-first-load behavior
- Export a PNG version of the Open Graph image for broader social-preview compatibility
- Run and publish an official Lighthouse audit report
- Explore a packaged mobile build (e.g. Trusted Web Activity) if native distribution is desired

### License
No license file is currently included in this repository. All rights reserved by default unless a license is added.
