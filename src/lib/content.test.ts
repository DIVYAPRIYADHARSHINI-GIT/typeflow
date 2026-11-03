// Tests for text generation, the keyboard/finger map, and the shipped content library.

import { describe, expect, it } from 'vitest';
import {
  countWords,
  decorateWord,
  generateText,
  generateWords,
  hashSeed,
  makeRng,
  wordPool,
  wordsForDuration,
} from './generator';
import { FINGER_LABELS, KEYBOARD_ROWS, handOf, keyHintFor } from './keyboard';
import { CODE_SNIPPETS, snippetsFor } from '../content/code';
import { LESSONS, LESSON_LEVELS, findLesson, lessonsByLevel } from '../content/lessons';
import { PARAGRAPHS, QUOTES, SENTENCES } from '../content/passages';
import { ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS } from '../content/words';
import type { TestConfig } from './types';

const plain = { punctuation: false, numbers: false, capitalisation: false };

function config(overrides: Partial<TestConfig> = {}): TestConfig {
  return {
    mode: 'time',
    difficulty: 'beginner',
    durationSec: 60,
    wordCount: null,
    options: plain,
    label: 'test',
    ...overrides,
  };
}

describe('seeded random number generator', () => {
  it('produces the same sequence for the same seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different sequences for different seeds', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });

  it('stays within the 0..1 range', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 200; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashes a string into a stable seed', () => {
    expect(hashSeed('typeflow')).toBe(hashSeed('typeflow'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('word generation', () => {
  it('generates the requested number of words', () => {
    expect(countWords(generateWords(25, 'beginner', plain, 1))).toBe(25);
  });

  it('generates identical text for the same seed', () => {
    expect(generateWords(20, 'beginner', plain, 7)).toBe(generateWords(20, 'beginner', plain, 7));
  });

  it('generates different text for different seeds', () => {
    expect(generateWords(20, 'beginner', plain, 7)).not.toBe(generateWords(20, 'beginner', plain, 8));
  });

  it('draws only from the requested difficulty pool when undecorated', () => {
    const words = generateWords(40, 'beginner', plain, 5).split(' ');
    for (const word of words) expect(BEGINNER_WORDS).toContain(word);
  });

  it('selects a different pool per difficulty', () => {
    expect(wordPool('beginner')).toBe(BEGINNER_WORDS);
    expect(wordPool('intermediate')).toBe(INTERMEDIATE_WORDS);
    expect(wordPool('advanced')).toBe(ADVANCED_WORDS);
  });

  it('produces plain lower-case text with no options enabled', () => {
    expect(generateWords(30, 'beginner', plain, 3)).toMatch(/^[a-z ]+$/);
  });

  it('never emits a double space', () => {
    expect(generateWords(50, 'intermediate', plain, 11)).not.toMatch(/ {2}/);
  });

  it('adds punctuation when the option is enabled', () => {
    const text = generateWords(120, 'beginner', { ...plain, punctuation: true }, 4);
    expect(text).toMatch(/[.,!?;:'-]/);
  });

  it('adds digits when the numbers option is enabled', () => {
    const text = generateWords(150, 'beginner', { ...plain, numbers: true }, 4);
    expect(text).toMatch(/\d/);
  });

  it('capitalises the first character when capitalisation is enabled', () => {
    const text = generateWords(20, 'beginner', { ...plain, capitalisation: true }, 4);
    expect(text[0]).toBe(text[0].toUpperCase());
  });

  it('leaves a word unchanged when no options apply', () => {
    expect(decorateWord('hello', plain, makeRng(1))).toBe('hello');
  });

  it('generates enough words to outlast a long timed test', () => {
    expect(wordsForDuration(300)).toBeGreaterThan(500);
    expect(wordsForDuration(15)).toBeGreaterThanOrEqual(40);
  });

  it('counts words from arbitrary whitespace', () => {
    expect(countWords('  one   two\nthree ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
});

describe('generateText per mode', () => {
  it('produces word text for a timed test', () => {
    const { text } = generateText(config({ mode: 'time', durationSec: 60 }), 10);
    expect(countWords(text)).toBeGreaterThan(50);
  });

  it('produces exactly the requested words for a word-count test', () => {
    const { text } = generateText(config({ mode: 'words', durationSec: null, wordCount: 25 }), 10);
    expect(countWords(text)).toBe(25);
  });

  it('returns a quote with its source as the caption', () => {
    const result = generateText(config({ mode: 'quote', durationSec: null }), 10);
    expect(result.caption).toBeTruthy();
    expect(QUOTES.some((q) => q.text === result.text)).toBe(true);
  });

  it('returns a shipped sentence for the sentence mode', () => {
    const result = generateText(config({ mode: 'sentence', durationSec: null }), 10);
    expect(SENTENCES.some((s) => s.text === result.text)).toBe(true);
  });

  it('returns a shipped paragraph for the paragraph mode', () => {
    const result = generateText(config({ mode: 'paragraph', durationSec: null, difficulty: 'advanced' }), 10);
    expect(PARAGRAPHS.some((p) => p.text === result.text)).toBe(true);
  });

  it('returns a snippet of the requested language for the coding mode', () => {
    const result = generateText(config({ mode: 'code', durationSec: null, language: 'python' }), 10);
    const snippet = CODE_SNIPPETS.find((s) => s.text === result.text);
    expect(snippet?.language).toBe('python');
  });

  it('returns the lesson text for a lesson test', () => {
    const lesson = LESSONS[0];
    const result = generateText(config({ mode: 'lesson', durationSec: null, lessonId: lesson.id }), 10);
    expect(result.text).toBe(lesson.text);
  });

  it('falls back safely for an unknown lesson id', () => {
    const result = generateText(config({ mode: 'lesson', durationSec: null, lessonId: 'does-not-exist' }), 10);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('is reproducible for the same config and seed', () => {
    const c = config({ mode: 'quote', durationSec: null });
    expect(generateText(c, 42).text).toBe(generateText(c, 42).text);
  });

  it('never returns empty text for any mode', () => {
    const modes = ['time', 'words', 'custom', 'quote', 'paragraph', 'sentence', 'random'] as const;
    for (const mode of modes) {
      const { text } = generateText(config({ mode, durationSec: 30, wordCount: 10 }), 5);
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('keyboard and finger mapping', () => {
  it('maps a home-row key to the correct finger', () => {
    expect(keyHintFor('f')?.finger).toBe('left-index');
    expect(keyHintFor('j')?.finger).toBe('right-index');
  });

  it('maps the space bar to the thumb', () => {
    const hint = keyHintFor(' ');
    expect(hint?.finger).toBe('thumb');
    expect(hint?.hand).toBe('both');
  });

  it('requires shift for a capital letter', () => {
    const hint = keyHintFor('A');
    expect(hint?.shift).toBe(true);
    expect(hint?.keyId).toBe('a');
  });

  it('uses the opposite-hand shift for a left-hand letter', () => {
    expect(keyHintFor('A')?.shiftKeyId).toBe('ShiftRight');
  });

  it('uses the opposite-hand shift for a right-hand letter', () => {
    expect(keyHintFor('L')?.shiftKeyId).toBe('ShiftLeft');
  });

  it('requires no shift for a lower-case letter', () => {
    expect(keyHintFor('a')?.shiftKeyId).toBeNull();
  });

  it('maps shifted punctuation to its unshifted key', () => {
    const hint = keyHintFor('?');
    expect(hint?.keyId).toBe('/');
    expect(hint?.shift).toBe(true);
  });

  it('maps a newline to the Enter key', () => {
    expect(keyHintFor('\n')?.keyId).toBe('Enter');
  });

  it('returns null for an unmapped character', () => {
    expect(keyHintFor('€')).toBeNull();
  });

  it('returns null when there is no next character', () => {
    expect(keyHintFor(undefined)).toBeNull();
  });

  it('derives the hand from the finger', () => {
    expect(handOf('left-ring')).toBe('left');
    expect(handOf('right-little')).toBe('right');
    expect(handOf('thumb')).toBe('both');
  });

  it('labels every finger', () => {
    expect(Object.keys(FINGER_LABELS)).toHaveLength(9);
  });

  it('marks F and J as the homing keys', () => {
    const homing = KEYBOARD_ROWS.flat().filter((k) => k.homing).map((k) => k.id);
    expect(homing.sort()).toEqual(['f', 'j']);
  });

  it('covers every letter of the alphabet', () => {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(keyHintFor(letter), `missing key for "${letter}"`).not.toBeNull();
    }
  });
});

describe('shipped content library', () => {
  it('ships enough words at every difficulty', () => {
    expect(BEGINNER_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(INTERMEDIATE_WORDS.length).toBeGreaterThanOrEqual(100);
    expect(ADVANCED_WORDS.length).toBeGreaterThanOrEqual(100);
  });

  it('ships sentences at every difficulty', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(SENTENCES.filter((s) => s.difficulty === difficulty).length).toBeGreaterThan(0);
    }
  });

  it('ships paragraphs at every difficulty', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(PARAGRAPHS.filter((p) => p.difficulty === difficulty).length).toBeGreaterThan(0);
    }
  });

  it('records a source for every quote', () => {
    for (const quote of QUOTES) expect(quote.source.length).toBeGreaterThan(3);
  });

  it('uses unique ids across each content pool', () => {
    for (const pool of [SENTENCES, PARAGRAPHS, QUOTES, CODE_SNIPPETS, LESSONS]) {
      const ids = pool.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never ships empty passage text', () => {
    for (const item of [...SENTENCES, ...PARAGRAPHS, ...QUOTES]) {
      expect(item.text.trim().length).toBeGreaterThan(10);
    }
  });

  it('ships coding snippets for every advertised language', () => {
    for (const language of ['python', 'javascript', 'typescript', 'html', 'css', 'sql', 'json', 'bash'] as const) {
      expect(snippetsFor(language).length, `no snippets for ${language}`).toBeGreaterThan(0);
    }
  });

  it('uses spaces rather than tabs in coding snippets', () => {
    for (const snippet of CODE_SNIPPETS) expect(snippet.text).not.toContain('\t');
  });

  it('organises lessons into ordered levels', () => {
    expect(LESSON_LEVELS).toEqual([...LESSON_LEVELS].sort((a, b) => a - b));
    for (const level of LESSON_LEVELS) expect(lessonsByLevel(level).length).toBeGreaterThan(0);
  });

  it('gives every lesson an explanation and an exercise', () => {
    for (const lesson of LESSONS) {
      expect(lesson.explanation.length).toBeGreaterThan(20);
      expect(lesson.text.trim().length).toBeGreaterThan(10);
    }
  });

  it('sets a realistic target on every lesson', () => {
    for (const lesson of LESSONS) {
      expect(lesson.targetWpm).toBeGreaterThan(0);
      expect(lesson.targetAccuracy).toBeGreaterThanOrEqual(85);
      expect(lesson.targetAccuracy).toBeLessThanOrEqual(100);
    }
  });

  it('keeps the first lesson restricted to home-row keys', () => {
    expect(LESSONS[0].text).toMatch(/^[asdfjkl; ]+$/);
  });

  it('finds a lesson by id and reports a missing one', () => {
    expect(findLesson(LESSONS[0].id)?.id).toBe(LESSONS[0].id);
    expect(findLesson('nope')).toBeUndefined();
  });

  it('ships lesson text that is fully typable on the mapped keyboard', () => {
    for (const lesson of LESSONS) {
      for (const char of lesson.text) {
        expect(keyHintFor(char), `lesson ${lesson.id} uses untypable "${char}"`).not.toBeNull();
      }
    }
  });

  it('ships passage text that is fully typable on the mapped keyboard', () => {
    for (const item of [...SENTENCES, ...PARAGRAPHS, ...QUOTES, ...CODE_SNIPPETS]) {
      for (const char of item.text) {
        expect(keyHintFor(char), `${item.id} uses untypable "${char}"`).not.toBeNull();
      }
    }
  });

  it('ships generated word text that is fully typable', () => {
    const text = generateWords(200, 'advanced', { punctuation: true, numbers: true, capitalisation: true }, 17);
    for (const char of text) expect(keyHintFor(char), `untypable "${char}"`).not.toBeNull();
  });
});
