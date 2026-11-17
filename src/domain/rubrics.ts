import type { Area } from './types';

export const RUBRIC: Record<Area, string[]> = {
  Receiving: ['Setup and stance', 'Glove presentation', 'Beats the ball to the spot', 'Sticks the pitch'],
  Blocking: ['Drop speed', 'Chest square to the ball', 'Glove seals the gap', 'Ball stays in front'],
  Throwing: ['Exchange', 'Footwork', 'Arm path', 'Accuracy to the bag'],
  'Game Calling': ['Pitch selection', 'Signs and pace', 'Reads the hitter', 'Communication'],
};
