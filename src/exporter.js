// Images of Yours exporter — WebCodecs offline HD render, with MediaRecorder fallback
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4Target } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmTarget } from 'webm-muxer';

export const webCodecsSupported = () =>
  typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

function pickAvcCodec(w, h) {
  // High profile, level based on resolution@fps
  if (w <= 1280 && h <= 720) return 'avc1.640029';
  if (w <= 1920 && h <= 1080) return 'avc1.640032';
  if (w <= 2560 && h <= 1440) return 'avc1.640033';
  return 'avc1.640034';
}

/**
 * Offline HD export.
 * @param {object} opts
 *  engine        IoyEngine
 *  evaluate(t)   -> {tplA,pA,tplB,pB,transT,mode}
 *  duration      seconds
 *  width, height render resolution
 *  fps
 *  format        'mp4' | 'webm'
 *  bitrate
 *  syncMedia(t)  async — seek video media before each frame
 *  onProgress(0..1)
 */
export async function exportWebCodecs(opts) {
  const { engine, evaluate, duration, width, height, fps, format, bitrate, syncMedia, onProgress } = opts;
  const gl = engine.renderer.getContext();

  const isMp4 = format === 'mp4';
  const muxer = isMp4
    ? new Mp4Muxer({
        target: new Mp4Target(),
        video: { codec: 'avc', width, height },
        fastStart: 'in-memory',
      })
    : new WebmMuxer({
        target: new WebmTarget(),
        video: { codec: 'V_VP9', width, height, frameRate: fps },
        firstTimestampBehavior: 'offset',
      });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e; },
  });

  const codec = isMp4 ? pickAvcCodec(width, height) : 'vp09.00.10.08';
  encoder.configure({
    codec,
    width, height,
    bitrate: bitrate || 12_000_000,
    framerate: fps,
    ...(isMp4 ? {} : { latencyMode: 'quality' }),
  });

  engine.setSize(width, height);
  const pixelBuf = new Uint8Array(width * height * 4);
  const totalFrames = Math.ceil(duration * fps);
  const keyEvery = fps * 2;

  for (let f = 0; f < totalFrames; f++) {
    const t = Math.min(duration - 1e-4, f / fps);
    const fr = evaluate(t);
    if (!fr) break;
    if (syncMedia) await syncMedia(t);

    engine.renderFrame(fr.tplA, fr.pA, fr.tplB, fr.pB, fr.transT, fr.mode);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuf);

    const frame = new VideoFrame(pixelBuf, {
      format: 'RGBA',
      codedWidth: width,
      codedHeight: height,
      timestamp: Math.round((f / fps) * 1e6),
    });
    encoder.encode(frame, { keyFrame: f % keyEvery === 0 });
    frame.close();

    if (f % 2 === 0) {
      onProgress?.(f / totalFrames);
      await new Promise(r => setTimeout(r, 0)); // keep UI alive
    }
    while (encoder.encodeQueueSize > 4) {
      await new Promise(r => setTimeout(r, 5));
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();
  onProgress?.(1);

  const { buffer } = muxer.target;
  return {
    blob: new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' }),
    ext: isMp4 ? 'mp4' : 'webm',
    engine: 'webcodecs',
  };
}

/**
 * MediaRecorder realtime fallback (records the live canvas).
 */
export async function exportRealtime(opts) {
  const { engine, evaluate, duration, fps, syncMedia, onProgress, restoreT, playing } = opts;
  const canvas = engine.renderer.domElement;
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
    .filter(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
  if (!types.length) throw new Error('No supported recording format');
  const mime = types[0];

  const stream = canvas.captureStream(fps || 60);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const durMs = duration * 1000;
  const start = performance.now();
  rec.start(200);

  await new Promise(resolve => {
    function tick() {
      const el = performance.now() - start;
      const t = Math.min(duration - 1e-4, el / 1000);
      const fr = evaluate(t);
      if (fr && syncMedia) syncMedia(t);
      if (fr) engine.renderFrame(fr.tplA, fr.pA, fr.tplB, fr.pB, fr.transT, fr.mode);
      onProgress?.(Math.min(1, el / durMs));
      if (el < durMs) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });

  rec.stop();
  await new Promise(r => rec.onstop = r);
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: mime }), ext, engine: 'mediarecorder' };
}
