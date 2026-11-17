import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BlockRep, Clip, Pitch } from '../domain/types';
import { sampleBlockReps, sampleClips, samplePitches } from './sample';

/*
 * App state. Today it lives in memory and resets on reload (demo mode).
 * Next step: swap these setters for Supabase reads/writes (see supabase/schema.sql),
 * keeping the same shape so the pages don't change.
 */
interface State {
  clips: Clip[];
  pitches: Pitch[];
  zoneRoundStart: number;
  zoneBest: number;
  blockReps: BlockRep[];
  blockStart: number;
  blockBest: number;
}

interface Store extends State {
  addClip(c: Clip): void;
  updateClip(id: string, fn: (c: Clip) => Clip): void;
  setZone(fn: (s: Pick<State, 'pitches' | 'zoneRoundStart' | 'zoneBest'>) => Pick<State, 'pitches' | 'zoneRoundStart' | 'zoneBest'>): void;
  setBlock(fn: (s: Pick<State, 'blockReps' | 'blockStart' | 'blockBest'>) => Pick<State, 'blockReps' | 'blockStart' | 'blockBest'>): void;
}

const Ctx = createContext<Store | null>(null);

function initial(): State {
  const pitches = samplePitches();
  const blockReps = sampleBlockReps();
  return { clips: sampleClips(), pitches, zoneRoundStart: pitches.length, zoneBest: 14, blockReps, blockStart: blockReps.length, blockBest: 15 };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(initial);
  const addClip = useCallback((c: Clip) => set((p) => ({ ...p, clips: [c, ...p.clips] })), []);
  const updateClip = useCallback((id: string, fn: (c: Clip) => Clip) => set((p) => ({ ...p, clips: p.clips.map((c) => (c.id === id ? fn(c) : c)) })), []);
  const setZone: Store['setZone'] = useCallback((fn) => set((p) => ({ ...p, ...fn({ pitches: p.pitches, zoneRoundStart: p.zoneRoundStart, zoneBest: p.zoneBest }) })), []);
  const setBlock: Store['setBlock'] = useCallback((fn) => set((p) => ({ ...p, ...fn({ blockReps: p.blockReps, blockStart: p.blockStart, blockBest: p.blockBest }) })), []);
  const value = useMemo(() => ({ ...s, addClip, updateClip, setZone, setBlock }), [s, addClip, updateClip, setZone, setBlock]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
