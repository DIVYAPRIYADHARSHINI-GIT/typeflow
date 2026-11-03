// Test text generation.
//
// A seeded PRNG is used everywhere so a test can assert exact output, and so a user who
// wants to retry "the same test" really gets the same text. No network requests and no
// external API: all content ships in the bundle.

import { ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS, PUNCTUATION_MARKS } from '../content/words';
import { PARAGRAPHS, QUOTES, SENTENCES } from '../content/passages';
import { snippetsFor } from '../content/code';
import { findLesson } from '../content/lessons';
import type { ContentOptions, Difficulty, TestConfig } from './types';

/** mulberry32 - small, fast, deterministic. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function wordPool(difficulty: Difficulty): string[] {
  if (difficulty === 'beginner') return BEGINNER_WORDS;
  if (difficulty === 'intermediate') return INTERMEDIATE_WORDS;
  return ADVANCED_WORDS;
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/** Apply the capitalisation / numbers / punctuation switches to one word. */
export function decorateWord(word: string, options: ContentOptions, rng: () => number): string {
  let out = word;
  if (options.capitalisation && rng() < 0.2) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  if (options.numbers && rng() < 0.12) {
    // Replace the word with a number rather than gluing digits onto real words.
    const magnitude = Math.floor(rng() * 4);
    const max = [10, 100, 1000, 10000][magnitude];
    out = String(Math.floor(rng() * max) + 1);
  }
  if (options.punctuation && rng() < 0.18) {
    out += pick([...PUNCTUATION_MARKS], rng);
  }
  return out;
}

/** Generate a space-separated word sequence. */
export function generateWords(
  count: number,
  difficulty: Difficulty,
  options: ContentOptions,
  seed: number,
): string {
  const rng = makeRng(seed);
  const pool = wordPool(difficulty);
  const words: string[] = [];
  let previous = '';
  for (let i = 0; i < count; i += 1) {
    let word = pick(pool, rng);
    // Avoid immediate repetition, which reads as a bug to users.
    let guard = 0;
    while (word === previous && guard < 5) {
      word = pick(pool, rng);
      guard += 1;
    }
    previous = word;
    words.push(decorateWord(word, options, rng));
  }
  let text = words.join(' ');
  if (options.capitalisation) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

/**
 * Words needed to fill a timed test. Generous on purpose: a 5-minute test at an
 * optimistic 120 WPM still must not run out of text.
 */
export function wordsForDuration(durationSec: number): number {
  const assumedWpm = 120;
  return Math.max(40, Math.ceil((durationSec / 60) * assumedWpm) + 40);
}

export interface GeneratedText {
  text: string;
  /** Extra context shown above the passage, e.g. a quote source or snippet title. */
  caption?: string;
  seed: number;
}

/** Build the text for a test configuration. Pass a seed to reproduce an earlier test. */
export function generateText(config: TestConfig, seed = Math.floor(Math.random() * 2 ** 31)): GeneratedText {
  const rng = makeRng(seed);
  const { difficulty, options } = config;

  switch (config.mode) {
    case 'time':
    case 'custom': {
      const count = config.wordCount ?? wordsForDuration(config.durationSec ?? 60);
      return { text: generateWords(count, difficulty, options, seed), seed };
    }

    case 'words':
      return { text: generateWords(config.wordCount ?? 25, difficulty, options, seed), seed };

    case 'random':
      return {
        text: generateWords(config.wordCount ?? wordsForDuration(config.durationSec ?? 60), difficulty, options, seed),
        seed,
      };

    case 'quote': {
      const pool = QUOTES.filter((q) => q.difficulty === difficulty);
      const quote = pick(pool.length ? pool : QUOTES, rng);
      return { text: quote.text, caption: quote.source, seed };
    }

    case 'sentence': {
      const pool = SENTENCES.filter((s) => s.difficulty === difficulty);
      const sentence = pick(pool.length ? pool : SENTENCES, rng);
      return { text: sentence.text, caption: `Sentence practice - ${sentence.topic.replace('-', ' ')}`, seed };
    }

    case 'paragraph': {
      const pool = PARAGRAPHS.filter((p) => p.difficulty === difficulty);
      const para = pick(pool.length ? pool : PARAGRAPHS, rng);
      return { text: para.text, caption: `${para.length} passage - ${para.topic.replace('-', ' ')}`, seed };
    }

    case 'code': {
      const pool = snippetsFor(config.language, difficulty);
      const fallback = snippetsFor(config.language);
      const snippet = pick(pool.length ? pool : fallback.length ? fallback : snippetsFor(), rng);
      return { text: snippet.text, caption: `${snippet.language} - ${snippet.title}`, seed };
    }

    case 'lesson': {
      const lesson = config.lessonId ? findLesson(config.lessonId) : undefined;
      if (!lesson) return { text: generateWords(20, 'beginner', options, seed), seed };
      return { text: lesson.text, caption: lesson.title, seed };
    }

    default:
      return { text: generateWords(25, difficulty, options, seed), seed };
  }
}

/** Count words the way the UI reports them (whitespace-separated tokens). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
}
