// Original English typing content: sentences, paragraphs and quotes.
//
// All passages here are written for TypeFlow. Nothing is copied from commercial typing
// websites. Quotes are either original lines or public-domain material (works published
// before 1930 whose copyright has long expired), and each quote records its source.
//
// Topics: technology, education, science, communication, business, productivity,
// daily life and general knowledge.

import type { Difficulty } from '../lib/types';

export type Topic =
  | 'technology'
  | 'education'
  | 'science'
  | 'communication'
  | 'business'
  | 'productivity'
  | 'daily-life'
  | 'general-knowledge';

export interface Passage {
  id: string;
  text: string;
  difficulty: Difficulty;
  topic: Topic;
  /** Rough length band for the paragraph mode. */
  length: 'short' | 'medium' | 'long';
}

export interface Quote {
  id: string;
  text: string;
  source: string;
  difficulty: Difficulty;
  length: 'short' | 'medium' | 'long';
}

/** Single sentences for the sentence-practice mode. */
export const SENTENCES: Passage[] = [
  // Beginner - short, common words, little punctuation.
  { id: 's-b-1', difficulty: 'beginner', topic: 'daily-life', length: 'short', text: 'The sun came up over the quiet street and the day began.' },
  { id: 's-b-2', difficulty: 'beginner', topic: 'daily-life', length: 'short', text: 'She made a cup of tea and sat down to read her book.' },
  { id: 's-b-3', difficulty: 'beginner', topic: 'education', length: 'short', text: 'A good plan makes hard work feel much more simple.' },
  { id: 's-b-4', difficulty: 'beginner', topic: 'productivity', length: 'short', text: 'Keep your hands on the home row and let your eyes stay on the text.' },
  { id: 's-b-5', difficulty: 'beginner', topic: 'technology', length: 'short', text: 'The small blue light shows that the file was saved.' },
  { id: 's-b-6', difficulty: 'beginner', topic: 'daily-life', length: 'short', text: 'We walk to the park when the rain stops and the air feels warm.' },
  { id: 's-b-7', difficulty: 'beginner', topic: 'education', length: 'short', text: 'Read one page a day and you will finish many books in a year.' },
  { id: 's-b-8', difficulty: 'beginner', topic: 'general-knowledge', length: 'short', text: 'Most trees drop their leaves before the cold months come.' },
  { id: 's-b-9', difficulty: 'beginner', topic: 'communication', length: 'short', text: 'Say less and mean more when you write a short note.' },
  { id: 's-b-10', difficulty: 'beginner', topic: 'productivity', length: 'short', text: 'Slow and steady hands type more words than fast and wild ones.' },

  // Intermediate - longer clauses and everyday punctuation.
  { id: 's-i-1', difficulty: 'intermediate', topic: 'technology', length: 'medium', text: 'A reliable application stores its data carefully, validates every input, and explains any error in plain language.' },
  { id: 's-i-2', difficulty: 'intermediate', topic: 'business', length: 'medium', text: 'Before the meeting began, the team reviewed the budget, compared the figures, and agreed on a realistic deadline.' },
  { id: 's-i-3', difficulty: 'intermediate', topic: 'science', length: 'medium', text: 'Scientists repeat an experiment many times because a single result is rarely enough to support a confident conclusion.' },
  { id: 's-i-4', difficulty: 'intermediate', topic: 'education', length: 'medium', text: 'Learning a new skill feels slow at first, but regular practice turns awkward movements into comfortable habits.' },
  { id: 's-i-5', difficulty: 'intermediate', topic: 'communication', length: 'medium', text: 'Clear writing respects the reader: it uses short sentences, concrete examples, and a structure that is easy to follow.' },
  { id: 's-i-6', difficulty: 'intermediate', topic: 'productivity', length: 'medium', text: 'Finishing one task completely is usually more valuable than starting four tasks and leaving them half done.' },
  { id: 's-i-7', difficulty: 'intermediate', topic: 'daily-life', length: 'medium', text: 'The market opens early on Saturday, so we arrived at seven, filled two bags with vegetables, and walked home slowly.' },
  { id: 's-i-8', difficulty: 'intermediate', topic: 'general-knowledge', length: 'medium', text: 'Libraries are among the oldest public services, and many of them now lend digital books alongside printed ones.' },
  { id: 's-i-9', difficulty: 'intermediate', topic: 'technology', length: 'medium', text: 'A keyboard shortcut saves only a second, yet repeated a hundred times a day it returns real hours to your week.' },
  { id: 's-i-10', difficulty: 'intermediate', topic: 'business', length: 'medium', text: 'Honest feedback, given early and kindly, prevents small misunderstandings from growing into expensive problems.' },

  // Advanced - numbers, mixed punctuation, denser vocabulary.
  { id: 's-a-1', difficulty: 'advanced', topic: 'technology', length: 'medium', text: 'The deployment finished in 47 seconds; however, 3 of the 12 regression checks reported an intermittent timeout (retry #2 succeeded).' },
  { id: 's-a-2', difficulty: 'advanced', topic: 'science', length: 'medium', text: 'At 21 degrees Celsius the sample expanded by 0.8%, which is within the 1.5% tolerance quoted in the 1998 reference handbook.' },
  { id: 's-a-3', difficulty: 'advanced', topic: 'business', length: 'medium', text: 'Quarterly revenue rose 14.2% year-on-year, yet operating margin fell to 8.6% because logistics costs increased faster than prices.' },
  { id: 's-a-4', difficulty: 'advanced', topic: 'education', length: 'medium', text: 'The curriculum committee recommended 4 assessments per term: 2 written papers, 1 practical demonstration, and 1 collaborative project.' },
  { id: 's-a-5', difficulty: 'advanced', topic: 'communication', length: 'medium', text: '"Ambiguity," she argued, "is not a stylistic flourish - it is a defect that transfers your confusion onto the reader."' },
  { id: 's-a-6', difficulty: 'advanced', topic: 'productivity', length: 'medium', text: 'Measure throughput, not activity: 30 shallow interruptions produce far less than 90 uninterrupted minutes of concentrated effort.' },
  { id: 's-a-7', difficulty: 'advanced', topic: 'general-knowledge', length: 'medium', text: 'Approximately 71% of the planet is covered by water, although less than 3% of that volume is fresh and most of it is frozen.' },
  { id: 's-a-8', difficulty: 'advanced', topic: 'technology', length: 'medium', text: 'Version 2.4.1 deprecated the legacy endpoint; clients must migrate to /v3/records before 31 March, or requests will return 410.' },
  { id: 's-a-9', difficulty: 'advanced', topic: 'science', length: 'medium', text: 'Peer review is imperfect, unglamorous, and indispensable: it catches errors that enthusiasm alone would happily publish.' },
  { id: 's-a-10', difficulty: 'advanced', topic: 'daily-life', length: 'medium', text: 'The 6:15 train was cancelled, the 6:48 was full, and the 7:02 arrived 9 minutes late - so I walked the final kilometre.' },
];

/** Multi-sentence passages for the paragraph mode. */
export const PARAGRAPHS: Passage[] = [
  {
    id: 'p-b-1',
    difficulty: 'beginner',
    topic: 'productivity',
    length: 'short',
    text: 'Good typing starts with calm hands. Sit up straight and rest your fingers on the home row. Look at the text and not at the keys. Speed will come later, so for now just try to hit the right key each time.',
  },
  {
    id: 'p-b-2',
    difficulty: 'beginner',
    topic: 'daily-life',
    length: 'short',
    text: 'Every morning the baker opens the shop before the sun is up. She sets out warm bread and fresh rolls on a long wooden shelf. By eight the shop is full of people, and by noon the shelf is bare.',
  },
  {
    id: 'p-b-3',
    difficulty: 'beginner',
    topic: 'education',
    length: 'medium',
    text: 'Learning is a slow kind of magic. You read a page and feel that nothing has changed. You read ten pages and the words begin to fit. You read a hundred pages and you find that you can talk about the subject with ease. Small steps add up to large gains if you keep taking them.',
  },
  {
    id: 'p-i-1',
    difficulty: 'intermediate',
    topic: 'technology',
    length: 'medium',
    text: 'Software feels simple when it is designed well. The interface puts the important action in front of you, the words on the buttons mean exactly what they do, and nothing is hidden behind a mysterious icon. Achieving that simplicity is unglamorous work. It takes careful naming, patient testing, and the willingness to remove a feature that sounded clever but confused real people.',
  },
  {
    id: 'p-i-2',
    difficulty: 'intermediate',
    topic: 'communication',
    length: 'medium',
    text: 'Writing well is mostly rewriting. The first draft exists to discover what you actually think, and it is usually longer and vaguer than it needs to be. On the second pass you cut the padding, replace abstract nouns with concrete ones, and break long sentences into shorter ones. By the third pass the argument stands on its own, and a reader can follow it without effort.',
  },
  {
    id: 'p-i-3',
    difficulty: 'intermediate',
    topic: 'business',
    length: 'long',
    text: 'Small organisations succeed by deciding quickly and honestly. When a plan is not working, the useful response is to say so early, understand why, and change direction while the cost is still small. Teams that treat a changed plan as a failure tend to defend bad decisions far longer than they should. Teams that treat it as ordinary learning move faster, waste less, and keep the trust of the people they serve. Clear reporting helps enormously here: when everyone can see the same numbers, arguments about opinion turn into conversations about evidence, and the discussion becomes much shorter.',
  },
  {
    id: 'p-i-4',
    difficulty: 'intermediate',
    topic: 'science',
    length: 'long',
    text: 'The scientific method is less a fixed procedure than a habit of honesty. You state what you expect to happen, you design a test that could genuinely prove you wrong, and you record what actually happened rather than what you hoped for. Most experiments produce messy or uninteresting results, and that is normal. Progress comes from the slow accumulation of careful measurements, repeated by different people in different places until a pattern is solid enough to rely on. The discipline is not in being right the first time. It is in being willing to find out that you were not.',
  },
  {
    id: 'p-a-1',
    difficulty: 'advanced',
    topic: 'technology',
    length: 'long',
    text: 'Reliability is a product of boring decisions. A system that stores its state in one well-understood place, validates every input at the boundary, and fails loudly rather than silently will outlast a cleverer design that depends on five fragile assumptions. The temptation, of course, is to optimise prematurely: to shard the data before there is enough of it, to cache before measuring, or to introduce a queue because a diagram looked impressive. Experienced engineers resist this not because complexity is forbidden, but because every added component is a new way for the system to break at 3 a.m. - and at that hour, "simple and obvious" is worth more than "elegant and surprising".',
  },
  {
    id: 'p-a-2',
    difficulty: 'advanced',
    topic: 'general-knowledge',
    length: 'long',
    text: 'The QWERTY layout was patented in the 1870s for mechanical typewriters, and its arrangement reflects the constraints of metal typebars rather than any theory of finger efficiency. Alternative layouts such as Dvorak and Colemak were designed later with explicit ergonomic goals, and they do reduce finger travel measurably. Yet QWERTY remains dominant for an unromantic reason: switching costs. Keyboards, training material, workplace machines, and 150 years of muscle memory all reinforce one another. It is a useful reminder that in technology the best-designed option does not automatically win; the option that is already everywhere usually does, and improvements tend to arrive as careful adjustments rather than as clean replacements.',
  },
  {
    id: 'p-a-3',
    difficulty: 'advanced',
    topic: 'productivity',
    length: 'medium',
    text: 'Deliberate practice differs from repetition in one crucial respect: it targets the specific thing you cannot yet do. Typing the same comfortable words for 30 minutes builds confidence but little capability. Spending 10 focused minutes on the sequences that trip you up - the double letters, the number row, the punctuation your fingers avoid - is slower, more irritating, and considerably more effective. Measure the gap, attack the gap, and re-measure; everything else is pleasant exercise.',
  },
];

/** Quotes: original lines plus public-domain material with sources recorded. */
export const QUOTES: Quote[] = [
  { id: 'q-1', difficulty: 'beginner', length: 'short', source: 'TypeFlow (original)', text: 'Type faster by first learning to type right.' },
  { id: 'q-2', difficulty: 'beginner', length: 'short', source: 'TypeFlow (original)', text: 'Accuracy is speed that you get to keep.' },
  { id: 'q-3', difficulty: 'beginner', length: 'short', source: 'TypeFlow (original)', text: 'Practice a little every day and the keyboard stops being in your way.' },
  { id: 'q-4', difficulty: 'beginner', length: 'short', source: 'Traditional English proverb (public domain)', text: 'Well begun is half done.' },
  { id: 'q-5', difficulty: 'beginner', length: 'short', source: 'Traditional English proverb (public domain)', text: 'A journey of a thousand miles begins with a single step.' },
  {
    id: 'q-6',
    difficulty: 'intermediate',
    length: 'medium',
    source: 'Marcus Aurelius, Meditations (public domain translation)',
    text: 'You have power over your mind, not outside events. Realise this, and you will find strength.',
  },
  {
    id: 'q-7',
    difficulty: 'intermediate',
    length: 'medium',
    source: 'Jane Austen, Pride and Prejudice, 1813 (public domain)',
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.',
  },
  {
    id: 'q-8',
    difficulty: 'intermediate',
    length: 'medium',
    source: 'Charles Dickens, A Tale of Two Cities, 1859 (public domain)',
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
  },
  {
    id: 'q-9',
    difficulty: 'intermediate',
    length: 'short',
    source: 'Henry David Thoreau, Walden, 1854 (public domain)',
    text: 'Our life is frittered away by detail. Simplify, simplify.',
  },
  {
    id: 'q-10',
    difficulty: 'intermediate',
    length: 'medium',
    source: 'TypeFlow (original)',
    text: 'The keyboard rewards patience: the hands that hurry make the errors that the clock must later pay for.',
  },
  {
    id: 'q-11',
    difficulty: 'advanced',
    length: 'long',
    source: 'Abraham Lincoln, Gettysburg Address, 1863 (public domain)',
    text: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
  },
  {
    id: 'q-12',
    difficulty: 'advanced',
    length: 'long',
    source: 'Mary Shelley, Frankenstein, 1818 (public domain)',
    text: 'Nothing is so painful to the human mind as a great and sudden change. The sun might shine, or the clouds might lower; but nothing could appear to me as it had done the day before.',
  },
  {
    id: 'q-13',
    difficulty: 'advanced',
    length: 'medium',
    source: 'Sun Tzu, The Art of War (public domain translation)',
    text: 'In the midst of chaos, there is also opportunity. Opportunities multiply as they are seized.',
  },
  {
    id: 'q-14',
    difficulty: 'advanced',
    length: 'long',
    source: 'TypeFlow (original)',
    text: 'Measure what you are actually trying to improve: 90% accuracy at 70 words per minute is not faster than 98% accuracy at 60, because every uncorrected error costs you the time you thought you had saved.',
  },
  {
    id: 'q-15',
    difficulty: 'advanced',
    length: 'medium',
    source: 'Lewis Carroll, Through the Looking-Glass, 1871 (public domain)',
    text: '"Now, here, you see, it takes all the running you can do, to keep in the same place."',
  },
];

export function passagesFor(
  pool: Passage[],
  difficulty: Difficulty,
  length?: 'short' | 'medium' | 'long',
): Passage[] {
  return pool.filter((p) => p.difficulty === difficulty && (!length || p.length === length));
}
