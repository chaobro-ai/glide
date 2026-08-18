// Images of Yours — main app (scenes, video media, WebCodecs export, project files)
import * as THREE from 'three';
import { IoyEngine, ASPECTS, TRANSITIONS, makeDemoTexture } from './engine.js';
import { TEMPLATES, CATEGORIES, templateById } from './templates.js';
import { Timeline } from './timeline.js';
import { exportWebCodecs, exportRealtime, webCodecsSupported } from './exporter.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ------------------------------------------------------------ state ----
const state = {
  title: 'Untitled showcase',
  scenes: [
    { id: 'sc1', templateId: TEMPLATES[0].id, duration: 8, transitionOut: 'crossfade' },
  ],
  aspect: '16:9',
  slots: 12,
  background: '#0b0d12',
  media: {},                       // slot -> {type:'image'|'video', texture, url?, el?}
  keyframes: { zoom: {}, tilt: {} },
  playing: true,
  t: 0,
  selectedScene: 0,
  zoom: 1,
  tilt: 0,
};

const timeline = new Timeline();
const engine = new IoyEngine($('#view'));
engine.setBackground(state.background);
engine.setSlotCount(state.slots);

function rebuildTimeline() {
  timeline.setScenes(state.scenes);
  const total = Math.max(1, timeline.total());
  $('#scrub').max = total;
  $('#time-readout').textContent = `${state.t.toFixed(1)}s / ${total.toFixed(1)}s`;
  renderSceneBar();
}

// ------------------------------------------------------------ toast ----
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ------------------------------------------------------------ library ----
function buildLibrary() {
  const list = $('#tpl-list');
  list.innerHTML = '';
  $('#tpl-count').textContent = `· ${TEMPLATES.length}`;
  for (const cat of CATEGORIES) {
    const items = TEMPLATES.filter(t => t.cat === cat);
    const head = document.createElement('div');
    head.className = 'cat-head';
    head.textContent = `${cat} · ${items.length}`;
    list.appendChild(head);
    for (const t of items) {
      const b = document.createElement('button');
      b.className = 'tpl-btn';
      b.dataset.id = t.id;
      b.innerHTML = `<span class="tpl-name">${t.name}</span><span class="tpl-slots">${t.slots}</span>`;
      b.onclick = () => applyTemplateToSelected(t.id);
      list.appendChild(b);
    }
  }
  highlightActiveTemplate();
}

function highlightActiveTemplate() {
  const sc = state.scenes[state.selectedScene];
  $$('.tpl-btn').forEach(b => b.classList.toggle('on', sc && b.dataset.id === sc.templateId));
}

function applyTemplateToSelected(templateId) {
  const sc = state.scenes[state.selectedScene];
  if (!sc) return;
  engine.clearPieces();
  sc.templateId = templateId;
  const tpl = templateById(templateId);
  if (tpl && state.slots < Math.min(tpl.slots, 6)) setSlotCount(Math.min(tpl.slots, 12));
  rebuildTimeline();
  highlightActiveTemplate();
  toast(`Scene ${state.selectedScene + 1}: ${tpl?.name || templateId}`);
}

// ------------------------------------------------------------ scene bar ----
function renderSceneBar() {
  const bar = $('#scene-bar');
  bar.innerHTML = '';
  state.scenes.forEach((sc, i) => {
    const tpl = templateById(sc.templateId);
    const chip = document.createElement('div');
    chip.className = 'scene-chip' + (i === state.selectedScene ? ' selected' : '');
    chip.innerHTML = `
      <span class="sc-no">${i + 1}</span>
      <span class="sc-name">${tpl?.name || '?'}</span>
      <span class="sc-dur">${sc.duration}s</span>
      ${i < state.scenes.length - 1 ? `<span class="sc-trans">→ ${TRANSITIONS[sc.transitionOut]?.name || 'None'}</span>` : ''}
      ${state.scenes.length > 1 ? '<button class="sc-del" title="Remove scene">✕</button>' : ''}`;
    chip.onclick = (e) => {
      if (e.target.classList.contains('sc-del')) {
        removeScene(i);
        return;
      }
      state.selectedScene = i;
      renderSceneBar();
      highlightActiveTemplate();
      syncInspectorToScene();
    };
    bar.appendChild(chip);
  });
  const add = document.createElement('button');
  add.className = 'scene-add';
  add.textContent = '+';
  add.title = 'Add scene (duplicates current)';
  add.onclick = addScene;
  bar.appendChild(add);
}

function addScene() {
  const src = state.scenes[state.selectedScene] || state.scenes[0];
  state.scenes.push({
    id: 'sc' + Date.now(),
    templateId: src.templateId,
    duration: src.duration,
    transitionOut: 'crossfade',
  });
  state.selectedScene = state.scenes.length - 1;
  rebuildTimeline();
  highlightActiveTemplate();
  syncInspectorToScene();
}

function removeScene(i) {
  if (state.scenes.length <= 1) return;
  state.scenes.splice(i, 1);
  state.selectedScene = Math.min(state.selectedScene, state.scenes.length - 1);
  rebuildTimeline();
  highlightActiveTemplate();
  syncInspectorToScene();
}

function syncInspectorToScene() {
  const sc = state.scenes[state.selectedScene];
  if (!sc) return;
  $('#scene-duration').value = sc.duration;
  $('#scene-dur-val').textContent = sc.duration;
  $('#scene-transition').value = sc.transitionOut;
}

$('#scene-duration').oninput = e => {
  const sc = state.scenes[state.selectedScene];
  if (!sc) return;
  sc.duration = +e.target.value;
  $('#scene-dur-val').textContent = sc.duration;
  rebuildTimeline();
};
$('#scene-transition').onchange = e => {
  const sc = state.scenes[state.selectedScene];
  if (!sc) return;
  sc.transitionOut = e.target.value;
  rebuildTimeline();
};

// ------------------------------------------------------------ media ----
function buildSlots() {
  const wrap = $('#slots');
  wrap.innerHTML = '';
  for (let i = 0; i < state.slots; i++) {
    const m = state.media[i];
    const div = document.createElement('div');
    div.className = 'slot' + (m ? ' filled' : '');
    div.innerHTML = `<span class="slot-no">${i + 1}</span><span class="slot-label">${m ? (m.type === 'video' ? '▶ Video' : 'Image') : 'Drop or click'}</span>`;
    div.onclick = () => pickMediaFor(i);
    div.ondragover = e => e.preventDefault();
    div.ondrop = e => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) loadMediaIntoSlot(i, f);
    };
    wrap.appendChild(div);
  }
  $('#slot-count-label').textContent = state.slots;
}

let pickTarget = -1;
function pickMediaFor(i) { pickTarget = i; $('#file-input').click(); }

$('#file-input').onchange = () => {
  const files = [...$('#file-input').files];
  if (!files.length) return;
  if (pickTarget >= 0 && files.length === 1) loadMediaIntoSlot(pickTarget, files[0]);
  else files.slice(0, state.slots).forEach((f, k) => loadMediaIntoSlot(k % state.slots, f));
  $('#file-input').value = '';
  pickTarget = -1;
};

function disposeMedia(i) {
  const m = state.media[i];
  if (!m) return;
  m.texture?.dispose?.();
  if (m.el) { m.el.pause(); m.el.src = ''; m.el = null; }
  if (m.url?.startsWith('blob:')) URL.revokeObjectURL(m.url);
  delete state.media[i];
}

function loadMediaIntoSlot(i, file) {
  disposeMedia(i);
  if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.crossOrigin = 'anonymous';
    v.addEventListener('loadeddata', () => {
      v.play().catch(() => {});
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      state.media[i] = { type: 'video', texture: tex, url, el: v, name: file.name };
      engine.setTexture(i, tex);
      buildSlots();
    }, { once: true });
    v.load();
  } else if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      const scale = Math.min(1, 1280 / img.width);
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      state.media[i] = { type: 'image', texture: tex, url, name: file.name };
      engine.setTexture(i, tex);
      URL.revokeObjectURL(url);
      state.media[i].url = null;
      buildSlots();
    };
    img.src = url;
  }
}

$('#add-images-btn').onclick = () => { pickTarget = -1; $('#file-input').click(); };
$('#demo-images-btn').onclick = () => {
  for (let i = 0; i < state.slots; i++) {
    disposeMedia(i);
    const tex = makeDemoTexture(i);
    state.media[i] = { type: 'image', texture: tex };
    engine.setTexture(i, tex);
  }
  buildSlots();
  toast('Demo media loaded');
};
$('#clear-images-btn').onclick = () => {
  for (let i = 0; i < state.slots; i++) { disposeMedia(i); engine.clearTexture(i); }
  buildSlots();
};

function setSlotCount(n) {
  n = Math.max(2, Math.min(20, n));
  state.slots = n;
  engine.setSlotCount(n);
  for (let i = 0; i < n; i++) {
    if (state.media[i]) engine.setTexture(i, state.media[i].texture);
    else engine.clearTexture(i);
  }
  $('#count-val').textContent = n;
  buildSlots();
}
$('#count-dec').onclick = () => setSlotCount(state.slots - 1);
$('#count-inc').onclick = () => setSlotCount(state.slots + 1);

// ------------------------------------------------------------ settings ----
$$('#aspect-btns button').forEach(b => {
  b.onclick = () => {
    $$('#aspect-btns button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state.aspect = b.dataset.a;
    resizePreview();
  };
});
$('#bg-color').oninput = e => { state.background = e.target.value; engine.setBackground(e.target.value); };
$('#kf-zoom').oninput = e => {
  state.zoom = +e.target.value;
  $('#zoom-val').textContent = state.zoom.toFixed(2);
  engine.setCamera(state.zoom, state.tilt);
};
$('#kf-tilt').oninput = e => {
  state.tilt = +e.target.value;
  $('#tilt-val').textContent = `${e.target.value}°`;
  engine.setCamera(state.zoom, state.tilt);
};

// ------------------------------------------------------------ keyframes ----
function addKeyframe(track) {
  const val = track === 'zoom' ? state.zoom : state.tilt;
  state.keyframes[track][state.t.toFixed(2)] = val;
  renderKeyframeLanes();
  toast(`${track} keyframe @ ${state.t.toFixed(1)}s`);
}
$$('.kf-add').forEach(b => b.onclick = () => addKeyframe(b.dataset.track));

function applyKeyframes(t) {
  for (const track of ['zoom', 'tilt']) {
    const kfs = Object.entries(state.keyframes[track]).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]);
    if (!kfs.length) continue;
    let val;
    if (t <= kfs[0][0]) val = kfs[0][1];
    else if (t >= kfs[kfs.length - 1][0]) val = kfs[kfs.length - 1][1];
    else {
      let j = 0;
      while (j < kfs.length - 1 && kfs[j + 1][0] < t) j++;
      const [t0, v0] = kfs[j], [t1, v1] = kfs[j + 1];
      const u = (t - t0) / (t1 - t0);
      val = v0 + (v1 - v0) * (u * u * (3 - 2 * u));
    }
    if (track === 'zoom') { state.zoom = val; $('#kf-zoom').value = val; $('#zoom-val').textContent = val.toFixed(2); }
    else { state.tilt = val; $('#kf-tilt').value = val; $('#tilt-val').textContent = `${Math.round(val)}°`; }
  }
  engine.setCamera(state.zoom, state.tilt);
}

function renderKeyframeLanes() {
  const total = Math.max(1, timeline.total());
  for (const track of ['zoom', 'tilt']) {
    const lane = $(`#kf-lane-${track}`);
    lane.innerHTML = '';
    for (const k of Object.keys(state.keyframes[track])) {
      const dot = document.createElement('span');
      dot.className = 'kf-dot';
      dot.style.left = `${(+k / total) * 100}%`;
      dot.title = `${track} @ ${k}s (click to remove)`;
      dot.onclick = () => { delete state.keyframes[track][k]; renderKeyframeLanes(); };
      lane.appendChild(dot);
    }
  }
}

// ------------------------------------------------------------ transport ----
$('#play-btn').onclick = togglePlay;
$('#restart-btn').onclick = () => { state.t = 0; };
$('#scrub').oninput = e => { state.t = +e.target.value; state.playing = false; updatePlayBtn(); };

function togglePlay() { state.playing = !state.playing; updatePlayBtn(); }
function updatePlayBtn() {
  $('#play-btn').innerHTML = state.playing
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}
window.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); togglePlay(); }
});

// video media sync: seek videos to the correct loop position for time t
async function syncMedia(t) {
  const hasVideo = Object.values(state.media).some(m => m.type === 'video');
  if (!hasVideo) return;
  const idx = timeline.sceneIndexAt(t);
  const seg = timeline.segs[idx];
  const local = t - seg.start;
  for (const m of Object.values(state.media)) {
    if (m.type !== 'video' || !m.el) continue;
    const d = m.el.duration;
    if (!d || !isFinite(d)) continue;
    const vt = local % d;
    if (Math.abs(m.el.currentTime - vt) > 0.04) {
      await new Promise(res => {
        const to = setTimeout(res, 120);
        m.el.addEventListener('seeked', () => { clearTimeout(to); res(); }, { once: true });
        m.el.currentTime = vt;
      });
    }
  }
}

// ------------------------------------------------------------ preview ----
function resizePreview() {
  const wrap = $('#canvas-wrap');
  const [aw, ah] = ASPECTS[state.aspect] || [16, 9];
  const availW = Math.max(4, wrap.clientWidth - 48);
  const availH = Math.max(4, wrap.clientHeight - 48);
  let w = availW, h = availW * ah / aw;
  if (h > availH) { h = availH; w = availH * aw / ah; }
  w = Math.min(Math.floor(w), 1280);
  h = Math.floor(w * ah / aw);
  engine.setSize(w, h);
  const cv = engine.renderer.domElement;
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
}

let exporting = false;
let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const total = timeline.total();
  if (state.playing && !exporting) {
    state.t = (state.t + dt) % total;
    $('#scrub').value = state.t;
  }
  applyKeyframes(state.t);
  const fr = timeline.evaluate(state.t % total);
  if (fr) engine.renderFrame(fr.tplA, fr.pA, fr.tplB, fr.pB, fr.transT, fr.mode);
  $('#time-readout').textContent = `${state.t.toFixed(1)}s / ${total.toFixed(1)}s`;
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ export ----
$('#export-btn').onclick = () => {
  $('#export-dur').textContent = timeline.total().toFixed(1);
  const sup = webCodecsSupported();
  $('#engine-note').textContent = sup
    ? 'WebCodecs available — offline HD render'
    : 'WebCodecs unavailable — falling back to realtime recording';
  $('#export-modal').classList.remove('hidden');
};
$('#export-cancel').onclick = () => { if (!exporting) $('#export-modal').classList.add('hidden'); };

$('#export-go').onclick = async () => {
  if (exporting) return;
  exporting = true;
  $('#export-go').disabled = true;
  $('#export-progress-wrap').classList.remove('hidden');
  const wasPlaying = state.playing;
  state.playing = false;
  state.t = 0;

  const format = document.querySelector('input[name=fmt]:checked').value;
  const fps = +$('#export-fps').value;
  const [aw, ah] = ASPECTS[state.aspect];
  const resScale = { '720p': 720, '1080p': 1080, '1440p': 1440 }[$('#export-res').value];
  let height = resScale, width = Math.round(resScale * aw / ah);
  if (aw < ah) { width = resScale; height = Math.round(resScale * ah / aw); }
  width -= width % 2; height -= height % 2;
  const bitrate = Math.round(width * height * fps * 0.14);

  const duration = timeline.total();
  const evaluate = t => timeline.evaluate(t);
  const onProgress = p => {
    $('#export-progress').style.width = `${(p * 100).toFixed(1)}%`;
    $('#export-status').textContent = `Rendering ${(p * duration).toFixed(1)}s / ${duration.toFixed(1)}s @ ${width}×${height}`;
  };

  let result;
  try {
    if (webCodecsSupported()) {
      result = await exportWebCodecs({ engine, evaluate, duration, width, height, fps, format, bitrate, syncMedia, onProgress });
    } else {
      result = await exportRealtime({ engine, evaluate, duration, fps: 60, syncMedia, onProgress });
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(result.blob);
    a.download = `ioy-${Date.now()}.${result.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    toast(`Export complete — ${result.ext.toUpperCase()}, ${width}×${height}@${fps}fps, ${(result.blob.size / 1048576).toFixed(1)} MB (${result.engine})`);
  } catch (e) {
    console.error(e);
    toast(`Export failed: ${e.message || e}`);
  }

  exporting = false;
  $('#export-go').disabled = false;
  $('#export-modal').classList.add('hidden');
  $('#export-progress-wrap').classList.add('hidden');
  $('#export-progress').style.width = '0%';
  $('#export-status').textContent = '';
  state.playing = wasPlaying;
  resizePreview();
  updatePlayBtn();
};

// ------------------------------------------------------------ project files (.ioy) ----
const canvasToDataURL = (img, type = 'image/png') => {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  cv.getContext('2d').drawImage(img, 0, 0);
  return cv.toDataURL(type);
};

async function saveProject() {
  const slots = [];
  for (let i = 0; i < state.slots; i++) {
    const m = state.media[i];
    if (!m) { slots.push(null); continue; }
    if (m.type === 'image') {
      const img = m.texture.image;
      slots.push({ type: 'image', data: canvasToDataURL(img) });
    } else if (m.type === 'video' && m.el) {
      // embed video only if reasonably small (<= 6MB source)
      try {
        const blob = await (m.url ? fetch(m.url).then(r => r.blob()) : null);
        if (blob && blob.size <= 6 * 1024 * 1024) {
          const b64 = await new Promise(res => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.readAsDataURL(blob);
          });
          slots.push({ type: 'video', data: b64, name: m.name });
        } else {
          slots.push({ type: 'video', data: null, name: m.name });
        }
      } catch {
        slots.push({ type: 'video', data: null, name: m.name });
      }
    }
  }
  const project = {
    version: 1, app: 'ioy', savedAt: new Date().toISOString(),
    title: state.title,
    settings: { aspect: state.aspect, background: state.background, slots: state.slots },
    scenes: state.scenes,
    keyframes: state.keyframes,
    slots,
  };
  const json = JSON.stringify(project);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(state.title || 'ioy-project').replace(/\s+/g, '-').toLowerCase()}.ioy`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  const skipped = slots.filter(s => s?.type === 'video' && !s.data).length;
  toast(skipped ? `Project saved (video "${skipped > 1 ? skipped + ' videos' : slots.find(s => s?.type === 'video' && !s.data)?.name}" too large to embed)` : 'Project saved');
}

async function openProjectFile(file) {
  try {
    const project = JSON.parse(await file.text());
    if (!['ioy', 'glide'].includes(project.app) || !project.version) throw new Error('Not an Images of Yours project');
    // reset media
    for (let i = 0; i < state.slots; i++) disposeMedia(i);
    state.media = {};
    state.title = project.title || 'Untitled showcase';
    $('#proj-title').value = state.title;
    state.aspect = project.settings?.aspect || '16:9';
    state.background = project.settings?.background || '#0b0d12';
    state.slots = project.settings?.slots || 12;
    state.scenes = project.scenes || state.scenes;
    state.keyframes = project.keyframes || { zoom: {}, tilt: {} };
    state.selectedScene = 0;
    state.t = 0;

    // settings UI
    $$('#aspect-btns button').forEach(b => b.classList.toggle('on', b.dataset.a === state.aspect));
    $('#bg-color').value = state.background;
    engine.setBackground(state.background);
    $('#count-val').textContent = state.slots;
    engine.setSlotCount(state.slots);

    // media
    const slots = project.slots || [];
    for (let i = 0; i < Math.min(slots.length, state.slots); i++) {
      const s = slots[i];
      if (!s) continue;
      if (s.type === 'image' && s.data) {
        const img = new Image();
        img.onload = () => {
          const tex = new THREE.CanvasTexture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          state.media[i] = { type: 'image', texture: tex };
          engine.setTexture(i, tex);
          buildSlots();
        };
        img.src = s.data;
      } else if (s.type === 'video' && s.data) {
        const v = document.createElement('video');
        v.src = s.data; v.muted = true; v.loop = true; v.playsInline = true;
        v.addEventListener('loadeddata', () => {
          v.play().catch(() => {});
          const tex = new THREE.VideoTexture(v);
          tex.colorSpace = THREE.SRGBColorSpace;
          state.media[i] = { type: 'video', texture: tex, el: v, name: s.name };
          engine.setTexture(i, tex);
          buildSlots();
        }, { once: true });
        v.load();
      }
    }
    rebuildTimeline();
    highlightActiveTemplate();
    syncInspectorToScene();
    renderKeyframeLanes();
    buildSlots();
    resizePreview();
    toast('Project loaded');
  } catch (e) {
    toast(`Open failed: ${e.message}`);
  }
}

$('#save-project-btn').onclick = saveProject;
$('#open-project-btn').onclick = () => $('#project-file-input').click();
$('#project-file-input').onchange = () => {
  const f = $('#project-file-input').files[0];
  if (f) openProjectFile(f);
  $('#project-file-input').value = '';
};
$('#new-project-btn').onclick = () => {
  if (!confirm('Start a new project? Unsaved changes will be lost.')) return;
  for (let i = 0; i < state.slots; i++) disposeMedia(i);
  state.media = {};
  state.scenes = [{ id: 'sc1', templateId: TEMPLATES[0].id, duration: 8, transitionOut: 'crossfade' }];
  state.selectedScene = 0;
  state.keyframes = { zoom: {}, tilt: {} };
  state.t = 0;
  state.title = 'Untitled showcase';
  $('#proj-title').value = state.title;
  rebuildTimeline();
  highlightActiveTemplate();
  syncInspectorToScene();
  renderKeyframeLanes();
  buildSlots();
  toast('New project');
};
$('#proj-title').onchange = e => { state.title = e.target.value.trim() || 'Untitled showcase'; };

// ------------------------------------------------------------ splash ----
const splash = $('#splash');
function dismissSplash() {
  if (!splash || splash.classList.contains('gone')) return;
  splash.classList.add('gone');
  setTimeout(() => splash.remove(), 600);
}
splash?.addEventListener('click', dismissSplash);
window.addEventListener('keydown', dismissSplash, { once: true });
// auto-dismiss after 2.8s so the app is never blocked
setTimeout(dismissSplash, 2800);

// ------------------------------------------------------------ theme ----
$('#theme-btn').onclick = () => document.body.classList.toggle('dark');

// ------------------------------------------------------------ boot ----
buildLibrary();
buildSlots();
rebuildTimeline();
syncInspectorToScene();
renderKeyframeLanes();
$('#demo-images-btn').click();
updatePlayBtn();
resizePreview();
window.addEventListener('resize', resizePreview);
requestAnimationFrame(frame);
