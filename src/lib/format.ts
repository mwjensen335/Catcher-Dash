/** 0:03.42 */
export function fmt(t: number): string {
  t = Math.max(0, t || 0);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

export const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);

export const today = () => new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Deterministic random numbers so sample data looks the same on every load. */
export function seeded(seed: number) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = rnd();
    while (!v) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { rnd, gauss };
}
