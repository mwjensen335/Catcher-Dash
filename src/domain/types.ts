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

/* ---------- Lessons ---------- */
/** One block of a lesson plan. `to` links the block to the tool used for it. */
export interface PlanItem { min: number; area: Area; drill: string; detail: string; to?: string }
export interface Homework { text: string; done: boolean }
export interface Recap {
  summary: string;
  wins: string[];
  workOns: string[];
  clipIds: string[];
  homework: Homework[];
}
export interface Lesson {
  id: string;
  catcher: string;
  coach: string;
  /** Local start time. */
  start: Date;
  minutes: number;
  location: string;
  focus: Area;
  goal: string;
  plan: PlanItem[];
  /** Filled in by the coach after the lesson. */
  recap?: Recap;
}

/** A number we track over time: where it was, where it is now. */
export interface Progress { label: string; unit: string; from: number; to: number; since: string; lowerIsBetter?: boolean; digits: number }
