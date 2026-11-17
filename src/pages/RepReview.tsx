import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../data/store';
import { SAMPLE_CATCHERS } from '../data/sample';
import { RUBRIC } from '../domain/rubrics';
import { timingOf } from '../domain/timing';
import { AREAS, NOTE_LABEL, type Area, type Clip, type NoteKind, type Timing, type Tool } from '../domain/types';
import { fmt, newId, today } from '../lib/format';
import { ReviewEngine, type EngineState } from '../review/engine';
import { activeNote } from '../review/ink';
import { Icon } from '../components/Icon';

const COLORS = [
  { c: '#ffd23f', name: 'Yellow' }, { c: '#ff5a5f', name: 'Red' }, { c: '#4ade80', name: 'Green' }, { c: '#ffffff', name: 'White' },
];
const TOOLS: { t: Tool | 'none'; label: string }[] = [
  { t: 'none', label: 'View' }, { t: 'pen', label: 'Pen' }, { t: 'arrow', label: 'Arrow' }, { t: 'circle', label: 'Circle' }, { t: 'angle', label: 'Angle' },
];
const canRecord = typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;

export default function RepReview() {
  const { clips, addClip, updateClip } = useStore();
  const [params, setParams] = useSearchParams();
  const clip = clips.find((c) => c.id === params.get('clip')) ?? clips[0];
  const setClipId = (id: string) => setParams({ clip: id }, { replace: true });

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const demoRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReviewEngine | null>(null);
  const clipRef = useRef(clip);
  clipRef.current = clip;
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;

  const [st, setSt] = useState<EngineState>({ t: 0, duration: 0, playing: false, pausedOnDrawing: false, recording: false, recSeconds: 0 });
  const [rate, setRate] = useState(1);
  const [fps, setFps] = useState(60);
  const [tool, setTool] = useState<Tool | 'none'>('none');
  const [color, setColor] = useState(COLORS[0].c);
  const [pauseOnDraw, setPauseOnDraw] = useState(true);
  const [noteKind, setNoteKind] = useState<NoteKind>('good');
  const [noteText, setNoteText] = useState('');
  const [recError, setRecError] = useState('');

  // upload form
  const [upCatcher, setUpCatcher] = useState(SAMPLE_CATCHERS[0]);
  const [upArea, setUpArea] = useState<Area>('Receiving');
  const [upBy, setUpBy] = useState<'Catcher' | 'Coach'>('Catcher');
  const [upDrill, setUpDrill] = useState('');

  useEffect(() => {
    const e = new ReviewEngine(
      { stage: stageRef.current!, video: videoRef.current!, audio: audioRef.current!, demo: demoRef.current!, ink: inkRef.current! },
      {
        onState: setSt,
        onShape: (s) => updateClip(clipRef.current.id, (c) => ({ ...c, drawings: [...c.drawings, s] })),
        onRecorded: (blob, sec) => {
          const src = clipRef.current;
          const review: Clip = {
            id: newId(), title: `Coach review · ${src.title}`, catcher: src.catcher, area: src.area, by: 'Coach', date: today(),
            kind: 'video', src: URL.createObjectURL(blob), duration: sec, notes: [], drawings: [], timing: {}, scores: {}, audio: null, reviewOf: src.id,
          };
          addClip(review);
          setParamsRef.current({ clip: review.id }, { replace: true });
        },
      },
    );
    engine.current = e;
    e.setClip(clipRef.current);
    return () => e.destroy();
  }, [addClip, updateClip]);

  useEffect(() => { engine.current?.setClip(clip); }, [clip]);
  useEffect(() => { if (engine.current) { engine.current.tool = tool; engine.current.color = color; engine.current.pauseOnDraw = pauseOnDraw; engine.current.fps = fps; } }, [tool, color, pauseOnDraw, fps]);
  useEffect(() => { engine.current?.setRate(rate); }, [rate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|SELECT|TEXTAREA/.test(el.tagName)) return;
      const en = engine.current; if (!en) return;
      if (e.key === ' ') { e.preventDefault(); en.toggle(); }
      if (e.key === ',' || e.key === 'ArrowLeft') { e.preventDefault(); en.step(-1); }
      if (e.key === '.' || e.key === 'ArrowRight') { e.preventDefault(); en.step(1); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const D = st.duration || 1;
  const caption = activeNote(clip.notes, st.t);
  const tm = timingOf(clip);
  const crit = RUBRIC[clip.area];
  const scored = crit.map((_, i) => clip.scores[i]).filter(Boolean);
  const avg = scored.length ? (scored.reduce((a, b) => a + b, 0) / scored.length).toFixed(1) : '—';

  const pinNote = (text: string, k: NoteKind, t: number) => {
    text = text.trim(); if (!text) return;
    updateClip(clip.id, (c) => ({ ...c, notes: [...c.notes, { t, k, text }].sort((a, b) => a.t - b.t) }));
  };
  const mark = (k: keyof Timing) => { engine.current?.pause(); const t = engine.current?.now() ?? 0; updateClip(clip.id, (c) => ({ ...c, timing: { ...c.timing, [k]: t } })); };

  const onUpload = (f: File | undefined) => {
    if (!f) return;
    const c: Clip = {
      id: newId(), title: upDrill.trim() || f.name.replace(/\.[^.]+$/, ''), catcher: upCatcher, area: upArea, by: upBy, date: today(),
      kind: 'video', src: URL.createObjectURL(f), duration: 0, notes: [], drawings: [], timing: {}, scores: {}, audio: null,
    };
    addClip(c); setClipId(c.id);
  };
  const onAudio = (f: File | undefined) => {
    if (!f) return;
    updateClip(clip.id, (c) => ({ ...c, audio: URL.createObjectURL(f), notes: [{ t: 0, k: 'voice' as const, text: `Voiceover attached: ${f.name}` }, ...c.notes] }));
  };
  const toggleRecord = async () => {
    const en = engine.current; if (!en) return;
    setRecError('');
    if (st.recording) { en.pause(); en.stopRecording(); return; }
    try { await en.startRecording(); }
    catch { setRecError('Microphone was blocked. Allow it in the browser address bar and try again.'); }
  };

  return (
    <section>
      <div className="view-head">
        <div>
          <div className="eyebrow">Upload · Telestrate · Talk through it</div>
          <h1>Rep Review</h1>
          <p>Catchers and coaches upload drill clips. The coach steps through frame by frame, draws on the rep, pins feedback to the exact moment, and can record the whole review with their voice.</p>
        </div>
      </div>

      <div className="review">
        {/* ---------- clip library + upload ---------- */}
        <div className="panel clips">
          <div className="panel-head"><h2>Clips</h2><span className="eyebrow">{clips.length} clips</span></div>
          <div className="clip-list" role="list">
            {clips.map((c) => (
              <button key={c.id} className="clip" role="listitem" aria-current={c.id === clip.id} onClick={() => setClipId(c.id)}>
                <span className="thumb">{c.reviewOf ? <Icon name="mic" /> : <Icon name="play" />}</span>
                <span>
                  <b>{c.title}</b>
                  <span>{c.area} · {c.catcher}</span>
                  <span>{c.by} upload · {c.date}{c.notes.length ? ` · ${c.notes.length} notes` : ''}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="upload-form">
            <div className="field full"><label htmlFor="upCatcher">Catcher</label>
              <select id="upCatcher" value={upCatcher} onChange={(e) => setUpCatcher(e.target.value)}>{SAMPLE_CATCHERS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="field"><label htmlFor="upArea">Skill area</label>
              <select id="upArea" value={upArea} onChange={(e) => setUpArea(e.target.value as Area)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></div>
            <div className="field"><label htmlFor="upBy">Uploaded by</label>
              <select id="upBy" value={upBy} onChange={(e) => setUpBy(e.target.value as 'Catcher' | 'Coach')}><option>Catcher</option><option>Coach</option></select></div>
            <div className="field full"><label htmlFor="upDrill">Drill</label>
              <input id="upDrill" list="drills" placeholder="e.g. Short-hop blocks" value={upDrill} onChange={(e) => setUpDrill(e.target.value)} /></div>
            <datalist id="drills"><option>Short-hop blocks</option><option>10-ball blocking gauntlet</option><option>Low-away framing</option><option>Shadow-zone sticks</option><option>Pop time to 2B</option><option>Exchange reps</option></datalist>
            <label className="btn primary filebtn full"><Icon name="upload" />Upload video
              <input type="file" accept="video/*" aria-label="Upload video" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ''; }} /></label>
          </div>
        </div>

        {/* ---------- stage ---------- */}
        <div className="stage-wrap">
          <div className="stage-meta">
            <h2>{clip.title}</h2>
            <span className="chip note">{clip.area}</span>
            <span className="li-sub">{clip.catcher} · {clip.by} upload · {clip.date}</span>
          </div>
          <div className="stage" ref={stageRef}>
            <video ref={videoRef} playsInline preload="metadata" hidden={clip.kind !== 'video'} />
            <canvas ref={demoRef} hidden={clip.kind !== 'demo'} />
            <canvas ref={inkRef} className={`ink${tool === 'none' ? ' off' : ''}`} />
            <div className="stage-badge">{clip.kind === 'demo' ? 'SAMPLE CLIP · ANIMATED STAND-IN' : clip.reviewOf ? 'RECORDED COACH REVIEW' : 'UPLOADED CLIP'}</div>
            {st.recording && <div className="rec-flag"><span className="rec-dot" />REC {fmt(st.recSeconds).slice(0, -3)}</div>}
            {!st.recording && st.pausedOnDrawing && <div className="paused-flag">PAUSED ON COACH DRAWING</div>}
            {caption && (
              <div className="caption"><span className={`chip ${caption.k} on-dark`}>{NOTE_LABEL[caption.k]}</span><span>{caption.text}</span></div>
            )}
          </div>
          <audio ref={audioRef} preload="auto" hidden />

          <div className="timeline">
            <div className="markers">
              {clip.notes.map((n, i) => <span key={'n' + i} className={`mk ${n.k}`} style={{ left: `${(n.t / D) * 100}%` }} title={`${fmt(n.t)} ${n.text}`} />)}
              {clip.drawings.map((d, i) => <span key={'d' + i} className="mk draw" style={{ left: `${(d.t / D) * 100}%` }} title={`Drawing at ${fmt(d.t)}`} />)}
              {Object.entries(clip.timing).map(([k, t]) => t != null && <span key={k} className="mk time" style={{ left: `${(t / D) * 100}%` }} title={`${k} ${fmt(t)}`} />)}
            </div>
            <input type="range" className="scrub" min={0} max={D} step={0.001} value={Math.min(st.t, D)} aria-label="Scrub video"
              onChange={(e) => { engine.current?.pause(); engine.current?.seek(+e.target.value); }} />
          </div>

          <div className="transport">
            <button className="btn" onClick={() => engine.current?.step(-1)} aria-label="Back one frame" title="Back one frame (,)"><Icon name="stepBack" /></button>
            <button className="btn primary" onClick={() => engine.current?.toggle()} aria-label={st.playing ? 'Pause' : 'Play'} title="Play / pause (space)"><Icon name={st.playing ? 'pause' : 'play'} /></button>
            <button className="btn" onClick={() => engine.current?.step(1)} aria-label="Forward one frame" title="Forward one frame (.)"><Icon name="stepFwd" /></button>
            <span className="time num">{fmt(st.t)} / {fmt(st.duration)}</span>
            <div className="seg" role="group" aria-label="Playback speed">
              {[0.25, 0.5, 1].map((r) => <button key={r} aria-pressed={rate === r} onClick={() => setRate(r)}>{r === 0.25 ? '¼×' : r === 0.5 ? '½×' : '1×'}</button>)}
            </div>
            <label className="inline-field">FPS
              <select className="input" value={fps} onChange={(e) => setFps(+e.target.value)}>{[30, 60, 120, 240].map((f) => <option key={f}>{f}</option>)}</select></label>
            {canRecord && (
              <button className={`btn ${st.recording ? 'rec-on' : ''}`} onClick={toggleRecord} title="Records the screen, your drawings and your voice into a new clip">
                <Icon name="mic" />{st.recording ? 'Stop & save review' : 'Record review'}
              </button>
            )}
          </div>
          {recError && <div className="error">{recError}</div>}
          {st.recording && <div className="li-sub">Recording. Play, pause, scrub, draw and talk. Everything on the video is captured with your voice.</div>}

          <div className="panel tight">
            <div className="toolbar">
              <div className="seg" role="group" aria-label="Drawing tool">
                {TOOLS.map((x) => <button key={x.t} aria-pressed={tool === x.t} onClick={() => setTool(x.t)}>{x.label}</button>)}
              </div>
              <div className="row" role="group" aria-label="Ink color">
                {COLORS.map((x) => <button key={x.c} className="swatch" style={{ background: x.c }} aria-pressed={color === x.c} aria-label={x.name}
                  onClick={() => { setColor(x.c); if (tool === 'none') setTool('pen'); }} />)}
              </div>
              <button className="btn sm" onClick={() => updateClip(clip.id, (c) => ({ ...c, drawings: c.drawings.slice(0, -1) }))}>Undo drawing</button>
              <label className="check"><input type="checkbox" checked={pauseOnDraw} onChange={(e) => setPauseOnDraw(e.target.checked)} /> Stop playback at drawings</label>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Pop time from video</h2><span className="li-sub">Pause on each moment, then tap its button</span></div>
            <div className="row mb">
              <button className="btn sm" onClick={() => mark('catch')}>① Ball in glove</button>
              <button className="btn sm" onClick={() => mark('release')}>② Release</button>
              <button className="btn sm" onClick={() => mark('arrive')}>③ Arrives at 2B</button>
              <button className="btn sm" onClick={() => updateClip(clip.id, (c) => ({ ...c, timing: {} }))}>Reset</button>
            </div>
            <div className="timing">
              {([['Exchange', tm.ex], ['Throw flight', tm.fl], ['Pop time', tm.pop]] as const).map(([k, v]) => (
                <div className="stat" key={k}><div className="k">{k}</div><div className="v num">{v == null ? '—' : <>{v.toFixed(2)}<small>s</small></>}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- feedback ---------- */}
        <div className="feedback">
          <div className="panel">
            <div className="panel-head"><h2>Coach feedback</h2><span className="eyebrow">{clip.notes.length} notes</span></div>
            <div className="notes">
              {clip.notes.length === 0 && <p className="li-sub m0">No feedback yet. Pause on a moment and pin a note, or record a review.</p>}
              {clip.notes.map((n, i) => (
                <button key={i} className="note" onClick={() => { engine.current?.pause(); engine.current?.seek(n.t); }}>
                  <span className="t num">{fmt(n.t)}</span>
                  <span><span className={`chip ${n.k}`}>{NOTE_LABEL[n.k]}</span><p>{n.text}</p></span>
                </button>
              ))}
            </div>
            <div className="note-add">
              <div className="seg" role="group" aria-label="Note type">
                {(['good', 'fix', 'note'] as const).map((k) => <button key={k} aria-pressed={noteKind === k} onClick={() => setNoteKind(k)}>{k === 'good' ? 'Doing well' : NOTE_LABEL[k]}</button>)}
              </div>
              <form className="row" onSubmit={(e) => { e.preventDefault(); engine.current?.pause(); pinNote(noteText, noteKind, st.t); setNoteText(''); }}>
                <input className="input grow" placeholder="Type feedback…" aria-label="Feedback text" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <button className="btn primary" type="submit">Pin at <span className="num">{fmt(st.t)}</span></button>
              </form>
              <label className="btn filebtn" title="Attach a recorded voiceover that plays in sync with the clip">
                <Icon name="music" />{clip.audio ? 'Replace voiceover audio' : 'Attach voiceover audio'}
                <input type="file" accept="audio/*" aria-label="Attach voiceover audio" onChange={(e) => { onAudio(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Rep score</h2><span className="eyebrow">{clip.area}</span></div>
            <div className="rubric">
              {crit.map((c, i) => (
                <div className="crit" key={c}><span>{c}</span>
                  <div className="dots" role="group" aria-label={c}>
                    {[1, 2, 3, 4, 5].map((v) => <button key={v} aria-pressed={clip.scores[i] === v} onClick={() => updateClip(clip.id, (x) => ({ ...x, scores: { ...x.scores, [i]: v } }))}>{v}</button>)}
                  </div>
                </div>
              ))}
              <div className="avg"><span className="eyebrow">Rep average</span><span className="big num">{avg}<small> / 5</small></span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
