import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { blocked } from '../domain/blocking';
import { timingOf } from '../domain/timing';
import { NOTE_LABEL } from '../domain/types';
import { zoneStats } from '../domain/zone';
import { fmt } from '../lib/format';

function Spark({ data, lowerIsBetter }: { data: number[]; lowerIsBetter?: boolean }) {
  const min = Math.min(...data), max = Math.max(...data), pad = (max - min) * 0.15 || 0.01;
  const X = (i: number) => 4 + i * (192 / (data.length - 1));
  const Y = (v: number) => 36 - ((v - min + pad) / (max - min + 2 * pad)) * 32;
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const last = data[data.length - 1];
  const better = lowerIsBetter ? last <= data[0] : last >= data[0];
  return (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
      <line x1={0} x2={200} y1={20} y2={20} stroke="var(--line)" strokeDasharray="2 3" />
      <path d={`${d} L${X(data.length - 1)} 40 L4 40Z`} fill="var(--accent)" fillOpacity={0.1} />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={X(data.length - 1)} cy={Y(last)} r={3.5} fill={better ? 'var(--good)' : 'var(--bad)'} />
    </svg>
  );
}

export default function CatcherPage() {
  const { clips, blockReps, pitches } = useStore();
  // Example history for the trend lines; the latest point comes from logged data.
  const popHist = [2.09, 2.07, 2.08, 2.04, 2.03, 2.01, 1.99];
  const exHist = [0.82, 0.8, 0.81, 0.78, 0.77, 0.76, 0.75];
  const latest = clips.map(timingOf).find((t) => t.pop != null);
  if (latest?.pop) popHist.push(+latest.pop.toFixed(2));
  if (latest?.ex) exHist.push(+latest.ex.toFixed(2));
  const rate = blockReps.length ? blockReps.filter(blocked).length / blockReps.length : 0;
  const zs = zoneStats(pitches);
  const edge = zs.edgeRate ?? 0;
  const notes = clips.flatMap((c) => c.notes.filter((n) => n.k !== 'good').map((n) => ({ n, c }))).slice(0, 4);

  return (
    <section>
      <div className="view-head">
        <div>
          <div className="eyebrow">5 Tool Performance · Catcher</div>
          <h1>Sample catcher A</h1>
          <p>One page, one plan. Numbers update from the Zone Game, Blocking Map and video timing. Earlier weeks in the trend lines are example data.</p>
        </div>
      </div>
      <div className="ov-grid">
        <div className="tile"><div className="eyebrow">Pop time</div><div className="v num">{popHist[popHist.length - 1].toFixed(2)}<small>s</small></div><div className="sub">Last 8 weeks, from video</div><Spark data={popHist} lowerIsBetter /></div>
        <div className="tile"><div className="eyebrow">Exchange</div><div className="v num">{exHist[exHist.length - 1].toFixed(2)}<small>s</small></div><div className="sub">Last 8 weeks, from video</div><Spark data={exHist} lowerIsBetter /></div>
        <div className="tile"><div className="eyebrow">Block rate</div><div className="v num">{Math.round(rate * 100)}<small>%</small></div><div className="sub">{blockReps.length} reps logged</div><Spark data={[0.74, 0.76, 0.75, 0.79, 0.8, 0.82, 0.81, rate]} /></div>
        <div className="tile"><div className="eyebrow">Edge strike rate</div><div className="v num">{Math.round(edge * 100)}<small>%</small></div><div className="sub">{zs.edgeCount} edge pitches</div><Spark data={[0.41, 0.43, 0.42, 0.46, 0.45, 0.48, 0.47, edge]} /></div>
      </div>
      <div className="ov-cols">
        <div className="panel"><div className="panel-head"><h2>This week</h2><span className="eyebrow">Assigned</span></div>
          <div className="list">
            <div><b>Receiving</b> · Low-away framing<div className="li-sub">Zone Game round × 3 · upload 1 clip</div></div>
            <div><b>Blocking</b> · Short-hop blocks<div className="li-sub">10-ball gauntlet × 2 · upload 1 clip</div></div>
            <div><b>Throwing</b> · Exchange reps<div className="li-sub">Film 5 throws to 2B from the side</div></div>
          </div></div>
        <div className="panel"><div className="panel-head"><h2>Latest coach notes</h2></div>
          <div className="list">
            {notes.map(({ n, c }, i) => (
              <div key={i}><span className={`chip ${n.k}`}>{NOTE_LABEL[n.k]}</span><div className="mt-sm">{n.text}</div><div className="li-sub">{c.title} · {fmt(n.t)}</div></div>
            ))}
          </div></div>
        <div className="panel"><div className="panel-head"><h2>Recent clips</h2></div>
          <div className="list">
            {clips.slice(0, 4).map((c) => (
              <div key={c.id}><Link className="linkbtn" to={`/review?clip=${encodeURIComponent(c.id)}`}>{c.title}</Link><div className="li-sub">{c.area} · {c.by} upload · {c.notes.length} notes</div></div>
            ))}
          </div></div>
      </div>
    </section>
  );
}
