import { describe, expect, it } from 'vitest';
import {
  createEngineState,
  elapsedSeconds,
  engineReducer,
  metricsOf,
  progressOf,
  remainingCharacters,
  remainingSeconds,
} from './engine';
import type { EngineState } from './engine';
import type { TestConfig } from './types';

const timed = (durationSec: number): TestConfig => ({
  mode: 'time',
  difficulty: 'beginner',
  durationSec,
  wordCount: null,
  options: { punctuation: false, numbers: false, capitalisation: false },
  label: `${durationSec}s test`,
});

const passage = (): TestConfig => ({
  mode: 'words',
  difficulty: 'beginner',
  durationSec: null,
  wordCount: 2,
  options: { punctuation: false, numbers: false, capitalisation: false },
  label: '2 words',
});

/** Type a string one character at a time, advancing the clock by msPerKey. */
function typeString(state: EngineState, text: string, startMs = 0, msPerKey = 100): EngineState {
  let s = state;
  let now = startMs;
  for (const char of text) {
    now += msPerKey;
    s = engineReducer(s, { type: 'type', char, now });
  }
  return s;
}

describe('engine start behaviour', () => {
  it('starts idle with the clock at zero', () => {
    const s = createEngineState(timed(60), 'hello');
    expect(s.status).toBe('idle');
    expect(elapsedSeconds(s, 5000)).toBe(0);
  });

  it('starts the clock on the first keystroke, not on creation', () => {
    const s = engineReducer(createEngineState(timed(60), 'hello'), { type: 'type', char: 'h', now: 1000 });
    expect(s.status).toBe('running');
    expect(s.startedAt).toBe(1000);
    expect(elapsedSeconds(s, 3000)).toBeCloseTo(2, 5);
  });

  it('creates one cell per character of the passage', () => {
    expect(createEngineState(timed(60), 'abc def').cells).toHaveLength(7);
  });
});

describe('character validation', () => {
  it('marks a correct character as correct', () => {
    const s = typeString(createEngineState(timed(60), 'cat'), 'c');
    expect(s.cells[0].state).toBe('correct');
    expect(s.correctCharacters).toBe(1);
    expect(s.incorrectCharacters).toBe(0);
  });

  it('marks a wrong character as incorrect and never as correct', () => {
    const s = typeString(createEngineState(timed(60), 'cat'), 'x');
    expect(s.cells[0].state).toBe('incorrect');
    expect(s.cells[0].actual).toBe('x');
    expect(s.correctCharacters).toBe(0);
    expect(s.incorrectCharacters).toBe(1);
  });

  it('advances the cursor on both correct and incorrect input', () => {
    const s = typeString(createEngineState(timed(60), 'cat'), 'cx');
    expect(s.cursor).toBe(2);
  });

  it('is case sensitive', () => {
    const s = typeString(createEngineState(timed(60), 'Cat'), 'c');
    expect(s.cells[0].state).toBe('incorrect');
  });

  it('validates spaces as ordinary characters', () => {
    const s = typeString(createEngineState(timed(60), 'a b'), 'a b');
    expect(s.cells[1].state).toBe('correct');
    expect(s.cells.every((c) => c.state === 'correct')).toBe(true);
  });

  it('marks a wrong space as incorrect', () => {
    const s = typeString(createEngineState(timed(60), 'a b'), 'axb');
    expect(s.cells[1].state).toBe('incorrect');
  });

  it('validates punctuation and special characters', () => {
    const s = typeString(createEngineState(timed(60), "it's #1!"), "it's #1!");
    expect(s.cells.every((c) => c.state === 'correct')).toBe(true);
    expect(s.incorrectCharacters).toBe(0);
  });

  it('counts total characters including wrong ones', () => {
    const s = typeString(createEngineState(timed(60), 'abcd'), 'aXcd');
    expect(s.totalCharacters).toBe(4);
    expect(s.correctCharacters).toBe(3);
    expect(s.incorrectCharacters).toBe(1);
  });

  it('ignores input past the end of the passage', () => {
    const s = typeString(createEngineState(timed(60), 'ab'), 'abcd');
    expect(s.totalCharacters).toBe(2);
    expect(s.cursor).toBe(2);
  });

  it('ignores multi-character input so a paste cannot be committed', () => {
    const start = createEngineState(timed(60), 'hello world');
    const s = engineReducer(start, { type: 'type', char: 'hello world', now: 100 });
    expect(s.totalCharacters).toBe(0);
    expect(s.status).toBe('idle');
  });

  it('records a blocked paste attempt for the UI to report', () => {
    const s = engineReducer(createEngineState(timed(60), 'abc'), { type: 'paste-blocked' });
    expect(s.pasteBlocked).toBe(true);
    expect(s.totalCharacters).toBe(0);
  });
});

describe('backspace handling', () => {
  it('moves the cursor back and clears the slot', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'ca');
    s = engineReducer(s, { type: 'backspace', now: 500 });
    expect(s.cursor).toBe(1);
    expect(s.cells[1].state).toBe('pending');
    expect(s.cells[1].actual).toBeNull();
  });

  it('does nothing at the start of the passage', () => {
    const start = createEngineState(timed(60), 'cat');
    const s = engineReducer(start, { type: 'backspace', now: 100 });
    expect(s.cursor).toBe(0);
  });

  it('turns a fixed mistake into a corrected slot, not a clean correct one', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'x');
    s = engineReducer(s, { type: 'backspace', now: 500 });
    s = engineReducer(s, { type: 'type', char: 'c', now: 600 });
    expect(s.cells[0].state).toBe('corrected');
    expect(s.cells[0].everWrong).toBe(true);
    expect(s.correctedErrors).toBe(1);
  });

  it('does not credit accuracy for a corrected character', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'x');
    s = engineReducer(s, { type: 'backspace', now: 500 });
    s = engineReducer(s, { type: 'type', char: 'c', now: 600 });
    // Two keystrokes committed, neither counts as a first-time-correct hit.
    expect(s.totalCharacters).toBe(2);
    expect(s.correctCharacters).toBe(0);
  });

  it('removes the uncorrected error once the slot is fixed', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'x');
    expect(metricsOf(s, 1000).totalErrors).toBe(1);
    s = engineReducer(s, { type: 'backspace', now: 500 });
    s = engineReducer(s, { type: 'type', char: 'c', now: 600 });
    expect(metricsOf(s, 1000).totalErrors).toBe(0);
  });

  it('deletes a whole word with the word modifier', () => {
    let s = typeString(createEngineState(timed(60), 'cat dog'), 'cat dog');
    s = engineReducer(s, { type: 'backspace', now: 2000, word: true });
    expect(s.cursor).toBe(4);
    expect(s.cells[4].state).toBe('pending');
    expect(s.cells[3].state).toBe('correct');
  });

  it('word-deletes trailing spaces together with the preceding word', () => {
    let s = typeString(createEngineState(timed(60), 'cat dog'), 'cat ');
    s = engineReducer(s, { type: 'backspace', now: 2000, word: true });
    expect(s.cursor).toBe(0);
  });

  it('is ignored while the test is paused', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'ca');
    s = engineReducer(s, { type: 'pause', now: 1000 });
    const after = engineReducer(s, { type: 'backspace', now: 1100 });
    expect(after.cursor).toBe(2);
  });
});

describe('timer behaviour', () => {
  it('reports remaining seconds for a timed test', () => {
    const s = typeString(createEngineState(timed(60), 'abcdef'), 'a', 0, 0);
    expect(remainingSeconds(s, 10_000)).toBeCloseTo(50, 1);
  });

  it('reports null remaining seconds for a passage test', () => {
    const s = createEngineState(passage(), 'ab cd');
    expect(remainingSeconds(s, 1000)).toBeNull();
  });

  it('never reports negative remaining time', () => {
    const s = typeString(createEngineState(timed(15), 'abcdef'), 'a', 0, 0);
    expect(remainingSeconds(s, 999_999)).toBe(0);
  });

  it('finishes automatically when the clock runs out', () => {
    let s = typeString(createEngineState(timed(15), 'abcdefghij'), 'ab', 0, 100);
    s = engineReducer(s, { type: 'tick', now: 20_000 });
    expect(s.status).toBe('finished');
  });

  it('caps the recorded elapsed time at the configured duration', () => {
    let s = typeString(createEngineState(timed(15), 'abcdefghij'), 'ab', 0, 100);
    s = engineReducer(s, { type: 'tick', now: 60_000 });
    expect(elapsedSeconds(s, 60_000)).toBeLessThanOrEqual(15);
  });

  it('excludes paused time from the elapsed total', () => {
    let s = typeString(createEngineState(timed(60), 'abcdef'), 'a', 0, 1000);
    // started at 1000 ms, now pause at 3000 ms -> 2 s of running time
    s = engineReducer(s, { type: 'pause', now: 3000 });
    expect(elapsedSeconds(s, 3000)).toBeCloseTo(2, 5);
    // 10 s of real time passes while paused
    expect(elapsedSeconds(s, 13_000)).toBeCloseTo(2, 5);
    s = engineReducer(s, { type: 'resume', now: 13_000 });
    expect(elapsedSeconds(s, 14_000)).toBeCloseTo(3, 5);
  });

  it('refuses keystrokes while paused', () => {
    let s = typeString(createEngineState(timed(60), 'cat'), 'c', 0, 100);
    s = engineReducer(s, { type: 'pause', now: 1000 });
    s = engineReducer(s, { type: 'type', char: 'a', now: 1100 });
    expect(s.totalCharacters).toBe(1);
  });

  it('resumes only from the paused state', () => {
    const s = createEngineState(timed(60), 'cat');
    expect(engineReducer(s, { type: 'resume', now: 100 }).status).toBe('idle');
  });

  it('ignores ticks when the test is not running', () => {
    const s = createEngineState(timed(60), 'cat');
    expect(engineReducer(s, { type: 'tick', now: 99_999 }).status).toBe('idle');
  });
});

describe('test completion', () => {
  it('finishes a passage test at the final character', () => {
    const s = typeString(createEngineState(passage(), 'ab cd'), 'ab cd');
    expect(s.status).toBe('finished');
  });

  it('does not finish a passage test early', () => {
    const s = typeString(createEngineState(passage(), 'ab cd'), 'ab c');
    expect(s.status).toBe('running');
  });

  it('does not finish a timed test just because the text ran out', () => {
    const s = typeString(createEngineState(timed(60), 'ab'), 'ab', 0, 100);
    expect(s.status).toBe('running');
  });

  it('refuses further input after finishing', () => {
    let s = typeString(createEngineState(passage(), 'ab'), 'ab');
    expect(s.status).toBe('finished');
    s = engineReducer(s, { type: 'type', char: 'c', now: 9999 });
    expect(s.totalCharacters).toBe(2);
  });

  it('can be finished early by an explicit finish action', () => {
    let s = typeString(createEngineState(timed(60), 'abcdef'), 'abc', 0, 100);
    s = engineReducer(s, { type: 'finish', now: 5000 });
    expect(s.status).toBe('finished');
    expect(metricsOf(s, 5000).totalCharacters).toBe(3);
  });

  it('resets back to a clean idle state', () => {
    let s = typeString(createEngineState(timed(60), 'abcdef'), 'abc', 0, 100);
    s = engineReducer(s, { type: 'reset' });
    expect(s.status).toBe('idle');
    expect(s.cursor).toBe(0);
    expect(s.totalCharacters).toBe(0);
    expect(s.cells.every((c) => c.state === 'pending')).toBe(true);
  });

  it('can reset onto new text', () => {
    const s = engineReducer(createEngineState(timed(60), 'abc'), { type: 'reset', text: 'wxyz' });
    expect(s.text).toBe('wxyz');
    expect(s.cells).toHaveLength(4);
  });
});

describe('progress reporting', () => {
  it('reports time-based progress for a timed test', () => {
    const s = typeString(createEngineState(timed(60), 'abcdefghij'), 'a', 0, 0);
    expect(progressOf(s, 30_000)).toBeCloseTo(0.5, 2);
  });

  it('reports character-based progress for a passage test', () => {
    const s = typeString(createEngineState(passage(), 'abcd'), 'ab');
    expect(progressOf(s, 1000)).toBeCloseTo(0.5, 5);
  });

  it('clamps progress to 1', () => {
    const s = typeString(createEngineState(timed(15), 'abcdef'), 'a', 0, 0);
    expect(progressOf(s, 999_999)).toBe(1);
  });

  it('counts remaining characters', () => {
    const s = typeString(createEngineState(passage(), 'abcde'), 'ab');
    expect(remainingCharacters(s)).toBe(3);
  });
});

describe('end-to-end metric accuracy', () => {
  it('scores a perfect 60-second run correctly', () => {
    // 300 correct characters typed over exactly 60 s -> 60 WPM, 100% accuracy
    const text = 'a'.repeat(300);
    let s = createEngineState(timed(60), text);
    s = typeString(s, text, 0, 200); // 300 keys * 200 ms = 60 000 ms
    const m = metricsOf(s, 60_000);
    expect(m.totalCharacters).toBe(300);
    expect(m.accuracy).toBe(100);
    expect(m.grossWpm).toBeCloseTo(60, 0);
    expect(m.netWpm).toBeCloseTo(60, 0);
  });

  it('keeps gross WPM while reducing net WPM when errors remain', () => {
    const text = 'a'.repeat(300);
    const typed = 'a'.repeat(295) + 'bbbbb';
    let s = createEngineState(timed(60), text);
    s = typeString(s, typed, 0, 200);
    const m = metricsOf(s, 60_000);
    expect(m.grossWpm).toBeCloseTo(60, 0);
    expect(m.netWpm).toBeCloseTo(55, 0);
    expect(m.accuracy).toBeCloseTo(98.3, 1);
  });

  it('collects per-second samples for the consistency metric', () => {
    const text = 'a'.repeat(100);
    let s = createEngineState(timed(60), text);
    s = typeString(s, text, 0, 100); // 10 s of typing
    expect(s.samples.length).toBeGreaterThanOrEqual(8);
    expect(metricsOf(s, 10_000).consistency).toBeGreaterThan(0);
  });
});
