import { useStore } from '../data/store';

const TARGET = 3000;

const STEPS = [
  { k: 'Step 1 · Film', h: 'Same camera, every time', p: 'One fixed camera behind the catcher at a set height, plus one from the side. A model learns much faster when the angle never changes.' },
  { k: 'Step 2 · Label', h: 'TrackMan gives the answer', p: "TrackMan's session CSV has exact plate location (PlateLocSide, PlateLocHeight) and the call. Match each row to its clip by time. No API needed." },
  { k: 'Step 3 · Train', h: 'Ball, glove, catch point', p: 'First teach it to find the ball and glove in each frame. Then predict where the pitch crossed and whether it is a strike.' },
  { k: 'Step 4 · Use', h: 'Auto-fill the Zone Game', p: 'Uploaded bullpen video lands on the zone by itself. The coach confirms or fixes the call, and every fix becomes new training data.' },
];

export default function ModelPlan() {
  const { pitches } = useStore();
  const n = pitches.length;
  return (
    <section>
      <div className="view-head">
        <div>
          <div className="eyebrow">Later phase</div>
          <h1>Strike/Ball Model</h1>
          <p>How filmed reps could train a model that calls strikes and balls, and measures how much the catcher's glove work changes the call.</p>
        </div>
      </div>
      <div className="pipe">
        {STEPS.map((s) => <div className="step" key={s.k}><div className="eyebrow accent">{s.k}</div><h3>{s.h}</h3><p>{s.p}</p></div>)}
      </div>
      <div className="two">
        <div className="panel prose">
          <h2 className="mb">Labeled pitches so far</h2>
          <p><span className="num big">{n.toLocaleString()}</span> <span className="li-sub">of a {TARGET.toLocaleString()}-pitch first target</span></p>
          <div className="progress mb"><b style={{ width: `${Math.min(100, (n / TARGET) * 100)}%` }} /></div>
          <p className="li-sub">Counts every called pitch logged in the Zone Game or imported from TrackMan. Each one with a matching clip becomes a training example.</p>
        </div>
        <div className="panel prose">
          <h2 className="mb">What to plan for</h2>
          <ul>
            <li>Video alone can't see the 3D zone well. Use TrackMan locations to label the clips, then have the model learn from the video.</li>
            <li>The most useful output is the <b>framing effect</b>: how often a pitch at the same spot gets called a strike for this catcher compared with average.</li>
            <li>Expect a few thousand labeled pitches before the calls are reliable. Logging starts in the Zone Game now, so that data is building from day one.</li>
            <li>Get TrackMan CSV exports from each bullpen session. That's the one thing to set up with the 5 Tool data team.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
