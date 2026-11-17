import type { Pitch } from './types';

/*
 * Plate coordinates in feet, catcher's view (TrackMan PlateLocSide / PlateLocHeight).
 * The rule-book zone is 17 in wide; a pitch counts if any part of the ball touches it,
 * so the effective edge is pushed out by one ball radius (~0.121 ft).
 * Vertical zone is fixed at 1.5–3.5 ft for now; per-batter zones come later.
 */
export const BALL_R = 0.121;
export const HALF = 0.708 + BALL_R;
export const BOT = 1.5 - BALL_R;
export const TOP = 3.5 + BALL_R;
/** Width of the "edge" band on each side of the zone border (3 in). */
export const BAND = 0.25;

export type Region = 'heart' | 'edge' | 'shadowOut' | 'off';

export function region(p: { x: number; y: number }): Region {
  const out = Math.max(Math.abs(p.x) - HALF, p.y - TOP, BOT - p.y); // > 0 outside the zone
  if (out > BAND) return 'off';
  if (out > 0) return 'shadowOut';
  if (out > -BAND) return 'edge';
  return 'heart';
}

export const REGION_LABEL: Record<Region, string> = {
  shadowOut: 'just off the plate',
  edge: 'on the edge',
  heart: 'down the middle',
  off: 'well off the plate',
};

/** Framing points: steal off the plate +2, keep the edge +1, lose a strike −2. */
export function points(p: Pitch): number {
  const r = region(p);
  if (r === 'shadowOut') return p.call === 'S' ? 2 : 0;
  if (r === 'edge') return p.call === 'S' ? 1 : -2;
  if (r === 'heart') return p.call === 'S' ? 0 : -2;
  return 0;
}

export const ROUND_SIZE = 20;

export function zoneStats(all: Pitch[]) {
  const steal = all.filter((p) => region(p) === 'shadowOut' && p.call === 'S').length;
  const lost = all.filter((p) => (region(p) === 'edge' || region(p) === 'heart') && p.call === 'B').length;
  const edge = all.filter((p) => region(p) === 'edge' || region(p) === 'shadowOut');
  const heart = all.filter((p) => region(p) === 'heart');
  const pct = (xs: Pitch[]) => (xs.length ? xs.filter((p) => p.call === 'S').length / xs.length : null);
  return { steal, lost, edgeRate: pct(edge), edgeCount: edge.length, heartRate: pct(heart) };
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f); rows.push(row); row = []; f = '';
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/** Reads a TrackMan session CSV and keeps only umpire-called pitches. */
export function parseTrackman(text: string): { pitches: Pitch[]; rows: number } | { error: string } {
  const rows = parseCSV(text);
  const head = (rows.shift() || []).map((h) => h.trim());
  const iS = head.indexOf('PlateLocSide');
  const iH = head.indexOf('PlateLocHeight');
  const iC = head.indexOf('PitchCall');
  if (iS < 0 || iH < 0 || iC < 0) {
    return { error: 'That file is missing PlateLocSide, PlateLocHeight or PitchCall. Export the full TrackMan session CSV.' };
  }
  const pitches: Pitch[] = [];
  for (const r of rows) {
    const x = parseFloat(r[iS]);
    const y = parseFloat(r[iH]);
    const c = (r[iC] || '').trim();
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (c === 'StrikeCalled' || c === 'BallCalled') pitches.push({ x, y, call: c === 'StrikeCalled' ? 'S' : 'B', src: 'trackman' });
  }
  return { pitches, rows: rows.length };
}
