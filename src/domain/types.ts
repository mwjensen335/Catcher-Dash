export type Area = 'Receiving' | 'Blocking' | 'Throwing' | 'Game Calling';
export const AREAS: Area[] = ['Receiving', 'Blocking', 'Throwing', 'Game Calling'];

export type NoteKind = 'good' | 'fix' | 'note' | 'voice';
export interface Note { t: number; k: NoteKind; text: string }

export type Tool = 'pen' | 'arrow' | 'circle' | 'angle';
/** A drawing pinned to a moment in the clip. Points are 0–1, relative to the video frame. */
export interface Shape { t: number; tool: Tool; color: string; pts: [number, number][] }

export interface Timing { catch?: number; release?: number; arrive?: number }

export interface Clip {
  id: string;
  title: string;
  catcher: string;
  area: Area;
  by: 'Catcher' | 'Coach';
  date: string;
  /** 'demo' clips are drawn on a canvas so the app has something to show before uploads exist. */
  kind: 'demo' | 'video';
  src?: string;
  duration: number;
  notes: Note[];
  drawings: Shape[];
  timing: Timing;
  scores: Record<number, number>;
  audio?: string | null;
  /** Set when this clip is a recorded coach review of another clip. */
  reviewOf?: string;
}

export interface Pitch { x: number; y: number; call: 'S' | 'B'; src: 'sample' | 'coach' | 'trackman' }

export type BlockOutcome = 'sm' | 'rb' | 'pb';
export interface BlockRep { c: number; r: number; out: BlockOutcome }

export const NOTE_LABEL: Record<NoteKind, string> = { good: 'Doing well', fix: 'Fix', note: 'Note', voice: 'Voice' };
