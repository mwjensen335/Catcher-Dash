import type { Clip } from './types';

export interface TimingResult { ex: number | null; fl: number | null; pop: number | null }

/** Exchange = catch → release, flight = release → arrival, pop = catch → arrival. */
export function timingOf(c: Pick<Clip, 'timing'>): TimingResult {
  const { catch: a, release: r, arrive: z } = c.timing || {};
  const span = (x?: number, y?: number) => (x != null && y != null && y > x ? y - x : null);
  return { ex: span(a, r), fl: span(r, z), pop: span(a, z) };
}
