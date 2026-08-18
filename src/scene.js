// Glide render engine (Three.js)
import * as THREE from 'three';

export const ASPECTS = {
  '16:9': [16, 9], '4:3': [4, 3], '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16],
};

// Card world size: width 1.6, height by aspect of slot image (assume 16:10 UI screenshots)
export const CARD_W = 1.75;
export const CARD_H = 1.1;

function roundedPlaneGeo(w, h, r, segs = 8) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(shape, segs);
}

export class Scene {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0d12');
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    // soft lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.65);
    key.position.set(2, 3, 5);
    this.scene.add(key);

    this.cards = [];
    this.cardGroup = new THREE.Group();
    this.scene.add(this.cardGroup);

    // shared shadow plane behind cards for depth feel
    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
    );
    this.backdrop.position.z = -14;
    this.scene.add(this.backdrop);

    this.zoom = 1;
    this.tilt = 0;
    this._geo = roundedPlaneGeo(CARD_W, CARD_H, 0.05);
    this._pieceGeoCache = new Map();
  }

  setAspect(name) {
    const [w, h] = ASPECTS[name] || [16, 9];
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.aspectName = name;
    this.resize();
  }

  setBackground(hex) {
    this.scene.background = new THREE.Color(hex);
  }

  resize() {
    const wrap = this.renderer.domElement.parentElement;
    if (!wrap) return;
    const W = Math.max(2, wrap.clientWidth - 36), H = Math.max(2, wrap.clientHeight - 36);
    const a = this.camera.aspect;
    let w = W, h = W / a;
    if (h > H) { h = H; w = H * a; }
    this.renderer.setSize(Math.floor(w), Math.floor(h), false);
    this.renderer.domElement.style.width = `${Math.floor(w)}px`;
    this.renderer.domElement.style.height = `${Math.floor(h)}px`;
  }

  ensureCards(count) {
    while (this.cards.length < count) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this._geo, mat);
      mesh.userData.hasTexture = false;
      this.cardGroup.add(mesh);
      this.cards.push(mesh);
    }
    this.activeCount = count;
  }

  setTexture(i, texture) {
    const mesh = this.cards[i];
    if (!mesh) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    mesh.material.map = texture;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate = true;
    mesh.userData.hasTexture = true;
  }

  clearTexture(i) {
    const mesh = this.cards[i];
    if (!mesh) return;
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.map = null;
    mesh.material.color.set(this._slotColor(i));
    mesh.material.needsUpdate = true;
    mesh.userData.hasTexture = false;
  }

  _slotColor(i) {
    const palette = [0x2d3654, 0x3a2d54, 0x2d544a, 0x54402d, 0x542d3a, 0x2d4754];
    return palette[i % palette.length];
  }

  // Render one frame at progress p [0,1)
  render(template, p, opts = {}) {
    const n = this.activeCount ?? this.cards.length;
    const cam = this.camera;

    for (let i = 0; i < this.cards.length; i++) {
      const mesh = this.cards[i];
      if (i >= n) { mesh.visible = false; continue; }

      if (template.pieces && template.piecePose) {
        // piece-based template: rebuild pieces for slot i on demand via group
        this._renderPieces(template, i, n, p);
        mesh.visible = false;
        continue;
      }

      const t = template.pose(i, n, p) || {};
      mesh.position.set(t.x || 0, t.y || 0, t.z || 0);
      mesh.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
      const s = t.s != null ? t.s : 1;
      const sy = t.sy != null ? t.sy : 1;
      mesh.scale.set(s, s * sy, 1);
      mesh.material.opacity = t.o != null ? t.o : 1;
      mesh.visible = (t.o != null ? t.o : 1) > 0.005;
    }

    // camera: zoom + tilt
    cam.position.set(0, 0, 7.5 / this.zoom);
    this.cardGroup.rotation.x = THREE.MathUtils.degToRad(this.tilt);

    this.renderer.render(this.scene, cam);
  }

  _renderPieces(template, slotIdx, n, p) {
    const key = `${template.id}:${slotIdx}`;
    if (!this._pieceGroups) this._pieceGroups = new Map();
    let entry = this._pieceGroups.get(key);
    const { cols, rows } = template.pieces;
    const total = cols * rows;
    if (!entry) {
      entry = { group: new THREE.Group(), meshes: [], texCache: {} };
      for (let j = 0; j < total; j++) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(this._geo, mat);
        entry.meshes.push(mesh);
        entry.group.add(mesh);
      }
      this.cardGroup.add(entry.group);
      this._pieceGroups.set(key, entry);
    }
    const srcMesh = this.cards[slotIdx];
    const srcTex = srcMesh.userData.hasTexture ? srcMesh.material.map : null;

    for (let j = 0; j < total; j++) {
      const mesh = entry.meshes[j];
      const t = template.piecePose(slotIdx, j, n, p);
      if (!t || (t.o != null && t.o <= 0.005)) { mesh.visible = false; continue; }
      mesh.visible = true;
      // geometry per piece size (cached)
      const gk = `${t.pieceW.toFixed(3)}x${t.pieceH.toFixed(3)}`;
      let geo = this._pieceGeoCache.get(gk);
      if (!geo) {
        geo = roundedPlaneGeo(t.pieceW, t.pieceH, 0.02, 4);
        this._pieceGeoCache.set(gk, geo);
      }
      mesh.geometry = geo;
      mesh.position.set(t.x, t.y, t.z);
      mesh.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
      const s = t.s != null ? t.s : 1;
      mesh.scale.set(s, s * (t.sy != null ? t.sy : 1), 1);
      mesh.material.opacity = t.o != null ? t.o : 1;

      if (srcTex) {
        const cached = entry.texCache[j];
        if (!cached || cached.userData.srcUuid !== srcTex.uuid) {
          cached?.dispose();
          const tex = srcTex.clone();
          tex.needsUpdate = true;
          tex.repeat.set(1 / cols, 1 / rows);
          tex.offset.set((j % cols) / cols, 1 - (Math.floor(j / cols) + 1) / rows);
          tex.userData.srcUuid = srcTex.uuid;
          entry.texCache[j] = tex;
        }
        mesh.material.map = entry.texCache[j];
        mesh.material.color.set(0xffffff);
      } else {
        mesh.material.map = null;
        mesh.material.color.set(this._slotColor(slotIdx));
      }
      mesh.material.needsUpdate = true;
    }
  }

  disposePieceGroups() {
    if (!this._pieceGroups) return;
    for (const e of this._pieceGroups.values()) {
      for (const tex of Object.values(e.texCache)) tex.dispose();
      e.meshes.forEach(m => m.material.dispose());
      this.cardGroup.remove(e.group);
    }
    this._pieceGroups.clear();
  }
}

// ---- placeholder image generator (demo content) ----
export function makeDemoTexture(i, renderer) {
  const w = 640, h = 400;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const hues = [215, 268, 160, 28, 340, 195, 48, 300];
  const hue = hues[i % hues.length];

  // bg gradient
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue}, 45%, 16%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360}, 50%, 10%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // mock browser chrome
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 0, w, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, k) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(20 + k * 22, 17, 6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(90, 8, w - 180, 18, 9); ctx.fill();

  // hero block
  ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.85)`;
  ctx.beginPath(); ctx.roundRect(40, 70, w * 0.55, 130, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 34px system-ui';
  ctx.fillText(`Showcase ${String(i + 1).padStart(2, '0')}`, 62, 128);
  ctx.font = '16px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('glide · design in motion', 62, 158);

  // cards row
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(40 + k * (w - 80) / 3 + k * 8, 230, (w - 100) / 3, 120, 10); ctx.fill();
    ctx.fillStyle = `hsla(${(hue + k * 30) % 360}, 65%, 58%, 0.9)`;
    ctx.beginPath(); ctx.roundRect(56 + k * (w - 80) / 3 + k * 8, 248, 40, 40, 8); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  return tex;
}
