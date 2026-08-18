# Images of Yours

**Your images, set in motion.** Turn your still images into cinematic motion showcases — pick a template, drop in your work, export HD video in seconds. Everything runs in your browser.

Live at **[ioy.ai](https://ioy.ai)**

## Features

- **59 motion templates** across 9 categories (3D & perspective, orbit, carousel & flow, grid, spotlight, reveal & wipe, stack & scatter, isometric, multiscene)
- **Multi-scene timelines** with overlapping transitions (crossfade, push, zoom-through, diagonal wipe)
- **Images & videos** as media — drag & drop into slots, scene-local playback sync
- **Keyframe camera control** — zoom & tilt keyframes with smooth interpolation
- **WebCodecs offline HD export** — 720p / 1080p / 1440p at 30/60 fps, frame-accurate and faster than realtime (MediaRecorder fallback included)
- **`.ioy` project files** — save / open / share; images embedded, small videos embedded too
- **Apple-flavored UI** — light & dark, frosted glass top bar, SF Pro type stack, brand splash screen
- 5 aspect ratios: 16:9 · 4:3 · 1:1 · 4:5 · 9:16
- 100% client-side — no server, your media never leaves the browser

## Tech stack

- Vite + Three.js (WebGL)
- Dual-stage render engine with GLSL transition compositor
- WebCodecs + mp4-muxer / webm-muxer for offline encoding
- captureStream + MediaRecorder as realtime fallback
- Deployed on Cloudflare Pages behind an edge Worker on ioy.ai

## Template system

Each template is a pure function `pose(i, n, p) → {x, y, z, rx, ry, rz, s, o}` mapping card index, card count, and loop progress to a transform. Piece-based templates (mosaic effects) add `piecePose(i, j, n, p)`. This makes templates trivially composable with scenes and transitions.

## Quick start

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

## Deployment

```bash
wrangler pages deploy dist --project-name animos-clone --branch main
```

`ioy.ai` is served by the `animos-chaobro` Worker (route `ioy.ai/*`), which proxies the Pages production deployment.

## Project structure

```
index.html            # app shell, splash screen, brand assets
public/favicon.svg    # brand mark
src/main.js           # app logic: scenes, media, keyframes, export, projects
src/engine.js         # dual-stage renderer + transition compositor
src/timeline.js       # multi-scene timeline evaluator
src/exporter.js       # WebCodecs + MediaRecorder export
src/templates.js      # 59 templates
src/style.css         # Apple-style design system
worker/               # Cloudflare Worker proxy for ioy.ai
```

## License

MIT
