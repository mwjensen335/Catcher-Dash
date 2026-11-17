import type { Clip, Shape, Tool } from '../domain/types';
import { drawDemo } from './demoScene';
import { activeNote, drawCaption, drawShape, visibleShapes } from './ink';

export interface EngineState { t: number; duration: number; playing: boolean; pausedOnDrawing: boolean; recording: boolean; recSeconds: number }

interface Els { stage: HTMLDivElement; video: HTMLVideoElement; audio: HTMLAudioElement; demo: HTMLCanvasElement; ink: HTMLCanvasElement }
interface Callbacks {
  onState(s: EngineState): void;
  onShape(s: Shape): void;
  onRecorded(blob: Blob, durationSec: number): void;
}

const REC_W = 1280, REC_H = 720;

/**
 * Owns playback, the drawing layer and review recording for one stage.
 * React feeds it the current clip and tool settings; it reports time/state back.
 */
export class ReviewEngine {
  clip: Clip | null = null;
  tool: Tool | 'none' = 'none';
  color = '#ffd23f';
  pauseOnDraw = true;
  fps = 60;

  private rate = 1;
  private demoT = 0;
  private playing = false;
  private lastT = 0;
  private lastFrame = 0;
  private raf = 0;
  private draft: Shape | null = null;
  private pausedOnDrawing = false;
  private ro: ResizeObserver;
  private rec: { recorder: MediaRecorder; chunks: Blob[]; canvas: HTMLCanvasElement; mic: MediaStream; started: number } | null = null;
  private lastEmit = '';

  constructor(private els: Els, private cb: Callbacks) {
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(els.stage);
    els.ink.addEventListener('pointerdown', this.onDown);
    els.ink.addEventListener('pointermove', this.onMove);
    els.ink.addEventListener('pointerup', this.onUp);
    els.ink.addEventListener('pointercancel', this.onUp);
    els.video.addEventListener('loadedmetadata', this.onMeta);
    this.resize();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.els.ink.removeEventListener('pointerdown', this.onDown);
    this.els.ink.removeEventListener('pointermove', this.onMove);
    this.els.ink.removeEventListener('pointerup', this.onUp);
    this.els.ink.removeEventListener('pointercancel', this.onUp);
    this.els.video.removeEventListener('loadedmetadata', this.onMeta);
    this.stopRecording();
  }

  setClip(c: Clip) {
    const changed = !this.clip || this.clip.id !== c.id;
    const audioChanged = changed || this.clip?.audio !== c.audio;
    this.clip = c;
    if (changed) {
      this.pause();
      this.demoT = 0; this.lastT = 0; this.pausedOnDrawing = false;
      const v = this.els.video;
      if (c.kind === 'video' && c.src) { v.src = c.src; v.currentTime = 0; }
      else { v.removeAttribute('src'); v.load(); }
    }
    if (audioChanged) {
      const a = this.els.audio;
      if (c.audio) a.src = c.audio; else a.removeAttribute('src');
    }
    this.paint();
  }

  /* ---------- playback ---------- */
  duration() {
    if (!this.clip) return 0;
    if (this.clip.kind === 'video') {
      const d = this.els.video.duration;
      return Number.isFinite(d) && d > 0 ? d : this.clip.duration;
    }
    return this.clip.duration;
  }
  now() { return this.clip?.kind === 'video' ? this.els.video.currentTime : this.demoT; }
  isPlaying() { return this.playing; }

  seek(t: number) {
    t = Math.max(0, Math.min(this.duration(), t));
    if (this.clip?.kind === 'video') this.els.video.currentTime = t; else this.demoT = t;
    this.lastT = t;
    if (this.clip?.audio) try { this.els.audio.currentTime = t; } catch { /* not loaded yet */ }
    this.paint();
  }
  step(dir: 1 | -1) { this.pause(); this.seek(this.now() + dir / this.fps); }

  play() {
    if (!this.clip) return;
    if (this.now() >= this.duration() - 0.01) this.seek(0);
    this.playing = true; this.pausedOnDrawing = false;
    if (this.clip.kind === 'video') this.els.video.play().catch(() => {});
    if (this.clip.audio) {
      const a = this.els.audio;
      a.currentTime = this.now(); a.playbackRate = this.rate; a.play().catch(() => {});
    }
    this.lastT = this.now();
  }
  pause() {
    this.playing = false;
    if (!this.els.video.paused) this.els.video.pause();
    if (!this.els.audio.paused) this.els.audio.pause();
  }
  toggle() { this.playing ? this.pause() : this.play(); }
  setRate(r: number) { this.rate = r; this.els.video.playbackRate = r; this.els.audio.playbackRate = r; }

  /* ---------- loop ---------- */
  private tick = (ts: number) => {
    if (this.playing && this.clip) {
      if (this.clip.kind === 'demo') {
        this.demoT += ((ts - this.lastFrame) / 1000) * this.rate;
        if (this.demoT >= this.duration()) { this.demoT = this.duration(); this.pause(); }
      } else if (this.els.video.ended) this.pause();
      const t = this.now();
      if (this.pauseOnDraw) {
        const hit = this.clip.drawings.find((d) => d.t > this.lastT + 1e-4 && d.t <= t);
        if (hit) { this.pause(); this.seek(hit.t); this.pausedOnDrawing = true; }
      }
      this.lastT = this.now();
    }
    this.lastFrame = ts;
    this.paint();
    if (this.rec) this.composite();
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  };

  private emit() {
    const s: EngineState = {
      t: this.now(), duration: this.duration(), playing: this.playing, pausedOnDrawing: this.pausedOnDrawing,
      recording: !!this.rec, recSeconds: this.rec ? Math.floor((performance.now() - this.rec.started) / 1000) : 0,
    };
    const key = `${s.t.toFixed(3)}|${s.duration.toFixed(2)}|${s.playing}|${s.pausedOnDrawing}|${s.recording}|${s.recSeconds}`;
    if (key !== this.lastEmit) { this.lastEmit = key; this.cb.onState(s); }
  }

  /* ---------- drawing ---------- */
  private resize() {
    const r = this.els.stage.getBoundingClientRect(), d = devicePixelRatio || 1;
    for (const c of [this.els.demo, this.els.ink]) { c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d)); }
    this.paint();
  }

  paint() {
    if (!this.clip) return;
    const t = this.now();
    if (this.clip.kind === 'demo') drawDemo(this.els.demo.getContext('2d')!, this.els.demo.width, this.els.demo.height, t, this.clip.area);
    const c = this.els.ink.getContext('2d')!, w = this.els.ink.width, h = this.els.ink.height;
    c.clearRect(0, 0, w, h);
    visibleShapes(this.clip.drawings, t).forEach((s) => drawShape(c, s, w, h));
    if (this.draft) drawShape(c, this.draft, w, h);
  }

  private norm(e: PointerEvent): [number, number] {
    const r = this.els.ink.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }
  private onDown = (e: PointerEvent) => {
    if (this.tool === 'none') return;
    this.pause();
    this.els.ink.setPointerCapture(e.pointerId);
    this.draft = { t: this.now(), tool: this.tool, color: this.color, pts: [this.norm(e)] };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.draft) return;
    const p = this.norm(e);
    if (this.draft.tool === 'pen') this.draft.pts.push(p); else this.draft.pts[1] = p;
    this.paint();
  };
  private onUp = () => {
    if (!this.draft) return;
    const d = this.draft;
    this.draft = null;
    if (d.pts.length > 1) this.cb.onShape(d);
    this.paint();
  };

  /** MediaRecorder webm files often report duration = Infinity; force the browser to find the real end. */
  private onMeta = () => {
    const v = this.els.video;
    if (v.duration === Infinity) {
      const fix = () => { v.removeEventListener('timeupdate', fix); v.currentTime = 0; };
      v.addEventListener('timeupdate', fix);
      v.currentTime = 1e101;
    }
  };

  /* ---------- recording a coach review (screen + voice) ---------- */
  async startRecording() {
    if (this.rec) return;
    const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const canvas = document.createElement('canvas');
    canvas.width = REC_W; canvas.height = REC_H;
    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...mic.getAudioTracks()]);
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const started = performance.now();
    recorder.onstop = () => {
      mic.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      this.cb.onRecorded(blob, (performance.now() - started) / 1000);
    };
    this.rec = { recorder, chunks, canvas, mic, started };
    this.composite();
    recorder.start(250);
  }

  stopRecording() {
    if (!this.rec) return;
    const r = this.rec;
    this.rec = null;
    if (r.recorder.state !== 'inactive') r.recorder.stop();
  }

  private composite() {
    if (!this.rec || !this.clip) return;
    const ctx = this.rec.canvas.getContext('2d')!;
    ctx.fillStyle = '#0b1118'; ctx.fillRect(0, 0, REC_W, REC_H);
    if (this.clip.kind === 'video') {
      const v = this.els.video, vw = v.videoWidth || 16, vh = v.videoHeight || 9;
      const s = Math.min(REC_W / vw, REC_H / vh), dw = vw * s, dh = vh * s;
      if (v.readyState >= 2) ctx.drawImage(v, (REC_W - dw) / 2, (REC_H - dh) / 2, dw, dh);
    } else ctx.drawImage(this.els.demo, 0, 0, REC_W, REC_H);
    ctx.drawImage(this.els.ink, 0, 0, REC_W, REC_H);
    const n = activeNote(this.clip.notes, this.now());
    if (n) drawCaption(ctx, n, REC_W, REC_H);
  }
}
