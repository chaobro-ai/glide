const root = document.querySelector('[data-template-preview]');
if (root) {
  const canvas = root.querySelector('#template-preview-canvas');
  const canvasWrap = root.querySelector('.preview-canvas-wrap');
  const status = root.querySelector('.preview-status');
  const playButton = root.querySelector('[data-preview-toggle]');
  const openEditorLink = root.querySelector('[data-preview-open-editor]');
  const templateButtons = [...root.querySelectorAll('[data-preview-template]')];
  const fallback = root.querySelector('.preview-fallback');
  const imageSources = [
    '/gallery/travel/01.jpg',
    '/gallery/product/03.jpg',
    '/gallery/art/03.jpg',
    '/gallery/architecture/02.jpg',
    '/gallery/portrait/03.jpg',
    '/gallery/nature/02.jpg',
  ];
  const labels = {
    'showcase-stream': 'SHOWCASE STREAM',
    'grid-reveal': 'GRID REVEAL',
    'cover-flow': 'COVER FLOW',
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let engine;
  let IoyEngine;
  let fitCoverToCard;
  let templateById;
  let THREE;
  let activeTemplate;
  let selectedTemplateId = 'showcase-stream';
  let paused = reducedMotion;
  let visible = false;
  let loaded = false;
  let initialized = false;
  let startTime = performance.now();
  const track = (...args) => window.ioyTrack?.(...args);

  const updatePlaybackUi = () => {
    playButton.textContent = paused ? 'Play motion' : 'Pause motion';
    playButton.setAttribute('aria-pressed', String(paused));
  };

  const loadImage = source => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });

  const resize = () => {
    if (!engine) return;
    const width = Math.max(320, Math.round(canvasWrap.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5)));
    engine.setSize(width, Math.round(width * 9 / 16));
  };

  const selectTemplate = id => {
    selectedTemplateId = id;
    const next = templateById?.(id);
    if (next) activeTemplate = next;
    startTime = performance.now();
    status.textContent = `${labels[id] || next?.name?.toUpperCase() || id.toUpperCase()} / 06 IMAGES`;
    openEditorLink.href = `/create/?template=${encodeURIComponent(id)}`;
    templateButtons.forEach(button => {
      const selected = button.dataset.previewTemplate === id;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    track('template_preview_select', { template_id: id });
  };

  const frame = now => {
    if (loaded && activeTemplate && visible && !paused && !document.hidden) {
      const progress = ((now - startTime) / 9000) % 1;
      engine.renderFrame(activeTemplate, progress, null, 0, 0, -1);
    }
    requestAnimationFrame(frame);
  };

  const initialize = async () => {
    if (initialized) return;
    initialized = true;
    try {
      const [engineModule, templatesModule, threeModule] = await Promise.all([
        import('./engine.js'),
        import('./templates.js'),
        import('three'),
      ]);
      ({ IoyEngine, fitCoverToCard } = engineModule);
      ({ templateById } = templatesModule);
      THREE = threeModule;
      activeTemplate = templateById(selectedTemplateId);
      engine = new IoyEngine(canvas);
      engine.setBackground('#111018');
      engine.setSlotCount(imageSources.length);
      resize();
      new ResizeObserver(resize).observe(canvasWrap);

      Promise.all(imageSources.map(loadImage)).then(images => {
        images.forEach((image, index) => {
          const texture = new THREE.CanvasTexture(fitCoverToCard(image, 1280));
          texture.colorSpace = THREE.SRGBColorSpace;
          engine.setTexture(index, texture);
        });
        loaded = true;
        fallback.hidden = true;
        canvasWrap.classList.add('is-ready');
        engine.renderFrame(activeTemplate, 0, null, 0, 0, -1);
      }).catch(() => {
        fallback.textContent = 'The live preview could not load. Open the editor to try the template with your own media.';
      });
    } catch {
      fallback.textContent = 'A browser with WebGL is required for the live preview. Open the editor to try the template.';
    }
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) initialize();
  }, { rootMargin: '180px 0px', threshold: 0.01 }).observe(root);

  templateButtons.forEach(button => button.addEventListener('click', () => selectTemplate(button.dataset.previewTemplate)));
  playButton.addEventListener('click', () => {
    paused = !paused;
    updatePlaybackUi();
    track(paused ? 'template_preview_pause' : 'template_preview_play', { template_id: selectedTemplateId });
  });
  updatePlaybackUi();
  requestAnimationFrame(frame);
}
