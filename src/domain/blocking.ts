import type { BlockOutcome, BlockRep } from './types';

export const COLS = ['Glove side', 'Middle', 'Arm side'];
export const ROWS = ['Long hop', 'Mid hop', 'Short hop'];
export const BLOCK_POINTS: Record<BlockOutcome, number> = { sm: 2, rb: 1, pb: 0 };
export const BLOCK_LABEL: Record<BlockOutcome, string> = { sm: 'Smothered', rb: 'Blocked, kicked away', pb: 'Got by' };
export const GAUNTLET_SIZE = 10;

export const blocked = (r: BlockRep) => r.out !== 'pb';

export function cellRate(reps: BlockRep[], c: number, r: number) {
  const inCell = reps.filter((q) => q.c === c && q.r === r);
  return { n: inCell.length, rate: inCell.length ? inCell.filter(blocked).length / inCell.length : 0 };
}

export function weakestCell(reps: BlockRep[], minReps = 4) {
  let worst: { c: number; r: number; rate: number } | null = null;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const s = cellRate(reps, c, r);
      if (s.n < minReps) continue;
      if (!worst || s.rate < worst.rate) worst = { c, r, rate: s.rate };
    }
  return worst;
}
