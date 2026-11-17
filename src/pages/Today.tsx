import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useStore } from '../data/store';
import { blocked } from '../domain/blocking';
import { timingOf } from '../domain/timing';
import type { Lesson, Progress } from '../domain/types';
import { zoneStats } from '../domain/zone';

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysFromToday = (d: Date) => Math.round((startOfDay(d) - startOfDay(new Date())) / DAY);
const timeOf = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const dateOf = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
function relDay(d: Date) {
  const n = daysFromToday(d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const TOOL_NAME: Record<string, string> = { '/blocking': 'Blocking Map', '/zone': 'Zone Game', '/review': 'Rep Review' };

function ProgressRow({ p }: { p: Progress }) {
  const delta = p.to - p.from;
  const better = p.lowerIsBetter ? delta < 0 : delta > 0;
  const same = Math.abs(delta) < 10 ** -p.digits / 2;
  const f = (v: number) => v.toFixed(p.digits);
  return (
    <div className="prog">
      <div className="grow">
        <b>{p.label}</b>
        <div className="li-sub">since {p.since}</div>
      </div>
      <div className="prog-vals num">
        <span className="from">{f(p.from)}</span>
        <span aria-hidden="true">→</span>
        <b>{f(p.to)}<small>{p.unit}</small></b>
      </div>
      <span className={`delta ${same ? '' : better ? 'up' : 'down'}`}>
        {same ? 'Same' : `${delta > 0 ? '+' : '−'}${f(Math.abs(delta))}${p.unit}`}
      </span>
    </div>
  );
}

export default function Today() {
  const { lessons, clips, blockReps, pitches, blockBest, toggleHomework } = useStore();
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const { today, last, upcoming, past } = useMemo(() => {
    const sorted = [...lessons].sort((a, b) => a.start.getTime() - b.start.getTime());
    const done = sorted.filter((l) => daysFromToday(l.start) < 0);
    return {
      today: sorted.find((l) => daysFromToday(l.start) === 0) ?? null,
      last: [...done].reverse().find((l) => l.recap) ?? null,
      upcoming: sorted.filter((l) => daysFromToday(l.start) > 0),
      past: done.reverse(),
    };
  }, [lessons]);

  // "Where it was" values are example history from four weeks ago; "now" comes from logged data.
  const progress: Progress[] = useMemo(() => {
    const t = clips.map(timingOf).find((x) => x.pop != null);
    const zs = zoneStats(pitches);
    const rate = blockReps.length ? blockReps.filter(blocked).length / blockReps.length : 0;
    const since = dateOf(new Date(Date.now() - 28 * DAY));
    return [
      { label: 'Pop time to 2B', unit: 's', from: 2.09, to: t?.pop ?? 2.03, since, lowerIsBetter: true, digits: 2 },
      { label: 'Exchange', unit: 's', from: 0.82, to: t?.ex ?? 0.78, since, lowerIsBetter: true, digits: 2 },
      { label: 'Block rate', unit: '%', from: 61, to: Math.round(rate * 100), since, digits: 0 },
      { label: 'Edge strike rate', unit: '%', from: 28, to: Math.round((zs.edgeRate ?? 0) * 100), since, digits: 0 },
      { label: 'Gauntlet best', unit: ' pts', from: 11, to: blockBest, since, digits: 0 },
    ];
  }, [clips, pitches, blockReps, blockBest]);

  const clipTitle = (id: string) => clips.find((c) => c.id === id)?.title ?? 'Clip';
  const athlete = today?.catcher ?? last?.catcher ?? 'Athlete';
  const total = today?.plan.reduce((s, p) => s + p.min, 0) ?? 0;
  const toggle = (i: number) => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const next = upcoming[0];

  return (
    <section>
      <div className="hero">
        <div>
          <div className="eyebrow">{dateOf(new Date())}</div>
          <h1>{greeting()}, {athlete}.</h1>
          <p>
            {today
              ? <>Today is a <b>{today.focus.toLowerCase()}</b> lesson at <b>{timeOf(today.start)}</b> with {today.coach}. Here's the plan.</>
              : next
                ? <>No lesson today. Next up: <b>{next.focus.toLowerCase()}</b>, {dateOf(next.start)} at {timeOf(next.start)}.</>
                : <>No lessons on the schedule yet.</>}
          </p>
        </div>
        {today && (
          <div className="hero-meta">
            <div><span className="eyebrow">Time</span><b>{timeOf(today.start)}</b><small>{today.minutes} min</small></div>
            <div><span className="eyebrow">Coach</span><b>{today.coach}</b><small>{today.location}</small></div>
          </div>
        )}
      </div>

      <div className="today-grid">
        {/* ---------- Today's plan ---------- */}
        <div className="panel">
          <div className="panel-head">
            <h2>Today's plan</h2>
            {today && <span className="li-sub num">{checked.size} of {today.plan.length} done · {total} min</span>}
          </div>
          {today ? (
            <>
              <div className="goal"><span className="eyebrow accent">Goal for today</span><p>{today.goal}</p></div>
              <ol className="plan">
                {today.plan.map((p, i) => (
                  <li key={i} className={checked.has(i) ? 'done' : ''}>
                    <label className="plan-check">
                      <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} aria-label={`Mark ${p.drill} done`} />
                    </label>
                    <div className="grow">
                      <div className="row"><b>{p.drill}</b><span className="chip note">{p.area}</span></div>
                      <div className="li-sub">{p.detail}</div>
                      {p.to && <Link className="linkbtn" to={p.to}>Open {TOOL_NAME[p.to]} →</Link>}
                    </div>
                    <span className="plan-min num">{p.min}<small>min</small></span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="li-sub m0">Your coach hasn't posted a plan for today. Check the homework from last session.</p>
          )}
        </div>

        {/* ---------- Improvement ---------- */}
        <div className="side">
          <div className="panel">
            <div className="panel-head"><h2>What you've improved</h2><span className="eyebrow">Last 4 weeks</span></div>
            <div className="list">{progress.map((p) => <ProgressRow key={p.label} p={p} />)}</div>
            <Link className="linkbtn mt" to="/catcher" style={{ display: 'inline-block' }}>See all trends →</Link>
          </div>

          {last?.recap && last.recap.homework.length > 0 && (
            <div className="panel">
              <div className="panel-head"><h2>Homework</h2><span className="li-sub">from {dateOf(last.start)}</span></div>
              <div className="list">
                {last.recap.homework.map((h, i) => (
                  <label key={i} className={`hw ${h.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={h.done} onChange={() => toggleHomework(last.id, i)} />
                    <span>{h.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Last session ---------- */}
      {last?.recap && (
        <div className="panel mt">
          <div className="panel-head">
            <div>
              <h2>Last session</h2>
              <div className="li-sub">{dateOf(last.start)} · {last.focus} · {last.coach}</div>
            </div>
            <span className="li-sub">{relDay(last.start)}</span>
          </div>
          <p className="recap-summary">{last.recap.summary}</p>
          <div className="recap-cols">
            <div>
              <div className="eyebrow mb">Went well</div>
              <ul className="ticks good">{last.recap.wins.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
            <div>
              <div className="eyebrow mb">Keep working on</div>
              <ul className="ticks fix">{last.recap.workOns.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
            <div>
              <div className="eyebrow mb">Clips reviewed</div>
              <div className="list">
                {last.recap.clipIds.map((id) => (
                  <Link key={id} className="clip-link" to={`/review?clip=${encodeURIComponent(id)}`}>
                    <span className="thumb"><Icon name="play" /></span>
                    <span className="grow"><b>{clipTitle(id)}</b><span className="li-sub">Watch with coach notes</span></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Schedule ---------- */}
      <div className="two mt">
        <LessonList title="Coming up" lessons={upcoming} empty="Nothing scheduled yet." />
        <LessonList title="Past lessons" lessons={past} empty="No past lessons yet." showRecap />
      </div>
    </section>
  );
}

function LessonList({ title, lessons, empty, showRecap }: { title: string; lessons: Lesson[]; empty: string; showRecap?: boolean }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2><span className="li-sub">{lessons.length}</span></div>
      {lessons.length === 0 ? <p className="li-sub m0">{empty}</p> : (
        <div className="list">
          {lessons.map((l) => (
            <div key={l.id} className="lesson-row">
              <div className="cal"><span>{l.start.toLocaleDateString(undefined, { month: 'short' })}</span><b className="num">{l.start.getDate()}</b></div>
              <div className="grow">
                <div className="row"><b>{l.focus}</b><span className="li-sub">{relDay(l.start)} · {timeOf(l.start)}</span></div>
                <div className="li-sub">{showRecap && l.recap ? l.recap.wins[0] : l.goal}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
