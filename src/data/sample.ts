import type { BlockRep, Clip, Pitch } from '../domain/types';
import { seeded } from '../lib/format';

export const SAMPLE_CATCHERS = ['Sample catcher A', 'Sample catcher B', 'Sample catcher C'];

export function sampleClips(): Clip[] {
  return [
    {
      id: 'sample-blocking', title: '10-ball blocking gauntlet', catcher: 'Sample catcher A', area: 'Blocking', by: 'Catcher', date: 'Nov 14', kind: 'demo', duration: 9.6,
      notes: [
        { t: 0.62, k: 'good', text: 'Quick drop. Knees hit before the ball lands.' },
        { t: 3.05, k: 'fix', text: 'Chest is turned toward 1B here. Square up to the ball, not the plate.' },
        { t: 5.45, k: 'fix', text: 'Glove came late. Get it down between the knees first.' },
        { t: 7.9, k: 'good', text: 'That one is perfect. Ball dies right in front.' },
      ],
      drawings: [
        { t: 3.05, tool: 'arrow', color: '#ff5a5f', pts: [[0.66, 0.52], [0.53, 0.66]] },
        { t: 5.45, tool: 'circle', color: '#ffd23f', pts: [[0.43, 0.7], [0.58, 0.9]] },
      ],
      timing: {}, scores: { 0: 4, 1: 3, 2: 3, 3: 4 }, audio: null,
    },
    {
      id: 'sample-framing', title: 'Low-away framing', catcher: 'Sample catcher A', area: 'Receiving', by: 'Coach', date: 'Nov 12', kind: 'demo', duration: 9.6,
      notes: [
        { t: 0.5, k: 'good', text: 'Relaxed glove, thumb under. Good.' },
        { t: 2.95, k: 'fix', text: 'Glove drifts off the plate after the catch. Stick it for a full second.' },
        { t: 5.35, k: 'note', text: 'Try the one-knee setup on this pitch next session.' },
      ],
      drawings: [{ t: 2.95, tool: 'angle', color: '#ffd23f', pts: [[0.5, 0.62], [0.64, 0.54]] }],
      timing: {}, scores: { 0: 4, 1: 4, 2: 3, 3: 2 }, audio: null,
    },
    {
      id: 'sample-throwing', title: 'Pop time to 2B', catcher: 'Sample catcher A', area: 'Throwing', by: 'Catcher', date: 'Nov 10', kind: 'demo', duration: 4.8,
      notes: [
        { t: 0.62, k: 'good', text: 'Clean transfer. Ball out of the glove fast.' },
        { t: 1.2, k: 'fix', text: 'Front foot opens early, so the throw runs to the 1B side.' },
      ],
      drawings: [{ t: 1.2, tool: 'pen', color: '#4ade80', pts: [[0.6, 0.78], [0.62, 0.7], [0.66, 0.62], [0.7, 0.55], [0.73, 0.5]] }],
      timing: { catch: 0.45, release: 1.2, arrive: 2.43 }, scores: { 0: 4, 1: 3, 2: 4, 3: 3 }, audio: null,
    },
  ];
}

/** Sample history for one catcher: steals low, gives away glove-side edge pitches. */
export function samplePitches(): Pitch[] {
  const { rnd, gauss } = seeded(11);
  const out: Pitch[] = [];
  for (let i = 0; i < 160; i++) {
    const x = gauss() * 0.62, y = 2.5 + gauss() * 0.72;
    const d = Math.max(Math.abs(x) - 0.708, Math.max(1.5 - y, y - 3.5));
    let prob = 1 / (1 + Math.exp(d * 14));
    if (y < 1.75 && Math.abs(x) < 0.9) prob += 0.18;
    if (x > 0.55) prob -= 0.2;
    out.push({ x, y, call: rnd() < Math.min(0.98, Math.max(0.02, prob)) ? 'S' : 'B', src: 'sample' });
  }
  return out;
}

export function sampleBlockReps(): BlockRep[] {
  const { rnd } = seeded(23);
  const out: BlockRep[] = [];
  for (let i = 0; i < 90; i++) {
    const c = Math.floor(rnd() * 3), r = Math.floor(rnd() * 3);
    let good = 0.78;
    if (c === 2) good -= 0.25;
    if (r === 2) good -= 0.12;
    if (c === 1) good += 0.1;
    const u = rnd();
    out.push({ c, r, out: u < good * 0.75 ? 'sm' : u < good ? 'rb' : 'pb' });
  }
  return out;
}
