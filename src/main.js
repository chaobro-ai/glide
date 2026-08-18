// Glide — main app
import * as THREE from 'three';
import { Scene, ASPECTS, makeDemoTexture } from './scene.js';
import { TEMPLATES, CATEGORIES, templateById } from './templates.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

// ---------- state ----------
const state = {
  template: TEMPLATES[0],
  slots: 12,
  aspect: '16:9',
  duration: 16,
  playing: true,
  t: 0,
  lastFrame: performance.now(),
  images: {},          // slotIndex -> texture
  keyframes: { zoom: {}, tilt: {} },  // track -> { time: value }
};

const scene = new Scene($('#view'));
scene.setAspect(state.aspect);
scene.ensureCards(state.slots);

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

// ---------- template library UI ----------
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
      b.className = 'tpl-btn' + (t.id === state.template.id ? ' on' : '');
      b.innerHTML = `<span class="tpl-name">${t.name}</span><span class="tpl-slots">${t.slots}</span>`;
      b.onclick = () => selectTemplate(t, b);
      list.appendChild(b);
    }
  }
}

function selectTemplate(t, btn) {
  state.template = t;
  $$('.tpl-btn').forEach(x => x.classList.remove('on'));
  btn.classList.add('on');
  scene.disposePieceGroups();
  const n = Math.max(state.slots, 0);
  if (t.slots && state.slots < Math.min(t.slots, 6)) {
    setSlotCount(Math.min(t.slots, 12));
  }
  state.t = 0;
  toast(`Template: ${t.name}`);
}

// ---------- slots UI ----------
function buildSlots() {
  const wrap = $('#slots');
  wrap.innerHTML = '';
  for (let i = 0; i < state.slots; i++) {
    const div = document.createElement('div');
    div.className = 'slot' + (state.images[i] ? ' filled' : '');
    div.dataset.i = i;
    div.innerHTML = `<span class="slot-no">${i + 1}</span><span class="slot-label">${state.images[i] ? 'Image' : 'Drop or click'}</span>`;
    div.onclick = () => pickImageFor(i);
    div.ondragover = e => e.preventDefault();
    div.ondrop = e => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) loadImageIntoSlot(i, f);
    };
    wrap.appendChild(div);
  }
  $('#slot-count-label').textContent = state.slots;
}

let pickTarget = -1;
function pickImageFor(i) {
  pickTarget = i;
  $('#file-input').click();
}

$('#file-input').onchange = () => {
  const files = [...$('#file-input').files];
  if (!files.length) return;
  if (pickTarget >= 0 && files.length === 1) {
    loadImageIntoSlot(pickTarget, files[0]);
  } else {
    files.slice(0, state.slots).forEach((f, k) => loadImageIntoSlot(k % state.slots, f));
  }
  $('#file-input').value = '';
  pickTarget = -1;
};

function loadImageIntoSlot(i, file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    cv.getContext('2d').drawImage(img, 0, 0);
    const tex = new (window.__THREE__).CanvasTexture(cv);
    if (state.images[i]?.dispose) state.images[i].dispose();
    state.images[i] = tex;
    scene.setTexture(i, tex);
    URL.revokeObjectURL(url);
    buildSlots();
  };
  img.src = url;
}

$('#add-images-btn').onclick = () => { pickTarget = -1; $('#file-input').click(); };
$('#demo-images-btn').onclick = () => {
  for (let i = 0; i < state.slots; i++) {
    if (state.images[i]?.dispose) state.images[i].dispose();
    const tex = makeDemoTexture(i, scene.renderer);
    state.images[i] = tex;
    scene.setTexture(i, tex);
  }
  buildSlots();
  toast('Demo images loaded');
};
$('#clear-images-btn').onclick = () => {
  for (let i = 0; i < state.slots; i++) scene.clearTexture(i);
  state.images = {};
  buildSlots();
};

function setSlotCount(n) {
  n = Math.max(2, Math.min(20, n));
  state.slots = n;
  scene.ensureCards(n);
  // keep textures, clear beyond
  for (let i = 0; i < n; i++) {
    if (state.images[i]) scene.setTexture(i, state.images[i]);
    else scene.clearTexture(i);
  }
  $('#count-val').textContent = n;
  buildSlots();
}
$('#count-dec').onclick = () => setSlotCount(state.slots - 1);
$('#count-inc').onclick = () => setSlotCount(state.slots + 1);

// ---------- aspect ----------
$$('#aspect-btns button').forEach(b => {
  b.onclick = () => {
    $$('#aspect-btns button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    state.aspect = b.dataset.a;
    scene.setAspect(state.aspect);
  };
});

// ---------- settings ----------
$('#duration').oninput = e => {
  state.duration = +e.target.value;
  $('#dur-val').textContent = state.duration;
  $('#scrub').max = state.duration;
  $('#export-dur').textContent = state.duration;
};
$('#kf-zoom').oninput = e => {
  scene.zoom = +e.target.value;
  $('#zoom-val').textContent = (+e.target.value).toFixed(2);
};
$('#kf-tilt').oninput = e => {
  scene.tilt = +e.target.value;
  $('#tilt-val').textContent = `${e.target.value}°`;
};
$('#bg-color').oninput = e => scene.setBackground(e.target.value);

// ---------- keyframes ----------
function addKeyframe(track) {
  const val = track === 'zoom' ? scene.zoom : scene.tilt;
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
    if (track === 'zoom') { scene.zoom = val; $('#kf-zoom').value = val; $('#zoom-val').textContent = val.toFixed(2); }
    else { scene.tilt = val; $('#kf-tilt').value = val; $('#tilt-val').textContent = `${Math.round(val)}°`; }
  }
}

function renderKeyframeLanes() {
  for (const track of ['zoom', 'tilt']) {
    const lane = $(`#kf-lane-${track}`);
    lane.innerHTML = '';
    for (const [k] of Object.entries(state.keyframes[track])) {
      const dot = document.createElement('span');
      dot.className = 'kf-dot';
      dot.style.left = `${(+k / state.duration) * 100}%`;
      dot.title = `${track} @ ${k}s（点击删除）`;
      dot.onclick = () => { delete state.keyframes[track][k]; renderKeyframeLanes(); };
      lane.appendChild(dot);
    }
  }
}

// ---------- transport ----------
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

// ---------- render loop ----------
function frame(now) {
  const dt = Math.min(0.1, (now - state.lastFrame) / 1000);
  state.lastFrame = now;
  if (state.playing && !exporting) {
    state.t = (state.t + dt) % state.duration;
    $('#scrub').value = state.t;
  }
  applyKeyframes(state.t);
  scene.render(state.template, (state.t % state.duration) / state.duration);
  $('#time-readout').textContent = `${state.t.toFixed(1)}s / ${state.duration.toFixed(1)}s`;
  requestAnimationFrame(frame);
}

// ---------- export ----------
let exporting = false;
$('#export-btn').onclick = () => { $('#export-modal').classList.remove('hidden'); };
$('#export-cancel').onclick = () => { if (!exporting) $('#export-modal').classList.add('hidden'); };

$('#export-go').onclick = async () => {
  if (exporting) return;
  exporting = true;
  $('#export-go').disabled = true;
  $('#export-progress-wrap').classList.remove('hidden');

  const fmt = document.querySelector('input[name=fmt]:checked').value;
  // prefer mp4 if supported (H.264 in MediaRecorder)
  const mp4Types = ['video/mp4;codecs=h264', 'video/mp4;codecs=avc1', 'video/mp4'];
  const webmTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const types = fmt === 'mp4' ? [...mp4Types, ...webmTypes] : [...webmTypes, ...mp4Types];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t));
  $('#fmt-note').textContent = mime ? mime : '浏览器不支持所选格式';
  const ext = mime?.startsWith('video/mp4') ? 'mp4' : 'webm';

  const stream = scene.renderer.domElement.captureStream(60);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const wasPlaying = state.playing;
  state.playing = false;
  state.t = 0;

  const durMs = state.duration * 1000;
  const start = performance.now();
  rec.start(200);

  await new Promise(resolve => {
    function tick() {
      const el = performance.now() - start;
      state.t = Math.min(durMs, el) / 1000;
      applyKeyframes(state.t);
      scene.render(state.template, (state.t % state.duration) / state.duration);
      $('#export-progress').style.width = `${Math.min(100, el / durMs * 100)}%`;
      $('#time-readout').textContent = `Recording ${state.t.toFixed(1)}s / ${state.duration.toFixed(1)}s`;
      if (el < durMs) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });

  rec.stop();
  await new Promise(r => rec.onstop = r);

  const blob = new Blob(chunks, { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `glide-${state.template.id}-${Date.now()}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);

  exporting = false;
  $('#export-go').disabled = false;
  state.playing = wasPlaying;
  $('#export-modal').classList.add('hidden');
  $('#export-progress-wrap').classList.add('hidden');
  $('#export-progress').style.width = '0%';
  toast(`Export complete (${ext}, ${(blob.size / 1048576).toFixed(1)} MB)`);
};

// ---------- theme (default light, Apple style) ----------
$('#theme-btn').onclick = () => document.body.classList.toggle('dark');

// ---------- boot ----------
window.__THREE__ = THREE;
buildLibrary();
buildSlots();
// preload demo images so first render isn't empty
$('#demo-images-btn').click();
updatePlayBtn();
requestAnimationFrame(frame);
window.addEventListener('resize', () => scene.resize());
scene.resize();
