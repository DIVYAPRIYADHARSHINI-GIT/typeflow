// Progressive typing lessons.
//
// Lessons are grouped into levels that build on each other: home row first, then the
// surrounding rows, then hand isolation, then capitals/numbers/punctuation, then real
// words and sentences. Every exercise text is original and uses only the keys the lesson
// has introduced so far, which is what makes the progression actually teachable.

import type { Difficulty } from '../lib/types';

export interface Lesson {
  id: string;
  level: number;
  levelTitle: string;
  title: string;
  /** Short explanation shown above the exercise. */
  explanation: string;
  /** The exact text the learner types. */
  text: string;
  difficulty: Difficulty;
  /** Pass marks - the lesson is marked complete when both are met. */
  targetWpm: number;
  targetAccuracy: number;
}

export const LESSONS: Lesson[] = [
  // Level 1 - home row
  {
    id: 'l1-1',
    level: 1,
    levelTitle: 'Level 1 - Home row',
    title: 'Home row anchors: f and j',
    explanation:
      'Rest your left index finger on F and your right index finger on J. Both keys have a small raised bump so you can find them without looking. Your thumbs rest on the space bar.',
    text: 'fff jjj fff jjj fj fj jf jf ffj jjf fjf jfj fj jf fff jjj',
    difficulty: 'beginner',
    targetWpm: 10,
    targetAccuracy: 90,
  },
  {
    id: 'l1-2',
    level: 1,
    levelTitle: 'Level 1 - Home row',
    title: 'Adding d and k',
    explanation: 'Your middle fingers cover D on the left and K on the right. Keep the index fingers resting on F and J between strokes.',
    text: 'ddd kkk dk kd dkd kdk fdk jkd dfk kjd dk kd fjdk kdjf dkfj',
    difficulty: 'beginner',
    targetWpm: 10,
    targetAccuracy: 90,
  },
  {
    id: 'l1-3',
    level: 1,
    levelTitle: 'Level 1 - Home row',
    title: 'Adding s and l',
    explanation: 'Ring fingers cover S and L. These fingers are the weakest, so press lightly and keep the movement small.',
    text: 'sss lll sl ls sls lsl dsl kls fsl jls sldk lsfj slkd lsjf sl ls',
    difficulty: 'beginner',
    targetWpm: 12,
    targetAccuracy: 90,
  },
  {
    id: 'l1-4',
    level: 1,
    levelTitle: 'Level 1 - Home row',
    title: 'Complete home row: a and ;',
    explanation: 'Little fingers cover A on the left and the semicolon on the right. You now have the full home row: a s d f  j k l ;',
    text: 'aaa ;;; a; ;a as la ask sad lad fall flask salad alfalfa ask dad; a lass;',
    difficulty: 'beginner',
    targetWpm: 12,
    targetAccuracy: 90,
  },
  {
    id: 'l1-5',
    level: 1,
    levelTitle: 'Level 1 - Home row',
    title: 'Home row words',
    explanation: 'Real words using only home-row keys. Return every finger to its home position after each stroke.',
    text: 'all ask lad fad sad flask salad falls asks lads glass a fall; all flasks; sal asks dad',
    difficulty: 'beginner',
    targetWpm: 15,
    targetAccuracy: 92,
  },

  // Level 2 - top row
  {
    id: 'l2-1',
    level: 2,
    levelTitle: 'Level 2 - Top row',
    title: 'Top row: e, i, r, u',
    explanation: 'Reach up with the index and middle fingers. E sits above D, I above K, R above F, U above J. Return to the home row immediately after each reach.',
    text: 'ded kik frf juj ded kik frf juj deer rude fire user ride side true ire',
    difficulty: 'beginner',
    targetWpm: 15,
    targetAccuracy: 90,
  },
  {
    id: 'l2-2',
    level: 2,
    levelTitle: 'Level 2 - Top row',
    title: 'Top row: w, o, q, p',
    explanation: 'Ring and little fingers reach up: W above S, O above L, Q above A, P above the semicolon. Keep your wrists steady.',
    text: 'sws lol aqa ;p; sws lol wow pop quip pour word push quail supper prose',
    difficulty: 'beginner',
    targetWpm: 15,
    targetAccuracy: 90,
  },
  {
    id: 'l2-3',
    level: 2,
    levelTitle: 'Level 2 - Top row',
    title: 'Top row: t and y',
    explanation: 'T and Y are the long index-finger reaches. T belongs to the left index finger, Y to the right. Resist the urge to swap hands.',
    text: 'ftf jyj ftf jyj try type tyre yet that they tidy party rusty quietly tasty',
    difficulty: 'beginner',
    targetWpm: 18,
    targetAccuracy: 90,
  },
  {
    id: 'l2-4',
    level: 2,
    levelTitle: 'Level 2 - Top row',
    title: 'Home and top row together',
    explanation: 'Mix both rows at a steady pace. Accuracy matters far more than speed here.',
    text: 'the quiet writer tried the first idea; our reports are ready; stop that silly quarrel; piles of paper sit on the desk',
    difficulty: 'beginner',
    targetWpm: 18,
    targetAccuracy: 92,
  },

  // Level 3 - bottom row
  {
    id: 'l3-1',
    level: 3,
    levelTitle: 'Level 3 - Bottom row',
    title: 'Bottom row: c, comma, v, m',
    explanation: 'Curl your fingers down without moving your whole hand. C sits under D, the comma under K, V under F, M under J.',
    text: 'dcd k,k fvf jmj dcd k,k cave move vice come cover, vacuum, climb, music,',
    difficulty: 'beginner',
    targetWpm: 18,
    targetAccuracy: 90,
  },
  {
    id: 'l3-2',
    level: 3,
    levelTitle: 'Level 3 - Bottom row',
    title: 'Bottom row: x, z, full stop, slash',
    explanation: 'The outer bottom keys use the ring and little fingers: X under S, Z under A, full stop under L, slash under the semicolon.',
    text: 'sxs aza l.l ;/; six zoo lazy extra. zebra. exact. sizes/boxes. puzzle.',
    difficulty: 'beginner',
    targetWpm: 18,
    targetAccuracy: 90,
  },
  {
    id: 'l3-3',
    level: 3,
    levelTitle: 'Level 3 - Bottom row',
    title: 'Bottom row: b and n',
    explanation: 'B and N are index-finger reaches across the bottom row. B belongs to the left hand, N to the right.',
    text: 'fbf jnj fbf jnj bin numb bend number nimble bank nebula bubble banner',
    difficulty: 'beginner',
    targetWpm: 20,
    targetAccuracy: 90,
  },
  {
    id: 'l3-4',
    level: 3,
    levelTitle: 'Level 3 - Bottom row',
    title: 'All three rows',
    explanation: 'You now have every letter. Type slowly and let each finger return home between strokes.',
    text: 'the brave zebra quickly jumped over six lazy dogs, and every judge in town wrote a calm, exact remark.',
    difficulty: 'intermediate',
    targetWpm: 20,
    targetAccuracy: 92,
  },

  // Level 4 - hand isolation
  {
    id: 'l4-1',
    level: 4,
    levelTitle: 'Level 4 - Hand practice',
    title: 'Left-hand words',
    explanation: 'These words use only left-hand keys. Isolating one hand exposes weak ring and little fingers.',
    text: 'water sweat dress cards stage trade grade fewer breeze average west stress care edge',
    difficulty: 'intermediate',
    targetWpm: 20,
    targetAccuracy: 92,
  },
  {
    id: 'l4-2',
    level: 4,
    levelTitle: 'Level 4 - Hand practice',
    title: 'Right-hand words',
    explanation: 'These words use only right-hand keys. Keep the hand still and move only the fingers.',
    text: 'you him oil pin lump hill moon nylon jolly onion hook muddy puppy million opinion',
    difficulty: 'intermediate',
    targetWpm: 20,
    targetAccuracy: 92,
  },
  {
    id: 'l4-3',
    level: 4,
    levelTitle: 'Level 4 - Hand practice',
    title: 'Alternating hands',
    explanation: 'Words that switch hands on almost every letter. These build rhythm and are the fastest words to type once learned.',
    text: 'the and with them they rich dial born they turn wish city busy also flame right handle problem authentic',
    difficulty: 'intermediate',
    targetWpm: 25,
    targetAccuracy: 93,
  },
  {
    id: 'l4-4',
    level: 4,
    levelTitle: 'Level 4 - Hand practice',
    title: 'Commonly confused letters',
    explanation: 'Pairs that typists regularly swap: b/v, m/n, i/o, e/r and t/y. Slow down deliberately on each pair.',
    text: 'verb brave above vibe; minimum common name; point coin oil; there were red; tidy yet type; believe movement invite',
    difficulty: 'intermediate',
    targetWpm: 25,
    targetAccuracy: 93,
  },

  // Level 5 - capitals, numbers, punctuation
  {
    id: 'l5-1',
    level: 5,
    levelTitle: 'Level 5 - Capitals, numbers, punctuation',
    title: 'Capital letters',
    explanation: 'Use the opposite-hand Shift key: a left-hand letter takes the right Shift, and a right-hand letter takes the left Shift. Never use the same hand for both.',
    text: 'April Brazil Canada Denmark Everest France Germany Houston India Japan Kenya London Mexico Norway Oslo Paris Quebec Rome Spain Turkey',
    difficulty: 'intermediate',
    targetWpm: 22,
    targetAccuracy: 92,
  },
  {
    id: 'l5-2',
    level: 5,
    levelTitle: 'Level 5 - Capitals, numbers, punctuation',
    title: 'Number row',
    explanation: 'Each finger reaches straight up from its home key: 1 and 2 for the left little and ring fingers, 4 and 5 for the left index, 6 and 7 for the right index, 9 and 0 for the right ring and little fingers.',
    text: '1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 2024 1998 365 24 60 100 1440 2500 48 72',
    difficulty: 'intermediate',
    targetWpm: 18,
    targetAccuracy: 90,
  },
  {
    id: 'l5-3',
    level: 5,
    levelTitle: 'Level 5 - Capitals, numbers, punctuation',
    title: 'Punctuation and symbols',
    explanation: 'Punctuation is mostly little-finger work combined with Shift. Keep your other fingers anchored on the home row while you reach.',
    text: 'Yes, of course! Why not? "Quoted text" - a dash; a semicolon: a colon. (brackets) 50% @ work #1 &more',
    difficulty: 'advanced',
    targetWpm: 20,
    targetAccuracy: 90,
  },
  {
    id: 'l5-4',
    level: 5,
    levelTitle: 'Level 5 - Capitals, numbers, punctuation',
    title: 'Mixed capitals, numbers and punctuation',
    explanation: 'Realistic text that combines everything from this level. This is the pattern most real writing follows.',
    text: 'On 14 March 2024, the team reviewed 3 reports, rejected 1 proposal, and approved a budget of 48,500 for the next quarter.',
    difficulty: 'advanced',
    targetWpm: 25,
    targetAccuracy: 92,
  },

  // Level 6 - fluency
  {
    id: 'l6-1',
    level: 6,
    levelTitle: 'Level 6 - Fluency',
    title: 'The 100 most frequent words',
    explanation: 'A small set of words makes up roughly half of all written English. Typing them automatically gives the biggest single speed gain.',
    text: 'the of and a to in is you that it he was for on are as with his they I at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so',
    difficulty: 'intermediate',
    targetWpm: 30,
    targetAccuracy: 94,
  },
  {
    id: 'l6-2',
    level: 6,
    levelTitle: 'Level 6 - Fluency',
    title: 'Sentence rhythm',
    explanation: 'Full sentences with ordinary punctuation. Aim for an even pace rather than bursts of speed.',
    text: 'The report arrived late, but the figures were correct. She checked each column twice, saved the file, and sent a short note to the team. Nobody needed to ask a second question.',
    difficulty: 'intermediate',
    targetWpm: 32,
    targetAccuracy: 94,
  },
  {
    id: 'l6-3',
    level: 6,
    levelTitle: 'Level 6 - Fluency',
    title: 'Paragraph endurance',
    explanation: 'A longer passage tests stamina. Keep your shoulders relaxed and your wrists off the desk edge.',
    text: 'Good habits are built from small, repeated decisions. A typist who practises for ten focused minutes each day will pass one who practises for two hours once a month. The reason is simple: skill is stored in movement, and movement is learned by repetition, not by effort alone. Keep the sessions short, keep them regular, and let the progress accumulate quietly.',
    difficulty: 'advanced',
    targetWpm: 35,
    targetAccuracy: 95,
  },
  {
    id: 'l6-4',
    level: 6,
    levelTitle: 'Level 6 - Fluency',
    title: 'Technical text',
    explanation: 'Dense vocabulary, numbers and punctuation together - the hardest ordinary text to type well.',
    text: 'The build completed in 12.4 seconds and produced a 418 KB bundle. Of the 64 automated checks, 64 passed; coverage held at 91%, and no console errors appeared during the 3-minute smoke test.',
    difficulty: 'advanced',
    targetWpm: 35,
    targetAccuracy: 95,
  },
];

export const LESSON_LEVELS = [...new Set(LESSONS.map((l) => l.level))].sort((a, b) => a - b);

export function lessonsByLevel(level: number): Lesson[] {
  return LESSONS.filter((l) => l.level === level);
}

export function findLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
