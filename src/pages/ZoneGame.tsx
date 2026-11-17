import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useStore } from '../data/store';
import type { Pitch } from '../domain/types';
import { BAND, BALL_R, BOT, HALF, REGION_LABEL, ROUND_SIZE, TOP, parseTrackman, points, region, zoneStats } from '../domain/zone';
import { pct } from '../lib/format';
import { Icon } from '../components/Icon';

// SVG coordinates: 100 px per foot, x centred at 150, y = 0.85 ft at the bottom (345 px).
const ZX = (x: number) => 150 + x * 100;
const ZY = (y: number) => 345 - (y - 0.85) * 100;
const IX = (px: number) => (px - 150) / 100;
const IY = (py: number) => 0.85 + (345 - py) / 100;
const CELL = 0.25;

export default function ZoneGame() {
  const { pitches, zoneRoundStart, zoneBest, setZone } = useStore();
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'pitches' | 'heat'>('pitches');
  const [toast, setToast] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const round = pitches.slice(zoneRoundStart);
  const roundScore = round.reduce((a, p) => a + points(p), 0);
  const stats = zoneStats(pitches);

  const onZoneClick = (e: MouseEvent<SVGSVGElement>) => {
    const s = svgRef.current!; const pt = s.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(s.getScreenCTM()!.inverse());
    setPending({ x: IX(q.x), y: IY(q.y) });
  };

  const call = (c: 'S' | 'B') => {
    if (!pending) return;
    const p: Pitch = { ...pending, call: c, src: 'coach' };
    setPending(null);
    const v = points(p);
    const all = [...pitches, p];
    const r = all.slice(zoneRoundStart);
    if (r.length >= ROUND_SIZE) {
      const sc = r.reduce((a, q) => a + points(q), 0);
      setZone(() => ({ pitches: all, zoneRoundStart: all.length, zoneBest: Math.max(zoneBest, sc) }));
      setToast(`Round done: ${sc} points${sc > zoneBest ? '. New personal best.' : '.'} Next round started.`);
    } else {
      setZone((z) => ({ ...z, pitches: all }));
      setToast(`${c === 'S' ? 'Strike' : 'Ball'} ${REGION_LABEL[region(p)]}: ${v > 0 ? '+' : ''}${v}`);
    }
  };

  const undo = () => {
    if (pending) return setPending(null);
    setZone((z) => (z.pitches.length > z.zoneRoundStart ? { ...z, pitches: z.pitches.slice(0, -1) } : z));
  };

  const importCsv = async (f: File | undefined) => {
    if (!f) return;
    const res = parseTrackman(await f.text());
    if ('error' in res) return setToast(res.error);
    setZone((z) => { const all = [...z.pitches, ...res.pitches]; return { ...z, pitches: all, zoneRoundStart: all.length }; });
    setToast(`Imported ${res.pitches.length} called pitches from ${res.rows} TrackMan rows.`);
  };

  const callRef = useRef(call); callRef.current = call;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|SELECT|TEXTAREA/.test(el.tagName)) return;
      if (e.key === 's' || e.key === 'S') callRef.current('S');
      if (e.key === 'b' || e.key === 'B') callRef.current('B');
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  // geometry
  const zx1 = ZX(-HALF + BALL_R), zx2 = ZX(HALF - BALL_R), zy1 = ZY(3.5), zy2 = ZY(1.5);
  const bx1 = ZX(-HALF - BAND), bx2 = ZX(HALF + BAND), by1 = ZY(TOP + BAND), by2 = ZY(BOT - BAND);
  const ix1 = ZX(-HALF + BAND), ix2 = ZX(HALF - BAND), iy1 = ZY(TOP - BAND), iy2 = ZY(BOT + BAND);

  const heatCells: JSX.Element[] = [];
  if (mode === 'heat') {
    for (let gx = -1.5; gx < 1.5 - 1e-6; gx += CELL)
      for (let gy = 0.85; gy < 4.45 - 1e-6; gy += CELL) {
        const inCell = pitches.filter((p) => p.x >= gx && p.x < gx + CELL && p.y >= gy && p.y < gy + CELL);
        if (inCell.length < 2) continue;
        const r = inCell.filter((p) => p.call === 'S').length / inCell.length;
        heatCells.push(
          <rect key={`${gx}-${gy}`} x={ZX(gx)} y={ZY(gy + CELL)} width={25} height={25} fill="var(--heat)" fillOpacity={0.06 + r * 0.84}>
            <title>{Math.round(r * 100)}% strikes · {inCell.length} pitches</title>
          </rect>,
        );
      }
  }

  return (
    <section>
      <div className="view-head">
        <div>
          <div className="eyebrow">Receiving · Framing game</div>
          <h1>Zone Game</h1>
          <p>Every pitch goes on the zone. Tap where it crossed, then log the call. Points come from the edges: steal strikes off the plate and don't give back strikes on it.</p>
        </div>
        <label className="btn filebtn"><Icon name="upload" />Import TrackMan CSV
          <input type="file" accept=".csv,text/csv" aria-label="Import TrackMan CSV" onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ''; }} /></label>
      </div>
      <div className="game">
        <div className="panel zone-card">
          <div className="row between">
            <div className="seg" role="group" aria-label="Zone display">
              <button aria-pressed={mode === 'pitches'} onClick={() => setMode('pitches')}>Pitches</button>
              <button aria-pressed={mode === 'heat'} onClick={() => setMode('heat')}>Heat map</button>
            </div>
            <div className="legend">
              {mode === 'pitches'
                ? <><span><i style={{ background: 'var(--good)' }} />Called strike</span><span><i style={{ border: '2px solid var(--bad)' }} />Called ball</span><span>Big dots = this round</span></>
                : <><span>Called-strike %</span><span>0%<span className="ramp" />100%</span></>}
            </div>
          </div>
          <svg ref={svgRef} className="zone-svg" viewBox="0 0 300 370" role="img" aria-label="Strike zone from the catcher's view" onClick={onZoneClick}>
            <rect x={0} y={0} width={300} height={370} fill="var(--surface-2)" rx={10} />
            {heatCells}
            <path d={`M${bx1} ${by1}H${bx2}V${by2}H${bx1}Z M${ix1} ${iy1}V${iy2}H${ix2}V${iy1}Z`} fill="var(--warn)" fillOpacity={0.09} fillRule="evenodd" />
            <rect x={zx1} y={zy1} width={zx2 - zx1} height={zy2 - zy1} fill="none" stroke="var(--ink)" strokeWidth={2} />
            {[1, 2].map((i) => (
              <g key={i} stroke="var(--ink)" strokeOpacity={0.18}>
                <line x1={zx1 + ((zx2 - zx1) * i) / 3} y1={zy1} x2={zx1 + ((zx2 - zx1) * i) / 3} y2={zy2} />
                <line x1={zx1} y1={zy1 + ((zy2 - zy1) * i) / 3} x2={zx2} y2={zy1 + ((zy2 - zy1) * i) / 3} />
              </g>
            ))}
            <rect x={bx1} y={by1} width={bx2 - bx1} height={by2 - by1} fill="none" stroke="var(--warn)" strokeDasharray="4 4" strokeOpacity={0.7} />
            <path d={`M${ZX(-0.708)} 352 H${ZX(0.708)} L${ZX(0.708)} 358 L150 364 L${ZX(-0.708)} 358Z`} fill="var(--line)" />
            <text x={bx2 + 4} y={by1 + 10} fontSize={9} fill="var(--warn)" className="mono">EDGE</text>
            <text x={10} y={18} fontSize={9} fill="var(--muted)" className="mono">CATCHER'S VIEW</text>
            {mode === 'pitches' && pitches.map((p, i) => {
              const inRound = i >= zoneRoundStart, r = inRound ? 6 : 4.2;
              const col = p.call === 'S' ? 'var(--good)' : 'var(--bad)';
              return p.call === 'S'
                ? <circle key={i} cx={ZX(p.x)} cy={ZY(p.y)} r={r} fill={col} fillOpacity={inRound ? 0.95 : 0.55} stroke="var(--surface)" strokeWidth={inRound ? 1.5 : 0.6} />
                : <circle key={i} cx={ZX(p.x)} cy={ZY(p.y)} r={r - 0.8} fill="var(--surface)" fillOpacity={0.3} stroke={col} strokeOpacity={inRound ? 1 : 0.6} strokeWidth={inRound ? 2 : 1.3} />;
            })}
            {pending && <>
              <circle className="pulse" cx={ZX(pending.x)} cy={ZY(pending.y)} r={8} fill="none" stroke="var(--accent)" strokeWidth={3} />
              <circle cx={ZX(pending.x)} cy={ZY(pending.y)} r={3} fill="var(--accent)" />
            </>}
          </svg>
          <div className="callbar">
            <button className="btn strike" disabled={!pending} onClick={() => call('S')}>Called strike <span className="eyebrow">S</span></button>
            <button className="btn ball" disabled={!pending} onClick={() => call('B')}>Called ball <span className="eyebrow">B</span></button>
            <button className="btn" onClick={undo}>Undo last</button>
          </div>
          <div className="toast" role="status">{toast}</div>
        </div>

        <div className="side">
          <div className="panel">
            <div className="panel-head"><h2>This round</h2><span className="eyebrow num">{round.length} / {ROUND_SIZE} pitches</span></div>
            <div className="progress mb"><b style={{ width: `${Math.min(100, (round.length / ROUND_SIZE) * 100)}%` }} /></div>
            <div className="stats">
              <div className="stat"><div className="k">Round score</div><div className="v num">{roundScore}</div></div>
              <div className="stat"><div className="k">Personal best</div><div className="v num">{zoneBest}</div></div>
            </div>
            <div className="reps mt">
              {round.length === 0 && <span className="li-sub">Tap the zone to log the first pitch.</span>}
              {round.map((p, i) => { const v = points(p); return <span key={i} className="rep" style={{ background: v > 0 ? 'var(--good)' : v < 0 ? 'var(--bad)' : 'var(--muted)' }}>{v > 0 ? `+${v}` : v}</span>; })}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>All sessions</h2><span className="eyebrow num">{pitches.length} called pitches</span></div>
            <div className="stats">
              <div className="stat"><div className="k">Strikes stolen</div><div className="v num">{stats.steal}</div></div>
              <div className="stat"><div className="k">Strikes lost</div><div className="v num">{stats.lost}</div></div>
              <div className="stat"><div className="k">Edge strike %</div><div className="v num">{pct(stats.edgeRate)}</div></div>
              <div className="stat"><div className="k">Heart strike %</div><div className="v num">{pct(stats.heartRate)}</div></div>
            </div>
          </div>
          <div className="panel">
            <h2 className="mb">Scoring</h2>
            <ul className="rules">
              <li><b>+2</b> called strike just off the plate (stolen)</li>
              <li><b>+1</b> called strike on the edge (kept)</li>
              <li><b>−2</b> called ball on the edge or in the zone (lost)</li>
              <li>Balls well off the plate and strikes down the middle score 0</li>
              <li>A round is {ROUND_SIZE} pitches. The edge band is ±3 in around the zone.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
