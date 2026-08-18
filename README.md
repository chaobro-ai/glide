# Glide

**Motion templates for design showcases.** Turn static designs into stunning motion showcases — pick a template, drop in your work, export MP4/WebM in seconds. Everything runs in your browser.

![Glide](https://img.shields.io/badge/status-beta-blue) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **59 motion templates** across 9 categories: 3D & Perspective, Multiscene, Isometric, Orbit, Carousel & Flow, Grid, Spotlight & Focus, Reveal & Wipe, Stack & Scatter
- **Media slots** — drag & drop or batch-upload your own images (2–20), or use built-in demo placeholders
- **Aspect ratios** — 16:9, 4:3, 1:1, 4:5, 9:16
- **Timeline & keyframes** — camera Zoom and Tilt tracks with diamond keyframes, smooth interpolation
- **Real-time export** — records one full loop via `captureStream()` + MediaRecorder → MP4 (H.264) or WebM
- **Light & dark themes** — Apple-flavored design, frosted-glass top bar, SF Pro typography
- **Zero backend** — pure client-side; no account, no uploads to a server

## Tech Stack

- [Vite](https://vite.dev/) + vanilla ES modules (no framework runtime)
- [Three.js](https://threejs.org/) WebGL rendering
- MediaRecorder API for video export

## Templates

Each template is a pure parametric function `pose(i, n, p) → {x, y, z, rx, ry, rz, s, o}` mapping card index, count and loop progress `p ∈ [0,1)` to a transform. Piece-based templates (Stripe/Split/Mosaic Reveal) split the image into texture-cropped tiles via `piecePose(i, j, n, p)`. Adding a new template = adding one object to `src/templates.js`.

## Getting Started

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

### Production build

```bash
npm run build      # outputs dist/
npm run preview
```

### Deploy

The site is deployed to Cloudflare Pages (`wrangler pages deploy dist`), with an optional edge Worker in `worker/` that reverse-proxies a custom domain to the Pages project.

## Project Structure

```
├── index.html          # editor shell
├── src/
│   ├── main.js         # app logic: library, slots, keyframes, transport, export
│   ├── scene.js        # Three.js render engine, card/piece management, demo textures
│   ├── templates.js    # 59 motion template definitions (9 categories)
│   └── style.css       # Apple-style design system (light/dark)
└── worker/             # optional Cloudflare Worker (custom-domain proxy)
```

## Keyboard

- `Space` — play / pause

## License

MIT
