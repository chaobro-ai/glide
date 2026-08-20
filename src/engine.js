// Images of Yours engine — dual-stage renderer with transition compositing
// One WebGLRenderer, three scenes: stageA, stageB, compositor (fullscreen quad).
import * as THREE from 'three';

export const ASPECTS = {
  '16:9': [16, 9], '4:3': [4, 3], '1:1': [1, 1], '4:5': [4, 5], '9:16': [9, 16],
};
export const CARD_W = 1.75;
export const CARD_H = 1.1;
export const CARD_ASPECT = CARD_W / CARD_H; // cards are always this aspect — media must be fit to it

// Cover-fit any image/canvas/video frame to the card aspect (no stretching).
// Crops the centered region that matches CARD_ASPECT, like CSS object-fit: cover.
export function fitCoverToCard(source, maxW = 1280) {
  const iw = source.videoWidth || source.naturalWidth || source.width;
  const ih = source.videoHeight || source.naturalHeight || source.height;
  const srcAR = iw / ih;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (srcAR > CARD_ASPECT) {
    sw = ih * CARD_ASPECT;      // source wider than card → crop left/right
    sx = (iw - sw) / 2;
  } else {
    sh = iw / CARD_ASPECT;      // source taller than card → crop top/bottom
    sy = (ih - sh) / 2;
  }
  const outW = Math.max(2, Math.min(maxW, Math.round(sw)));
  const outH = Math.max(2, Math.round(outW / CARD_ASPECT));
  const cv = document.createElement('canvas');
  cv.width = outW; cv.height = outH;
  cv.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);
  return cv;
}

// Cover-fit a live texture (VideoTexture) via repeat/offset window — no redraw cost.
export function applyCoverCropToTexture(tex, iw, ih) {
  const srcAR = iw / ih;
  if (srcAR > CARD_ASPECT) {
    const f = CARD_ASPECT / srcAR;
    tex.repeat.set(f, 1);
    tex.offset.set((1 - f) / 2, 0);
  } else if (srcAR < CARD_ASPECT) {
    const f = srcAR / CARD_ASPECT;
    tex.repeat.set(1, f);
    tex.offset.set(0, (1 - f) / 2);
  } else {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }
}

const TAU = Math.PI * 2;

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
  const geo = new THREE.ShapeGeometry(shape, segs);
  // three.js ShapeGeometry emits WORLD-space UVs; normalize to 0..1 so
  // textures map correctly onto the card (was the root cause of stretched
  // / edge-smeared images on real photos).
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) + w / 2) / w, (uv.getY(i) + h / 2) / h);
  }
  uv.needsUpdate = true;
  return geo;
}

const SLOT_PALETTE = [0x2d3654, 0x3a2d54, 0x2d544a, 0x54402d, 0x542d3a, 0x2d4754];

// ---------------------------------------------------------------- Stage ----
// A Stage owns one template's card meshes and renders it to a WebGLRenderTarget.
class Stage {
  constructor(baseGeo, maxSlots = 20) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.baseGeo = baseGeo;
    this.cards = [];
    this.activeCount = 0;
    this.zoom = 1;
    this.tilt = 0;
    this._pieceCache = new Map();   // key -> { group, meshes, texCache }
    this._pieceGeoCache = new Map();
    this._visibleMeshes = [];
    this._worldPosition = new THREE.Vector3();
    this._worldScale = new THREE.Vector3();

    for (let i = 0; i < maxSlots; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(baseGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.cards.push(mesh);
    }
  }

  setAspect(ar) {
    this.camera.aspect = ar;
    this.camera.updateProjectionMatrix();
  }

  setSlotCount(n) {
    this.activeCount = Math.min(n, this.cards.length);
  }

  setTexture(i, tex) {
    const m = this.cards[i];
    if (!m) return;
    m.material.map = tex;
    m.material.color.set(0xffffff);
    m.material.needsUpdate = true;
    m.userData.hasTexture = true;
  }

  clearTexture(i) {
    const m = this.cards[i];
    if (!m) return;
    m.material.map = null;
    m.material.color.set(SLOT_PALETTE[i % SLOT_PALETTE.length]);
    m.material.needsUpdate = true;
    m.userData.hasTexture = false;
  }

  // render one frame of `template` at progress p
  render(template, p) {
    const n = this.activeCount;
    this._visibleMeshes.length = 0;
    // Piece meshes belong to a template/slot cache. Hide the previous frame
    // before revealing the pieces used by this frame, including slots which
    // may no longer be active after the media count changes.
    for (const entry of this._pieceCache.values()) {
      for (const mesh of entry.meshes) mesh.visible = false;
    }
    for (let i = 0; i < this.cards.length; i++) {
      const mesh = this.cards[i];
      if (i >= n) { mesh.visible = false; continue; }
      if (template.pieces && template.piecePose) {
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
      if (mesh.visible) this._visibleMeshes.push(mesh);
    }
    this.group.rotation.x = THREE.MathUtils.degToRad(this.tilt);
    this._centerCameraOnContent();
  }

  _renderPieces(template, slotIdx, n, p) {
    const key = `${template.id}:${slotIdx}`;
    let entry = this._pieceCache.get(key);
    const { cols, rows } = template.pieces;
    const total = cols * rows;
    if (!entry) {
      entry = { group: new THREE.Group(), meshes: [], texCache: {} };
      for (let j = 0; j < total; j++) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(this.baseGeo, mat);
        entry.meshes.push(mesh);
        entry.group.add(mesh);
      }
      this.group.add(entry.group);
      this._pieceCache.set(key, entry);
    }
    const srcMesh = this.cards[slotIdx];
    const srcTex = srcMesh.userData.hasTexture ? srcMesh.material.map : null;

    for (let j = 0; j < total; j++) {
      const mesh = entry.meshes[j];
      const t = template.piecePose(slotIdx, j, n, p);
      if (!t || (t.o != null && t.o <= 0.005)) { mesh.visible = false; continue; }
      mesh.visible = true;
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
          // Compose piece window with any base cover-crop window (videos
          // carry repeat/offset < 1; images are pre-cropped so base is 1/0).
          const br = srcTex.repeat, bo = srcTex.offset;
          tex.repeat.set(br.x / cols, br.y / rows);
          tex.offset.set(
            bo.x + (j % cols) / cols * br.x,
            bo.y + (1 - (Math.floor(j / cols) + 1) / rows) * br.y,
          );
          tex.userData.srcUuid = srcTex.uuid;
          entry.texCache[j] = tex;
        }
        mesh.material.map = entry.texCache[j];
        mesh.material.color.set(0xffffff);
      } else {
        mesh.material.map = null;
        mesh.material.color.set(SLOT_PALETTE[slotIdx % SLOT_PALETTE.length]);
      }
      mesh.material.needsUpdate = true;
      this._visibleMeshes.push(mesh);
    }
  }

  // Zoom used to keep its camera at world origin. That means asymmetric and
  // moving layouts visibly drifted to one side as the camera moved closer.
  // We keep the camera looking straight ahead, but move its X/Y focal point to
  // the perspective- and opacity-weighted centre of the visible media.
  _centerCameraOnContent() {
    const cameraZ = 7.5 / this.zoom;
    if (!this._visibleMeshes.length) {
      this.camera.position.set(0, 0, cameraZ);
      return;
    }

    this.scene.updateMatrixWorld(true);
    let totalWeight = 0;
    let centerX = 0;
    let centerY = 0;

    for (const mesh of this._visibleMeshes) {
      if (!mesh.visible || mesh.material.opacity <= 0.005) continue;
      mesh.getWorldPosition(this._worldPosition);
      mesh.getWorldScale(this._worldScale);

      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      const area = (box.max.x - box.min.x) * (box.max.y - box.min.y);
      const depth = Math.max(0.25, cameraZ - this._worldPosition.z);
      const weight = area
        * Math.abs(this._worldScale.x * this._worldScale.y)
        * mesh.material.opacity
        / (depth * depth);

      centerX += this._worldPosition.x * weight;
      centerY += this._worldPosition.y * weight;
      totalWeight += weight;
    }

    this.camera.position.set(
      totalWeight ? centerX / totalWeight : 0,
      totalWeight ? centerY / totalWeight : 0,
      cameraZ,
    );
    this.camera.rotation.set(0, 0, 0);
  }

  clearPieces() {
    for (const e of this._pieceCache.values()) {
      for (const tex of Object.values(e.texCache)) tex.dispose();
      e.meshes.forEach(m => m.material.dispose());
      this.group.remove(e.group);
    }
    this._pieceCache.clear();
  }
}

// ---------------------------------------------------------- Compositor ----
const TRANSITION_SHADER = {
  vertex: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragment: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexA;
    uniform sampler2D uTexB;
    uniform float uProgress;   // 0..1
    uniform int uMode;         // 0 crossfade, 1 push, 2 zoom, 3 wipe

    void main() {
      float t = clamp(uProgress, 0.0, 1.0);
      vec2 uv = vUv;

      if (uMode == 0) {            // crossfade
        gl_FragColor = mix(texture2D(uTexA, uv), texture2D(uTexB, uv), smoothstep(0.0, 1.0, t));
        return;
      }
      if (uMode == 1) {            // push left: A slides out left, B slides in from right
        if (uv.x < 1.0 - t) {
          gl_FragColor = texture2D(uTexA, uv + vec2(t, 0.0));
        } else {
          gl_FragColor = texture2D(uTexB, uv - vec2(1.0 - t, 0.0));
        }
        return;
      }
      if (uMode == 2) {            // zoom-through: A zooms into camera, B emerges
        vec2 uvA = (uv - 0.5) * (1.0 + t * 1.6) + 0.5;
        vec2 uvB = (uv - 0.5) * (1.5 - t * 0.5) + 0.5;
        vec4 ca = texture2D(uTexA, uvA);
        vec4 cb = texture2D(uTexB, uvB);
        gl_FragColor = mix(ca, cb, smoothstep(0.3, 0.85, t));
        return;
      }
      if (uMode == 3) {            // diagonal wipe
        float d = (uv.x + uv.y) * 0.5;
        float edge = t * 1.4 - 0.2;
        float m = smoothstep(edge - 0.05, edge + 0.05, d);
        gl_FragColor = mix(texture2D(uTexB, uv), texture2D(uTexA, uv), m);
        return;
      }
      gl_FragColor = texture2D(uTexA, uv);
    }`,
};

export const TRANSITIONS = {
  none: { id: 'none', name: 'None', mode: -1, dur: 0 },
  crossfade: { id: 'crossfade', name: 'Crossfade', mode: 0, dur: 0.8 },
  push: { id: 'push', name: 'Push', mode: 1, dur: 0.8 },
  zoom: { id: 'zoom', name: 'Zoom Through', mode: 2, dur: 1.0 },
  wipe: { id: 'wipe', name: 'Diagonal Wipe', mode: 3, dur: 0.9 },
};

export class IoyEngine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, preserveDrawingBuffer: true, alpha: false,
    });
    this.renderer.setPixelRatio(1); // explicit size control via setSize
    this._geo = roundedPlaneGeo(CARD_W, CARD_H, 0.05);

    this.stageA = new Stage(this._geo);
    this.stageB = new Stage(this._geo);

    // render targets
    this.rtA = null;
    this.rtB = null;
    this._w = 0; this._h = 0;

    // compositor scene: fullscreen triangle
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this._mat = new THREE.ShaderMaterial({
      vertexShader: TRANSITION_SHADER.vertex,
      fragmentShader: TRANSITION_SHADER.fragment,
      uniforms: {
        uTexA: { value: null },
        uTexB: { value: null },
        uProgress: { value: 0 },
        uMode: { value: 0 },
      },
      depthTest: false, depthWrite: false,
    });
    this.compScene = new THREE.Scene();
    this.compScene.add(new THREE.Mesh(quadGeo, this._mat));
    this.compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.aspect = 16 / 9;
  }

  setBackground(hex) {
    this.renderer.setClearColor(new THREE.Color(hex), 1);
    this.stageA.scene.background = new THREE.Color(hex);
    this.stageB.scene.background = new THREE.Color(hex);
  }

  setSize(w, h) {
    if (w === this._w && h === this._h) return;
    this._w = w; this._h = h;
    this.renderer.setSize(w, h, false);
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.rtA?.dispose();
    this.rtB?.dispose();
    this.rtA = new THREE.WebGLRenderTarget(w, h, opts);
    this.rtB = new THREE.WebGLRenderTarget(w, h, opts);
    this.stageA.setAspect(w / h);
    this.stageB.setAspect(w / h);
  }

  // Composite frame: sceneA at progress pA, sceneB at pB, blended by t with transition mode
  renderFrame(tplA, pA, tplB, pB, t, mode) {
    const r = this.renderer;
    if (tplB && t > 0 && t < 1 && mode >= 0) {
      this.stageA.render(tplA, pA);
      this.stageB.render(tplB, pB);
      r.setRenderTarget(this.rtA);
      r.render(this.stageA.scene, this.stageA.camera);
      r.setRenderTarget(this.rtB);
      r.render(this.stageB.scene, this.stageB.camera);
      r.setRenderTarget(null);
      this._mat.uniforms.uTexA.value = this.rtA.texture;
      this._mat.uniforms.uTexB.value = this.rtB.texture;
      this._mat.uniforms.uProgress.value = t;
      this._mat.uniforms.uMode.value = mode;
      r.render(this.compScene, this.compCamera);
    } else {
      this.stageA.render(tplA, pA);
      r.setRenderTarget(null);
      r.render(this.stageA.scene, this.stageA.camera);
    }
  }

  // sync textures to a stage (both stages show the same media)
  setTexture(i, tex) {
    this.stageA.setTexture(i, tex);
    this.stageB.setTexture(i, tex);
  }
  clearTexture(i) {
    this.stageA.clearTexture(i);
    this.stageB.clearTexture(i);
  }
  setSlotCount(n) {
    this.stageA.setSlotCount(n);
    this.stageB.setSlotCount(n);
  }
  clearPieces() {
    this.stageA.clearPieces();
    this.stageB.clearPieces();
  }
  setCamera(zoom, tilt) {
    this.stageA.zoom = this.stageB.zoom = zoom;
    this.stageA.tilt = this.stageB.tilt = tilt;
  }
}

// ---- demo placeholder generator ----
export function makeDemoTexture(i) {
  const w = 640, h = 400;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const hues = [215, 268, 160, 28, 340, 195, 48, 300];
  const hue = hues[i % hues.length];
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue}, 45%, 16%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360}, 50%, 10%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, 0, w, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, k) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(20 + k * 22, 17, 6, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(90, 8, w - 180, 18, 9); ctx.fill();
  ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.85)`;
  ctx.beginPath(); ctx.roundRect(40, 70, w * 0.55, 130, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = 'bold 34px system-ui';
  ctx.fillText(`Showcase ${String(i + 1).padStart(2, '0')}`, 62, 128);
  ctx.font = '16px system-ui';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('images of yours', 62, 158);
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(40 + k * (w - 80) / 3 + k * 8, 230, (w - 100) / 3, 120, 10); ctx.fill();
    ctx.fillStyle = `hsla(${(hue + k * 30) % 360}, 65%, 58%, 0.9)`;
    ctx.beginPath(); ctx.roundRect(56 + k * (w - 80) / 3 + k * 8, 248, 40, 40, 8); ctx.fill();
  }
  return new THREE.CanvasTexture(cv);
}

// resize a media file to a canvas (for video frames / image compression)
export function mediaToCanvas(source, maxW = 1280) {
  const iw = source.videoWidth || source.naturalWidth || source.width;
  const ih = source.videoHeight || source.naturalHeight || source.height;
  const scale = Math.min(1, maxW / iw);
  const cv = document.createElement('canvas');
  cv.width = Math.round(iw * scale);
  cv.height = Math.round(ih * scale);
  cv.getContext('2d').drawImage(source, 0, 0, cv.width, cv.height);
  return cv;
}
