import { useState } from 'react';
import { useStore } from '../data/store';
import { BLOCK_LABEL, BLOCK_POINTS, COLS, GAUNTLET_SIZE, ROWS, blocked, cellRate, weakestCell } from '../domain/blocking';
import type { BlockOutcome } from '../domain/types';
import { pct } from '../lib/format';

const X0 = 30, Y0 = 20, CW = 80, RH = 70;

export default function BlockingMap() {
  const { blockReps, blockStart, blockBest, setBlock } = useStore();
  const [pending, setPending] = useState<{ c: number; r: number } | null>(null);
  const [toast, setToast] = useState('');

  const g = blockReps.slice(blockStart);
  const gScore = g.reduce((a, q) => a + BLOCK_POINTS[q.out], 0);
  const worst = weakestCell(blockReps);
  const rate = blockReps.length ? blockReps.filter(blocked).length / blockReps.length : null;
  const smother = blockReps.length ? blockReps.filter((q) => q.out === 'sm').length / blockReps.length : null;

  const log = (out: BlockOutcome) => {
    if (!pending) return;
    const rep = { ...pending, out };
    setPending(null);
    const all = [...blockReps, rep];
    const cur = all.slice(blockStart);
    if (cur.length >= GAUNTLET_SIZE) {
      const sc = cur.reduce((a, q) => a + BLOCK_POINTS[q.out], 0);
      setBlock(() => ({ blockReps: all, blockStart: all.length, blockBest: Math.max(blockBest, sc) }));
      setToast(`Gauntlet done: ${sc}/${GAUNTLET_SIZE * 2}${sc > blockBest ? '. New best.' : '.'} Next one started.`);
    } else {
      setBlock((s) => ({ ...s, blockReps: all }));
      setToast(`${BLOCK_LABEL[out]}: ${BLOCK_POINTS[out]} point${BLOCK_POINTS[out] === 1 ? '' : 's'}`);
    }
  };

  return (
    <section>
      <div className="view-head">
        <div>
          <div className="eyebrow">Blocking · 10-ball gauntlet</div>
          <h1>Blocking Map</h1>
          <p>Tap where the ball hit the dirt, then the result. The map shows which spots the catcher keeps in front and which ones get away.</p>
        </div>
      </div>
      <div className="game">
        <div className="panel zone-card">
          <div className="legend"><span>Block rate</span><span>0%<span className="ramp" />100%</span><span>· number = reps</span></div>
          <svg className="zone-svg" viewBox="0 0 300 300" role="img" aria-label="Dirt in front of home plate, catcher's view">
            <rect x={0} y={0} width={300} height={300} rx={10} fill="var(--surface-2)" />
            {[0, 1, 2].map((r) => [0, 1, 2].map((c) => {
              const s = cellRate(blockReps, c, r);
              const sel = pending?.c === c && pending?.r === r;
              const cx = X0 + c * CW + (CW - 4) / 2;
              return (
                <g key={`${c}${r}`} className="bcell" onClick={() => setPending({ c, r })} role="button" aria-label={`${COLS[c]}, ${ROWS[r]}`}>
                  <rect x={X0 + c * CW} y={Y0 + r * RH} width={CW - 4} height={RH - 4} rx={6} fill="var(--heat)" fillOpacity={s.n ? 0.08 + s.rate * 0.8 : 0.04}
                    stroke={sel ? 'var(--accent)' : 'var(--line)'} strokeWidth={sel ? 3 : 1} />
                  <text x={cx} y={Y0 + r * RH + 30} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--ink)" className="display">{s.n ? `${Math.round(s.rate * 100)}%` : '—'}</text>
                  <text x={cx} y={Y0 + r * RH + 48} textAnchor="middle" fontSize={9.5} fill="var(--muted)" className="mono">{s.n} reps</text>
                </g>
              );
            }))}
            {ROWS.map((l, r) => <text key={l} x={24} y={Y0 + r * RH + 34} textAnchor="end" fontSize={8} fill="var(--muted)" className="mono" transform={`rotate(-90 18 ${Y0 + r * RH + 33})`}>{l.toUpperCase()}</text>)}
            {COLS.map((l, c) => <text key={l} x={X0 + c * CW + 38} y={Y0 + 3 * RH + 12} textAnchor="middle" fontSize={8.5} fill="var(--muted)" className="mono">{l.toUpperCase()}</text>)}
            <path d="M120 252 H180 L180 262 L150 276 L120 262Z" fill="var(--line)" />
            <text x={150} y={292} textAnchor="middle" fontSize={8.5} fill="var(--muted)" className="mono">CATCHER</text>
          </svg>
          <div className="callbar">
            <button className="btn strike" disabled={!pending} onClick={() => log('sm')}>Smothered (within 3 ft)</button>
            <button className="btn" disabled={!pending} onClick={() => log('rb')}>Blocked, kicked away</button>
            <button className="btn ball" disabled={!pending} onClick={() => log('pb')}>Got by</button>
          </div>
          <div className="toast" role="status">{toast}</div>
        </div>
        <div className="side">
          <div className="panel">
            <div className="panel-head"><h2>Gauntlet</h2><span className="eyebrow num">{g.length} / {GAUNTLET_SIZE} balls</span></div>
            <div className="progress mb"><b style={{ width: `${(g.length / GAUNTLET_SIZE) * 100}%` }} /></div>
            <div className="stats">
              <div className="stat"><div className="k">Score / {GAUNTLET_SIZE * 2}</div><div className="v num">{gScore}</div></div>
              <div className="stat"><div className="k">Best</div><div className="v num">{blockBest}</div></div>
            </div>
            <div className="reps mt">
              {g.length === 0 && <span className="li-sub">Tap a spot in the dirt to log the first ball.</span>}
              {g.map((q, i) => <span key={i} className="rep" style={{ background: q.out === 'sm' ? 'var(--good)' : q.out === 'rb' ? 'var(--warn)' : 'var(--bad)' }}>{BLOCK_POINTS[q.out]}</span>)}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>All reps</h2><span className="eyebrow num">{blockReps.length} reps</span></div>
            <div className="stats">
              <div className="stat"><div className="k">Block rate</div><div className="v num">{pct(rate)}</div></div>
              <div className="stat"><div className="k">Smother rate</div><div className="v num">{pct(smother)}</div></div>
            </div>
            {worst && <p className="li-sub mt">Weakest spot: {COLS[worst.c].toLowerCase()}, {ROWS[worst.r].toLowerCase()} ({Math.round(worst.rate * 100)}%). Good target for next week's drill.</p>}
          </div>
          <div className="panel">
            <h2 className="mb">Scoring</h2>
            <ul className="rules"><li><b>2</b> smothered, ball within 3 ft</li><li><b>1</b> blocked but kicked away</li><li><b>0</b> got by the catcher</li><li>{GAUNTLET_SIZE} balls per gauntlet, {GAUNTLET_SIZE * 2} points max</li></ul>
          </div>
        </div>
      </div>
    </section>
  );
}
