// Glide template library
// Each template: { id, name, cat, slots, pose(i,n,p) -> {x,y,z,rx,ry,rz,s,o} }
// p = loop progress [0,1). All templates loop seamlessly.
// Piece-based templates add: pieces:{cols,rows}, piecePose(i,j,n,p)

const TAU = Math.PI * 2;
export const frac = x => x - Math.floor(x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const ss = (a, b, x) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const hash = i => frac(Math.sin(i * 127.1 + 311.7) * 43758.5453);

// fibonacci sphere direction
function fibSphere(i, n) {
  const phi = Math.acos(1 - 2 * (i + 0.5) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  return { phi, theta };
}

export const CATEGORIES = [
  '3D & PERSPECTIVE', 'MULTISCENE', 'ISOMETRIC', 'ORBIT',
  'CAROUSEL & FLOW', 'GRID', 'SPOTLIGHT & FOCUS', 'REVEAL & WIPE', 'STACK & SCATTER',
];

export const TEMPLATES = [
  // ============ 3D & PERSPECTIVE (12) ============
  {
    id: 'showcase-stream', name: 'Showcase Stream', cat: '3D & PERSPECTIVE', slots: 10,
    pose(i, n, p) {
      const x = (frac(i / n + p) - 0.5) * 13;
      const zn = Math.abs(x) / 6.5;
      return { x, y: Math.sin((i / n) * TAU) * 0.12, z: -zn * 3.2, ry: -x * 0.055, s: 1 - zn * 0.22, o: ss(6.5, 5.0, Math.abs(x)) };
    },
  },
  {
    id: 'sphere-wall', name: 'Sphere Wall', cat: '3D & PERSPECTIVE', slots: 14,
    pose(i, n, p) {
      const { phi, theta } = fibSphere(i, n);
      const th = theta + p * TAU;
      const r = 2.7;
      const x = r * Math.sin(phi) * Math.cos(th), y = r * Math.cos(phi) * 0.78, z = r * Math.sin(phi) * Math.sin(th);
      const f = (z + r) / (2 * r);
      return { x, y, z: z - 0.6, s: 0.52 + f * 0.26, o: 0.45 + f * 0.55 };
    },
  },
  {
    id: 'card-globe', name: 'Card Globe', cat: '3D & PERSPECTIVE', slots: 14,
    pose(i, n, p) {
      const { phi, theta } = fibSphere(i, n);
      const th = theta + p * TAU;
      const r = 2.3;
      const tilt = 0.35;
      let x = r * Math.sin(phi) * Math.cos(th), y = r * Math.cos(phi), z = r * Math.sin(phi) * Math.sin(th) - 0.4;
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt), z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      const f = (z2 + r) / (2 * r);
      return { x, y: y2 * 0.8, z: z2, s: 0.5 + f * 0.3, o: 0.4 + f * 0.6 };
    },
  },
  {
    id: 'orbit-globe', name: 'Orbit Globe', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const ring = i % 3, k = Math.floor(i / 3), kn = Math.ceil(n / 3);
      const r = 1.5 + ring * 0.65;
      const dir = ring % 2 ? -1 : 1;
      const ang = (k / kn) * TAU + p * TAU * dir;
      const x = Math.sin(ang) * r, z = Math.cos(ang) * r * 0.9 - 0.5, y = (ring - 1) * 1.15;
      const f = (z + r) / (2 * r);
      return { x, y, z, s: 0.62 + f * 0.22, o: 0.55 + f * 0.45 };
    },
  },
  {
    id: 'sphere-cascade', name: 'Sphere Cascade', cat: '3D & PERSPECTIVE', slots: 14,
    pose(i, n, p) {
      const { phi, theta } = fibSphere(i, n);
      const th = theta + p * TAU;
      const ph = Math.acos(1 - 2 * frac((i + 0.5) / n + p));
      const r = 2.5;
      const x = r * Math.sin(ph) * Math.cos(th), y = r * Math.cos(ph) * 0.8, z = r * Math.sin(ph) * Math.sin(th) - 0.5;
      const f = (z + r) / (2 * r);
      return { x, y, z, s: 0.5 + f * 0.3, o: 0.45 + f * 0.55 };
    },
  },
  {
    id: 'totem-wall', name: 'Totem Wall', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const dir = col % 2 ? -1 : 1;
      const spd = 1 + (col % 3);
      const y = (frac(row / 3 + p * spd * dir) - 0.5) * 7.2;
      return { x: (col - 1.5) * 2.25, y, z: -(col % 2) * 0.7, s: 0.85, o: ss(3.5, 2.7, Math.abs(y)) };
    },
  },
  {
    id: 'parallax-totem', name: 'Parallax Totem', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const depth = [0, -1.2, -2.4, -3.4][col];
      const spd = [1, -2, 2, -1][col];
      const y = (frac(row / 3 + p * spd) - 0.5) * 8;
      const f = 1 + depth * 0.12;
      return { x: (col - 1.5) * 2.5 * (1 + depth * 0.06), y: y * f, z: depth, s: 0.95 + depth * 0.08, o: ss(4.2, 3.2, Math.abs(y)) * (1 + depth * 0.08) };
    },
  },
  {
    id: 'card-tunnel', name: 'Card Tunnel', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const zi = frac(i / n + p);
      const z = lerp(-9, 1.6, zi);
      const ang = i * 2.399;
      const rad = 2.3;
      return {
        x: Math.cos(ang) * rad, y: Math.sin(ang) * rad * 0.72, z,
        s: 0.9, o: ss(-9, -7, z) * (1 - ss(0.9, 1.6, z)),
      };
    },
  },
  {
    id: 'spiral-stream', name: 'Spiral Stream', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const zi = frac(i / n + p);
      const z = lerp(-8, 2, zi);
      const ang = i * 1.1 + p * TAU * 2;
      const r = 1.1 + zi * 1.4;
      return {
        x: Math.cos(ang) * r, y: Math.sin(ang) * r * 0.6, z,
        rz: ang * 0.15, s: 0.75 + zi * 0.3, o: ss(-8, -6.5, z) * (1 - ss(1.2, 2, z)),
      };
    },
  },
  {
    id: 'depth-stack-scroll', name: 'Depth Stack Scroll', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const layer = i % 3, k = Math.floor(i / 3);
      const spd = 0.6 + layer * 0.4;
      const y = (frac(k / 4 + p * spd) - 0.5) * 6.5;
      return {
        x: (layer - 1) * 0.7, y, z: -layer * 1.5,
        s: 1.15 - layer * 0.18, o: ss(3.3, 2.5, Math.abs(y)) * (1 - layer * 0.12),
      };
    },
  },
  {
    id: 'cover-ring', name: 'Cover Ring', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      return { x: Math.sin(ang) * 2.9, y: 0, z: Math.cos(ang) * 2.4 - 1.2, ry: ang, s: 0.95, o: 1 };
    },
  },
  {
    id: 'cover-ring-vertical', name: 'Cover Ring Vertical', cat: '3D & PERSPECTIVE', slots: 12,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      return { x: 0, y: Math.sin(ang) * 2.1, z: Math.cos(ang) * 2.3 - 1.1, rx: -ang, s: 0.95, o: 1 };
    },
  },

  // ============ MULTISCENE (4) ============
  {
    id: 'triple-scene', name: 'Triple Scene', cat: 'MULTISCENE', slots: 9,
    pose(i, n, p) {
      const panel = i % 3, k = Math.floor(i / 3);
      const dir = panel % 2 ? -1 : 1;
      const y = (frac(k / 3 + p * dir) - 0.5) * 5.6;
      return { x: (panel - 1) * 2.42, y, z: 0, s: 1.28, o: ss(1.15, 0.88, Math.abs(y)) };
    },
  },
  {
    id: 'grid-zoom-strip', name: 'Grid Zoom Strip', cat: 'MULTISCENE', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = (col - 1.5) * 1.95, y = (1 - row) * 1.28;
      const active = Math.floor(p * n) % n;
      const u = frac(p * n);
      if (i === active) {
        const b = ss(0.08, 0.35, u) * (1 - ss(0.65, 0.92, u));
        return { x, y, z: b * 1.6, s: 1 + b * 0.75, o: 1 };
      }
      return { x, y, z: -0.25, s: 0.92, o: 0.8 };
    },
  },
  {
    id: 'spread-rows', name: 'Spread Rows', cat: 'MULTISCENE', slots: 12,
    pose(i, n, p) {
      const row = Math.floor(i / 4), j = i % 4;
      const dir = row % 2 ? -1 : 1;
      const x = (frac(j / 4 + p * dir) - 0.5) * 9.5;
      const spread = 1.25 + 0.22 * Math.sin(p * TAU);
      return { x, y: (row - 1) * spread, z: -Math.abs(x) * 0.08, s: 1.0, o: ss(4.7, 3.9, Math.abs(x)) };
    },
  },
  {
    id: 'spread-columns', name: 'Spread Columns', cat: 'MULTISCENE', slots: 12,
    pose(i, n, p) {
      const col = i % 4, k = Math.floor(i / 4);
      const dir = col % 2 ? -1 : 1;
      const y = (frac(k / 3 + p * dir) - 0.5) * 7.5;
      const spread = 2.1 + 0.25 * Math.sin(p * TAU);
      return { x: (col - 1.5) * spread, y, z: -Math.abs(y) * 0.06, s: 1.0, o: ss(3.7, 3.0, Math.abs(y)) };
    },
  },

  // ============ ISOMETRIC (3) ============
  {
    id: 'iso-cascade', name: 'Iso Cascade', cat: 'ISOMETRIC', slots: 9,
    pose(i, n, p) {
      const col = i % 3, row = Math.floor(i / 3);
      const d = (row + col) * 0.075;
      const u = frac(p);
      const sin_ = ss(d, d + 0.16, u) * (1 - ss(0.86, 1, u));
      return {
        x: (col - 1) * 1.95, y: (1 - row) * 1.35, z: (row + col) * -0.18,
        rx: -0.52, ry: 0.58, s: 0.95 * sin_, o: sin_ > 0.01 ? 1 : 0,
      };
    },
  },
  {
    id: 'iso-focus', name: 'Iso Focus', cat: 'ISOMETRIC', slots: 9,
    pose(i, n, p) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = (col - 1) * 1.95, y = (1 - row) * 1.35, z = (row + col) * -0.18;
      const active = Math.floor(p * n) % n;
      const u = frac(p * n);
      if (i === active) {
        const b = ss(0.05, 0.3, u) * (1 - ss(0.7, 0.95, u));
        return { x, y, z: z + b * 1.2, rx: -0.52 + b * 0.3, ry: 0.58 - b * 0.35, s: 0.95 + b * 0.55, o: 1 };
      }
      return { x, y, z, rx: -0.52, ry: 0.58, s: 0.88, o: 0.62 };
    },
  },
  {
    id: 'iso-orbit', name: 'Iso Orbit', cat: 'ISOMETRIC', slots: 9,
    pose(i, n, p) {
      const col = i % 3, row = Math.floor(i / 3);
      const rot = Math.sin(p * TAU) * 0.3;
      const gx = (col - 1) * 1.95, gy = (1 - row) * 1.35;
      const x = gx * Math.cos(rot) - gy * Math.sin(rot) * 0.4;
      const y = gy * Math.cos(rot * 0.6) + gx * Math.sin(rot) * 0.15;
      const z = (row + col) * -0.18 + Math.sin(rot) * (col - 1) * 0.35;
      return { x, y, z, rx: -0.52, ry: 0.58 + rot * 0.3, s: 0.95, o: 1 };
    },
  },

  // ============ ORBIT (8) ============
  {
    id: 'orbit-showcase', name: 'Orbit Showcase', cat: 'ORBIT', slots: 10,
    pose(i, n, p) {
      if (i === 0) return { x: 0, y: 0, z: 0.9, ry: Math.sin(p * TAU) * 0.14, s: 1.5, o: 1 };
      const ang = ((i - 1) / (n - 1)) * TAU + p * TAU;
      const z = Math.cos(ang) * 1.9 - 1.6;
      return { x: Math.sin(ang) * 3.3, y: Math.cos(ang * 2) * 0.35, z, s: 0.55, o: 0.5 + (z + 3.5) / 7 };
    },
  },
  {
    id: 'orbit-bloom', name: 'Orbit Bloom', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const u = 0.5 - 0.5 * Math.cos(p * TAU);
      const r = lerp(0.18, 3.05, smooth(u));
      const ang = (i / n) * TAU + p * TAU;
      return {
        x: Math.sin(ang) * r, y: Math.cos(ang) * r * 0.72, z: Math.sin(ang * 2) * 0.4 * u,
        rz: ang * 0.08 * u, s: lerp(0.5, 0.95, u), o: 0.75 + u * 0.25,
      };
    },
  },
  {
    id: 'orbit-carousel', name: 'Orbit Carousel', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      const f = (Math.cos(ang) + 1) / 2;
      return { x: Math.sin(ang) * 3.0, y: 0, z: Math.cos(ang) * 2.2 - 0.9, ry: ang, s: 0.78 + f * 0.5, o: 0.5 + f * 0.5 };
    },
  },
  {
    id: 'photo-orbit', name: 'Photo Orbit', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const turns = 1 + (i % 2);
      const ang = i * 2.4 + p * TAU * turns * (i % 3 === 0 ? -1 : 1);
      const r = 1.7 + (i % 4) * 0.55;
      return {
        x: Math.sin(ang) * r, y: ((i % 5) - 2) * 0.52 + Math.sin(p * TAU * 2 + i) * 0.08, z: Math.cos(ang) * r * 0.75 - 0.8,
        rz: (hash(i) - 0.5) * 0.12, s: 0.55 + (i % 3) * 0.13, o: 0.9,
      };
    },
  },
  {
    id: 'focus-orbit', name: 'Focus Orbit', cat: 'ORBIT', slots: 10,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      const f = (Math.cos(ang) + 1) / 2;
      return { x: Math.sin(ang) * 3.0, y: 0, z: Math.cos(ang) * 2.3 - 0.9, ry: ang, s: 0.68 + Math.pow(f, 3) * 0.95, o: 0.45 + f * 0.55 };
    },
  },
  {
    id: 'vortex-spin', name: 'Vortex Spin', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const u = frac(i / n + p);
      const r = lerp(3.3, 0.0, smooth(u));
      const ang = i * 2.0 + p * TAU * 3;
      return {
        x: Math.cos(ang) * r, y: Math.sin(ang) * r * 0.7, z: lerp(-2.2, 1.2, u),
        rz: ang * 0.1, s: lerp(0.42, 1.0, u), o: ss(0, 0.12, u) * ss(1, 0.86, u),
      };
    },
  },
  {
    id: 'wheel-spin', name: 'Wheel Spin', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      return { x: Math.sin(ang) * 2.7, y: Math.cos(ang) * 2.3, z: 0, rz: -ang, s: 0.72, o: 1 };
    },
  },
  {
    id: 'wheel-spin-bottom', name: 'Wheel Spin Bottom', cat: 'ORBIT', slots: 12,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      const y = Math.cos(ang) * 3.4 - 2.5;
      return { x: Math.sin(ang) * 3.2, y, z: 0, rz: -ang, s: 0.8, o: ss(-2.3, -1.5, y) };
    },
  },

  // ============ CAROUSEL & FLOW (10) ============
  {
    id: 'card-totem', name: 'Card Totem', cat: 'CAROUSEL & FLOW', slots: 8,
    pose(i, n, p) {
      const y = (frac(i / n + p) - 0.5) * 7.2;
      return { x: 0, y, z: -Math.abs(y) * 0.32, s: 1.18 - Math.abs(y) * 0.07, o: ss(3.5, 2.6, Math.abs(y)) };
    },
  },
  {
    id: 'film-strip', name: 'Film Strip', cat: 'CAROUSEL & FLOW', slots: 8,
    pose(i, n, p) {
      const x = (frac(i / n + p) - 0.5) * 12;
      return { x, y: Math.sin(x * 0.55) * 0.22, z: -Math.abs(x) * 0.14, ry: -x * 0.03, s: 1.0, o: ss(6, 4.8, Math.abs(x)) };
    },
  },
  {
    id: 'wheel-carousel', name: 'Wheel Carousel', cat: 'CAROUSEL & FLOW', slots: 10,
    pose(i, n, p) {
      const ang = (i / n) * TAU + p * TAU;
      const y = Math.cos(ang) * 1.95;
      const f = 1 - (y + 1.95) / 3.9;
      return { x: Math.sin(ang) * 2.75, y, z: Math.cos(ang) * 0.85 - 0.3, s: 0.72 + f * 0.4, o: 0.6 + f * 0.4 };
    },
  },
  {
    id: 'cover-flow', name: 'Cover Flow', cat: 'CAROUSEL & FLOW', slots: 9,
    pose(i, n, p) {
      const sc = p * n;
      let off = ((i - sc) % n + n) % n;
      if (off > n / 2) off -= n;
      const a = Math.abs(off), sg = Math.sign(off);
      return {
        x: sg * (Math.min(a, 1) * 1.15 + Math.max(0, a - 1) * 0.6),
        y: 0, z: -Math.min(a, 1) * 1.15 - Math.max(0, a - 1) * 0.22,
        ry: -sg * Math.min(a, 1) * 0.95, s: 1.28 - Math.min(a, 1) * 0.38,
        o: ss(n / 2, n / 2 - 1.2, a),
      };
    },
  },
  {
    id: 'cover-flow-vertical', name: 'Cover Flow Vertical', cat: 'CAROUSEL & FLOW', slots: 9,
    pose(i, n, p) {
      const sc = p * n;
      let off = ((i - sc) % n + n) % n;
      if (off > n / 2) off -= n;
      const a = Math.abs(off), sg = Math.sign(off);
      return {
        x: 0, y: sg * (Math.min(a, 1) * 0.95 + Math.max(0, a - 1) * 0.52),
        z: -Math.min(a, 1) * 1.15 - Math.max(0, a - 1) * 0.22,
        rx: sg * Math.min(a, 1) * 0.85, s: 1.28 - Math.min(a, 1) * 0.38,
        o: ss(n / 2, n / 2 - 1.2, a),
      };
    },
  },
  {
    id: 'carousel-flow', name: 'Carousel Flow', cat: 'CAROUSEL & FLOW', slots: 10,
    pose(i, n, p) {
      const x = (frac(i / n + p) - 0.5) * 9.5;
      const zn = Math.abs(x) / 4.75;
      return { x, y: 0, z: -zn * zn * 3.1, ry: -x * 0.075, s: 1.06 - zn * 0.28, o: ss(4.75, 3.9, Math.abs(x)) };
    },
  },
  {
    id: 'diagonal-carousel', name: 'Diagonal Carousel', cat: 'CAROUSEL & FLOW', slots: 10,
    pose(i, n, p) {
      const u = frac(i / n + p) - 0.5;
      return { x: u * 11, y: -u * 6.2, z: -Math.abs(u) * 2.2, s: 1 - Math.abs(u) * 0.35, o: ss(0.5, 0.4, Math.abs(u)) };
    },
  },
  {
    id: 'focus-slider', name: 'Focus Slider', cat: 'CAROUSEL & FLOW', slots: 6,
    pose(i, n, p) {
      const sc = p * n;
      let off = ((i - sc) % n + n) % n;
      if (off > n / 2) off -= n;
      const a = Math.abs(off);
      return {
        x: off * 2.7, y: 0, z: -a * 1.25, s: 1.4 - Math.min(a, 1) * 0.45,
        ry: -Math.sign(off) * Math.min(a, 1) * 0.25, o: ss(2.4, 1.7, a),
      };
    },
  },
  {
    id: 'mosaic-marquee', name: 'Mosaic Marquee', cat: 'CAROUSEL & FLOW', slots: 16,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = (frac(col / 4 + p) - 0.5) * 9.2;
      const y = (frac(row / 4 - p * 0.75) - 0.5) * 6.4;
      return { x, y, z: 0, s: 0.88, o: ss(4.6, 3.8, Math.abs(x)) * ss(3.2, 2.6, Math.abs(y)) };
    },
  },
  {
    id: 'hero-reel', name: 'Hero Reel', cat: 'CAROUSEL & FLOW', slots: 6,
    pose(i, n, p) {
      const seg = p * n, a = Math.floor(seg) % n, u = frac(seg);
      if (i === a) {
        return { x: (u - 0.5) * 0.55, y: (u - 0.5) * -0.2, z: 0.4, s: 1.72 + u * 0.3, o: 1 - ss(0.82, 1, u) };
      }
      if (i === (a + 1) % n) {
        return { x: 0, y: 0, z: 0.1, s: 1.72, o: ss(0.82, 1, u) };
      }
      return { x: 0, y: 0, z: -1, s: 1.7, o: 0 };
    },
  },

  // ============ GRID (7) ============
  {
    id: 'grid-reveal', name: 'Grid Reveal', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const d = (col + row) * 0.05;
      const u = frac(p);
      const k = ss(d, d + 0.13, u) * (1 - ss(0.88, 1, u));
      const breathe = 1 + 0.02 * Math.sin(p * TAU * 2 + i);
      return { x: (col - 1.5) * 1.95, y: (1 - row) * 1.3, z: 0, s: 0.94 * k * breathe, o: k > 0.01 ? 1 : 0 };
    },
  },
  {
    id: 'spotlight-zoom', name: 'Spotlight Zoom', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = (col - 1.5) * 1.95, y = (1 - row) * 1.3;
      const active = Math.floor(p * n) % n;
      const u = frac(p * n);
      if (i === active) {
        const b = ss(0.06, 0.32, u) * (1 - ss(0.68, 0.94, u));
        return { x: x * (1 - b * 0.9), y: y * (1 - b * 0.9), z: b * 2.0, s: 0.94 + b * 1.9, o: 1 };
      }
      return { x, y, z: -0.3, s: 0.9, o: 0.72 };
    },
  },
  {
    id: 'flip-grid', name: 'Flip Grid', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const d = ((i * 7) % n) * 0.045;
      const w = clamp((p - d) / 0.22, 0, 1);
      const ry = TAU * smooth(w);
      const z = Math.sin(w * Math.PI) * 0.55;
      return { x: (col - 1.5) * 1.95, y: (1 - row) * 1.3, z, ry, s: 0.94, o: 1 };
    },
  },
  {
    id: 'pop-grid', name: 'Pop Grid', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const col = i % 4, row = Math.floor(i / 4);
      const u = frac(p * 2);
      const d = ((i * 5) % n) * 0.035;
      const k = ss(d, d + 0.12, u) * (1 - ss(0.72, 0.95, u));
      const overshoot = k > 0 ? k * (1 + 0.18 * Math.sin(Math.min(1, k) * Math.PI)) : 0;
      return { x: (col - 1.5) * 1.95, y: (1 - row) * 1.3, z: k * 0.2, s: 0.94 * overshoot, o: k > 0.01 ? 1 : 0 };
    },
  },
  {
    id: 'ticker-loop', name: 'Ticker Loop', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const row = i < 6 ? 0 : 1, j = i % 6;
      const spd = row ? -1 : 1;
      const x = (frac(j / 6 + p * spd) - 0.5) * 11;
      return { x, y: row ? -0.78 : 0.78, z: 0, s: 0.88, o: ss(5.5, 4.4, Math.abs(x)) };
    },
  },
  {
    id: 'ticker-tilt', name: 'Ticker Tilt', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const row = i < 6 ? 0 : 1, j = i % 6;
      const spd = row ? -1 : 1;
      const x = (frac(j / 6 + p * spd) - 0.5) * 11.5;
      return { x, y: (row ? -0.85 : 0.85) + x * 0.14, z: row ? -0.4 : 0, rz: 0.09, s: 0.88, o: ss(5.7, 4.6, Math.abs(x)) };
    },
  },
  {
    id: 'column-drift', name: 'Column Drift', cat: 'GRID', slots: 12,
    pose(i, n, p) {
      const col = i % 4, k = Math.floor(i / 4);
      const spd = [1, -2, 2, -1][col];
      const y = (frac(k / 3 + p * spd) - 0.5) * 7.6;
      return { x: (col - 1.5) * 2.05, y, z: 0, s: 0.95, o: ss(3.8, 3.0, Math.abs(y)) };
    },
  },

  // ============ SPOTLIGHT & FOCUS (4) ============
  {
    id: 'center-stage', name: 'Center Stage', cat: 'SPOTLIGHT & FOCUS', slots: 8,
    pose(i, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      if (i === a) {
        return { x: 0, y: 0, z: 1.0, ry: Math.sin(u * TAU) * 0.05, s: 1.62, o: ss(0, 0.1, u) };
      }
      let k = ((i - a) % n + n) % n;
      if (k === 0) k = n;
      const ang = (k / (n - 1)) * TAU + 0.5;
      return { x: Math.sin(ang) * 3.4, y: Math.cos(ang) * 1.95, z: -2.3, s: 0.68, o: 0.32 };
    },
  },
  {
    id: 'focus-shift', name: 'Focus Shift', cat: 'SPOTLIGHT & FOCUS', slots: 7,
    pose(i, n, p) {
      const f = p * n;
      let off = ((i - f) % n + n) % n;
      if (off > n / 2) off -= n;
      const x = off * 1.42;
      const a = Math.abs(off);
      return { x, y: 0, z: -a * 0.95, s: 1.38 - Math.min(a, 1) * 0.48, o: ss(3.6, 2.9, Math.abs(x)) };
    },
  },
  {
    id: 'deck-peel', name: 'Deck Peel', cat: 'SPOTLIGHT & FOCUS', slots: 8,
    pose(i, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const depth = ((i - a) % n + n) % n;
      const peel = ss(0.55, 0.92, u);
      if (depth === 0) {
        return { x: peel * 4.6, y: peel * 0.6, z: 0.3 - peel * 0.4, ry: peel * 0.65, rz: -peel * 0.4, s: 1.25, o: 1 - ss(0.8, 0.97, u) };
      }
      const rise = depth === 1 ? ss(0.55, 0.9, u) : 0;
      const dd = depth - rise;
      return { x: dd * 0.05, y: -dd * 0.04, z: 0.3 - dd * 0.1, s: 1.25 - dd * 0.035, o: depth > 4 ? 0 : 1 };
    },
  },
  {
    id: 'zoom-parallax', name: 'Zoom Parallax', cat: 'SPOTLIGHT & FOCUS', slots: 10,
    pose(i, n, p) {
      const depth = (i % 5);
      const z = -depth * 1.15;
      const nx = (hash(i) - 0.5) * 5.4, ny = (hash(i + 50) - 0.5) * 3.2;
      const pulse = Math.sin(p * TAU);
      const par = 1 + (4 - depth) * 0.09 * pulse;
      return { x: nx * par, y: ny * par, z, s: 1.05 - depth * 0.06, o: 1 - depth * 0.1 };
    },
  },

  // ============ REVEAL & WIPE (4) ============
  {
    id: 'diagonal-wipe', name: 'Diagonal Wipe', cat: 'REVEAL & WIPE', slots: 8,
    pose(i, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const cur = a, nxt = (a + 1) % n;
      const w = ss(0.68, 0.98, u);
      if (i === cur) return { x: -w * 3.4, y: w * 2.0, z: 0, rz: -w * 0.06, s: 1.85, o: 1 };
      if (i === nxt) return { x: (1 - w) * 3.6, y: -(1 - w) * 2.1, z: 0.06, rz: (1 - w) * 0.06, s: 1.85, o: 1 };
      return { x: 0, y: 0, z: -1, s: 1.8, o: 0 };
    },
  },
  {
    id: 'stripe-reveal', name: 'Stripe Reveal', cat: 'REVEAL & WIPE', slots: 8,
    pieces: { cols: 9, rows: 1 },
    piecePose(i, j, n, p) {
      const cols = 9;
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const cur = a, nxt = (a + 1) % n;
      const xj = (j - (cols - 1) / 2) * (3.7 / cols);
      const tj = 0.5 + j * 0.042;
      if (i === nxt) {
        const k = ss(tj, tj + 0.1, u);
        return { x: xj, y: 0, z: 0.05, s: 1, sy: k, o: k > 0.01 ? 1 : 0, pieceW: 3.7 / cols, pieceH: 2.3 };
      }
      if (i === cur) return { x: xj, y: 0, z: 0, s: 1, sy: 1, o: 1, pieceW: 3.7 / cols, pieceH: 2.3 };
      return { x: xj, y: 0, z: -1, s: 1, sy: 1, o: 0, pieceW: 3.7 / cols, pieceH: 2.3 };
    },
    pose() { return { x: 0, y: 0, z: -2, s: 0.001, o: 0 }; },
  },
  {
    id: 'split-reveal', name: 'Split Reveal', cat: 'REVEAL & WIPE', slots: 8,
    pieces: { cols: 2, rows: 1 },
    piecePose(i, j, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const cur = a, nxt = (a + 1) % n;
      const w = ss(0.58, 0.92, u);
      const side = j === 0 ? -1 : 1;
      if (i === nxt) return { x: side * 0.95 + side * (1 - w) * 3.2, y: 0, z: 0.05, s: 1, sy: 1, o: 1, pieceW: 1.9, pieceH: 2.3 };
      if (i === cur) return { x: side * 0.95 - side * w * 1.2, y: 0, z: 0, s: 1, sy: 1, o: 1, pieceW: 1.9, pieceH: 2.3 };
      return { x: 0, y: 0, z: -1, s: 1, sy: 1, o: 0, pieceW: 1.9, pieceH: 2.3 };
    },
    pose() { return { x: 0, y: 0, z: -2, s: 0.001, o: 0 }; },
  },
  {
    id: 'mosaic-wipe', name: 'Mosaic Wipe', cat: 'REVEAL & WIPE', slots: 8,
    pieces: { cols: 4, rows: 3 },
    piecePose(i, j, n, p) {
      const cols = 4;
      const order = [0, 5, 9, 2, 7, 11, 3, 6, 10, 1, 4, 8];
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const cur = a, nxt = (a + 1) % n;
      const cx = (j % cols - (cols - 1) / 2) * (3.7 / 4);
      const cy = (1 - Math.floor(j / cols)) * (2.3 / 3) - (2.3 / 3) * 0.0;
      const tj = 0.45 + order[j] * 0.036;
      if (i === nxt) {
        const k = ss(tj, tj + 0.09, u);
        return { x: cx, y: cy, z: 0.05, s: 0.5 + 0.5 * k, sy: 1, o: k > 0.01 ? 1 : 0, pieceW: 3.7 / 4, pieceH: 2.3 / 3 };
      }
      if (i === cur) return { x: cx, y: cy, z: 0, s: 1, sy: 1, o: 1, pieceW: 3.7 / 4, pieceH: 2.3 / 3 };
      return { x: cx, y: cy, z: -1, s: 1, sy: 1, o: 0, pieceW: 3.7 / 4, pieceH: 2.3 / 3 };
    },
    pose() { return { x: 0, y: 0, z: -2, s: 0.001, o: 0 }; },
  },

  // ============ STACK & SCATTER (7) ============
  {
    id: 'stack-slide', name: 'Stack Slide', cat: 'STACK & SCATTER', slots: 8,
    pose(i, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const depth = ((i - a) % n + n) % n;
      const slide = ss(0.62, 0.94, u);
      if (depth === 0) {
        return { x: -slide * 4.2, y: slide * 0.3, z: 0.32 - slide * 1.2, rz: slide * 0.18, s: 1.22, o: 1 - ss(0.82, 0.98, u) };
      }
      const dd = depth - slide;
      return { x: dd * 0.06, y: -dd * 0.05, z: 0.32 - dd * 0.11, s: 1.22 - dd * 0.04, o: depth > 4 ? 0 : 1 };
    },
  },
  {
    id: 'cascade-drop', name: 'Cascade Drop', cat: 'STACK & SCATTER', slots: 10,
    pose(i, n, p) {
      const u = frac(p);
      const d = i * 0.055;
      const f = smooth(clamp((u - d) / 0.2, 0, 1));
      const tx = (i - (n - 1) / 2) * 0.88;
      const ty = -0.15;
      const y = lerp(3.4, ty, f) - Math.sin(f * Math.PI) * 0.12;
      const exit = ss(0.88, 1, u);
      return { x: tx, y: y - exit * 4.2, z: 0, rz: (i - (n - 1) / 2) * 0.035, s: 1.0, o: f > 0.01 ? 1 : 0 };
    },
  },
  {
    id: 'cascade-deck', name: 'Cascade Deck', cat: 'STACK & SCATTER', slots: 8,
    pose(i, n, p) {
      const a = Math.floor(p * n) % n, u = frac(p * n);
      const depth = ((i - a) % n + n) % n;
      const tr = ss(0.7, 0.95, u);
      if (depth === 0) {
        return { x: 1.2 + tr * 3.4, y: 0.8 + tr * 2.2, z: 0.4 - tr * 0.2, rz: -tr * 0.3, s: 1.15, o: 1 - ss(0.78, 0.96, u) };
      }
      const dd = depth - tr;
      return { x: 1.2 + dd * 0.5, y: 0.8 - dd * 0.38, z: 0.4 - dd * 0.22, s: 1.15 - dd * 0.04, o: depth > 4 ? 0 : 1 };
    },
  },
  {
    id: 'image-trail', name: 'Image Trail', cat: 'STACK & SCATTER', slots: 7,
    pose(i, n, p) {
      const lag = i * 0.075;
      const ang = p * TAU * 2 - lag * TAU;
      return {
        x: Math.sin(ang) * 2.9, y: Math.cos(ang) * 1.55, z: -lag * 2.8,
        rz: Math.sin(ang) * 0.08, s: 1.15 - lag * 1.5, o: clamp(1 - lag * 1.6, 0, 1),
      };
    },
  },
  {
    id: 'poster-burst', name: 'Poster Burst', cat: 'STACK & SCATTER', slots: 12,
    pose(i, n, p) {
      const u = 0.5 - 0.5 * Math.cos(p * TAU);
      const e = smooth(u);
      const tx = ((i % 4) - 1.5) * 2.35 + (hash(i) - 0.5) * 0.5;
      const ty = (Math.floor(i / 4) - 1) * 1.62 + (hash(i + 9) - 0.5) * 0.4;
      const ang = i * 2.4;
      const sx = Math.cos(ang) * 0.7, sy = Math.sin(ang) * 0.5;
      return {
        x: lerp(sx, tx, e), y: lerp(sy, ty, e), z: lerp(0.6, -0.2, e),
        rz: (hash(i) - 0.5) * 0.5 * e, s: lerp(0.62, 1.0, e), o: 0.9 + e * 0.1,
      };
    },
  },
  {
    id: 'card-toss', name: 'Card Toss', cat: 'STACK & SCATTER', slots: 10,
    pose(i, n, p) {
      const di = i / n;
      const u = frac(p * 2 + di);
      const y = 3.6 * (4 * u * (1 - u)) * 0.55 - 1.25;
      return {
        x: (di - 0.5) * 6.5 + (u - 0.5) * 1.6, y, z: 0,
        rz: (di - 0.5) * 2.4 * u, s: 0.92, o: ss(0, 0.07, u) * (1 - ss(0.92, 1, u)),
      };
    },
  },
  {
    id: 'position-dance', name: 'Position Dance', cat: 'STACK & SCATTER', slots: 9,
    pose(i, n, p) {
      const phase = Math.min(2, Math.floor(p * 3));
      const u = smooth(frac(p * 3));
      const shifts = [1, 3, 5];
      const grid = k => ({ x: ((k % 3) - 1) * 2.0, y: (1 - Math.floor(k / 3)) * 1.4 });
      let idx = i;
      for (let ph = 0; ph < phase; ph++) idx = (idx + shifts[ph]) % n;
      const target = (idx + shifts[phase]) % n;
      const A = grid(idx), B = grid(target);
      const mx = lerp(A.x, B.x, u), my = lerp(A.y, B.y, u);
      const hop = Math.sin(u * Math.PI) * 0.35;
      return { x: mx, y: my, z: hop, s: 1.0 + hop * 0.15, o: 1 };
    },
  },
];

export function templateById(id) {
  return TEMPLATES.find(t => t.id === id);
}
