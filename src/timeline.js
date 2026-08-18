// Glide timeline — evaluates multi-scene timeline with overlapping transitions
import { TRANSITIONS } from './engine.js';
import { templateById } from './templates.js';

export class Timeline {
  constructor() {
    this.scenes = [];      // {id, templateId, duration, transitionOut}
    this.segs = [];        // computed {scene, template, start, end, overlapWithNext}
    this._total = 0;
  }

  setScenes(scenes) {
    this.scenes = scenes;
    this.segs = [];
    let cursor = 0;
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      const template = templateById(sc.templateId) || null;
      // overlap with next scene = transition duration (clamped to half of either scene)
      let overlap = 0;
      if (i < scenes.length - 1) {
        const tr = TRANSITIONS[sc.transitionOut] || TRANSITIONS.none;
        const nextDur = scenes[i + 1].duration;
        overlap = Math.min(tr.dur, sc.duration * 0.5, nextDur * 0.5);
      }
      this.segs.push({ scene: sc, template, start: cursor, dur: sc.duration, overlap });
      cursor += sc.duration - overlap;
    }
    this._total = cursor;
  }

  total() { return this._total; }

  // returns {tplA, pA, tplB, pB, transT, mode} for global time t
  evaluate(t) {
    const segs = this.segs;
    if (!segs.length) return null;
    t = Math.max(0, Math.min(t, this._total - 0.0001));

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const segEnd = seg.start + seg.dur;
      if (t < segEnd || i === segs.length - 1) {
        const pA = Math.min(1, (t - seg.start) / seg.dur);
        // are we inside the overlap with the next scene?
        if (seg.overlap > 0 && t >= segEnd - seg.overlap && i < segs.length - 1) {
          const next = segs[i + 1];
          const transT = (t - (segEnd - seg.overlap)) / seg.overlap;
          const pB = Math.min(1, (t - next.start) / next.dur);
          const tr = TRANSITIONS[seg.scene.transitionOut] || TRANSITIONS.none;
          return {
            tplA: seg.template, pA,
            tplB: next.template, pB,
            transT, mode: tr.mode,
          };
        }
        return { tplA: seg.template, pA, tplB: null, pB: 0, transT: 0, mode: -1 };
      }
    }
    return null;
  }

  // which scene index is "active" at time t (for UI highlighting)
  sceneIndexAt(t) {
    for (let i = 0; i < this.segs.length; i++) {
      const seg = this.segs[i];
      if (t < seg.start + seg.dur - seg.overlap) return i;
    }
    return this.segs.length - 1;
  }
}
