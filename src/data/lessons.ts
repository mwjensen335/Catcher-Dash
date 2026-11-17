import type { Lesson } from '../domain/types';

/** A date `days` from today at hh:mm, so the sample schedule always looks current. */
function at(days: number, hh: number, mm = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d;
}

const CATCHER = 'Sample catcher A';
const COACH = 'Coach Sample';
const WHERE = '5 Tool Performance · Cage 2';

/** Sample lessons for one catcher: three done, one today, two coming up. */
export function sampleLessons(): Lesson[] {
  return [
    {
      id: 'lesson-today', catcher: CATCHER, coach: COACH, start: at(0, 16, 30), minutes: 60, location: WHERE,
      focus: 'Blocking',
      goal: 'Keep the chest square on glove-side balls in the dirt. Last session 3 of 10 got away to that side.',
      plan: [
        { min: 10, area: 'Receiving', drill: 'Warm-up and catch play', detail: 'Short toss, then 15 firm throws from the knees.' },
        { min: 15, area: 'Blocking', drill: 'Glove-side angle blocks', detail: 'Coach feeds 3 sets of 8 from 30 ft. Chest turned in, ball dies in front.', to: '/blocking' },
        { min: 15, area: 'Blocking', drill: '10-ball gauntlet × 2', detail: 'Random spots. Beat your best of 15 points.', to: '/blocking' },
        { min: 10, area: 'Receiving', drill: 'Low-away framing round', detail: 'One Zone Game round of 20. Stick every low pitch for a full second.', to: '/zone' },
        { min: 10, area: 'Blocking', drill: 'Film review', detail: 'Watch today\'s gauntlet back with the coach and pick one rep to fix.', to: '/review' },
      ],
    },
    {
      id: 'lesson-3', catcher: CATCHER, coach: COACH, start: at(-4, 16, 30), minutes: 60, location: WHERE,
      focus: 'Blocking',
      goal: 'Faster drop on short hops.',
      plan: [
        { min: 15, area: 'Blocking', drill: 'Drop-and-hold from the knees', detail: '3 × 10, no ball.' },
        { min: 25, area: 'Blocking', drill: '10-ball gauntlet × 3', detail: 'Random spots.', to: '/blocking' },
        { min: 20, area: 'Throwing', drill: 'Exchange reps', detail: '20 throws to 2B, film from the side.' },
      ],
      recap: {
        summary: 'Big jump in drop speed. Knees are hitting the ground before the ball now on almost every rep. The one thing left is glove-side balls: the chest opens toward first base and the ball kicks away.',
        wins: ['Drop speed. Knees down before the ball on 9 of 10 reps.', 'Gauntlet score 15, a new best.', 'Exchange under 0.80 s on every filmed throw.'],
        workOns: ['Square the chest to the ball on glove-side blocks, not to the plate.', 'Get the glove down between the knees first, then the body.'],
        clipIds: ['sample-blocking'],
        homework: [
          { text: '3 sets of 10 drop-and-holds at home, every other day', done: true },
          { text: 'Upload one clip of glove-side blocks from the side', done: false },
        ],
      },
    },
    {
      id: 'lesson-2', catcher: CATCHER, coach: COACH, start: at(-11, 16, 30), minutes: 60, location: WHERE,
      focus: 'Receiving',
      goal: 'Steal the low-away strike.',
      plan: [
        { min: 30, area: 'Receiving', drill: 'Low-away framing', detail: 'Zone Game rounds × 3.', to: '/zone' },
        { min: 30, area: 'Receiving', drill: 'One-knee setup', detail: 'Compare one-knee and two-knee on low pitches.' },
      ],
      recap: {
        summary: 'Framing low is a real strength. Glove drift after the catch is costing edge strikes on the arm side.',
        wins: ['Edge strike rate up to 33% in the Zone Game, from 28%.', 'Relaxed glove, thumb under, on low pitches.'],
        workOns: ['Stick the pitch for a full second. No drift off the plate.'],
        clipIds: ['sample-framing'],
        homework: [{ text: '2 Zone Game rounds with a parent calling pitches', done: true }],
      },
    },
    {
      id: 'lesson-1', catcher: CATCHER, coach: COACH, start: at(-18, 16, 30), minutes: 60, location: WHERE,
      focus: 'Throwing',
      goal: 'Get pop time to 2B under 2.05 s.',
      plan: [
        { min: 20, area: 'Throwing', drill: 'Footwork ladder', detail: 'Jab-pivot and replace-step, no ball.' },
        { min: 40, area: 'Throwing', drill: 'Pop time to 2B', detail: '15 timed throws on video.', to: '/review' },
      ],
      recap: {
        summary: 'Clean transfer. The front foot opens early, so throws run to the first-base side of the bag.',
        wins: ['Best pop time 2.03 s.', 'Ball out of the glove fast.'],
        workOns: ['Keep the front shoulder closed until the arm comes through.'],
        clipIds: ['sample-throwing'],
        homework: [{ text: '50 replace-step reps against a wall', done: true }],
      },
    },
    {
      id: 'lesson-next', catcher: CATCHER, coach: COACH, start: at(3, 16, 30), minutes: 60, location: WHERE,
      focus: 'Throwing', goal: 'Hold the exchange gains with a closed front shoulder.', plan: [],
    },
    {
      id: 'lesson-after', catcher: CATCHER, coach: COACH, start: at(10, 16, 30), minutes: 60, location: WHERE,
      focus: 'Game Calling', goal: 'Sequencing against a lefty-heavy lineup.', plan: [],
    },
  ];
}
