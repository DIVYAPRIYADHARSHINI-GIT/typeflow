import { describe, expect, it } from 'vitest';
import {
  accuracy,
  consistency,
  CHARS_PER_WORD,
  computeMetrics,
  grossWpm,
  improvementFocus,
  netWpm,
  performanceMessage,
  uncorrectedErrorsOf,
  wordStats,
} from './metrics';
import { createCells } from './engine';
import type { CharCell, RateSample } from './types';

/** Build cells from an expected string and what the user actually typed. */
function cellsFrom(expected: string, typed: string): CharCell[] {
  const cells = createCells(expected);
  for (let i = 0; i < typed.length && i < cells.length; i += 1) {
    const correct = typed[i] === cells[i].expected;
    cells[i] = {
      ...cells[i],
      actual: typed[i],
      state: correct ? 'correct' : 'incorrect',
      everWrong: !correct,
    };
  }
  return cells;
}

describe('WPM formulas', () => {
  it('uses 5 characters as one standard word', () => {
    expect(CHARS_PER_WORD).toBe(5);
  });

  it('computes gross WPM as (chars / 5) / minutes', () => {
    // 300 characters in 60 s = 60 words in 1 minute = 60 WPM
    expect(grossWpm(300, 60)).toBe(60);
  });

  it('scales gross WPM with elapsed time', () => {
    expect(grossWpm(150, 30)).toBe(60);
    expect(grossWpm(150, 60)).toBe(30);
  });

  it('returns 0 gross WPM for zero elapsed time rather than Infinity', () => {
    expect(grossWpm(100, 0)).toBe(0);
    expect(Number.isFinite(grossWpm(100, 0))).toBe(true);
  });

  it('returns 0 gross WPM when nothing was typed', () => {
    expect(grossWpm(0, 60)).toBe(0);
  });

  it('subtracts one WPM per uncorrected error per minute from net WPM', () => {
    // 300 chars in 60 s = 60 gross; 5 uncorrected errors over 1 minute = 55 net
    expect(netWpm(300, 5, 60)).toBe(55);
  });

  it('scales the net WPM error penalty by elapsed time', () => {
    // 5 errors in 30 s = 10 errors/minute penalty
    expect(netWpm(150, 5, 30)).toBe(50);
  });

  it('equals gross WPM when there are no uncorrected errors', () => {
    expect(netWpm(300, 0, 60)).toBe(grossWpm(300, 60));
  });

  it('never reports a negative net WPM', () => {
    expect(netWpm(50, 100, 60)).toBe(0);
  });

  it('rounds WPM to one decimal place', () => {
    expect(grossWpm(101, 60)).toBe(20.2);
  });
});

describe('accuracy', () => {
  it('is the ratio of correct to total characters', () => {
    expect(accuracy(90, 100)).toBe(90);
  });

  it('is 100 for a flawless test', () => {
    expect(accuracy(50, 50)).toBe(100);
  });

  it('is 0 when nothing was typed', () => {
    expect(accuracy(0, 0)).toBe(0);
  });

  it('is 0 when every character was wrong', () => {
    expect(accuracy(0, 40)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(accuracy(2, 3)).toBe(66.7);
  });
});

describe('consistency', () => {
  it('is 100 for a perfectly even pace', () => {
    const samples: RateSample[] = [1, 2, 3, 4].map((t) => ({ t, wpm: 50, instantWpm: 50, errors: 0 }));
    expect(consistency(samples)).toBe(100);
  });

  it('is lower for an erratic pace', () => {
    const samples: RateSample[] = [
      { t: 1, wpm: 80, instantWpm: 80, errors: 0 },
      { t: 2, wpm: 50, instantWpm: 20, errors: 0 },
      { t: 3, wpm: 60, instantWpm: 80, errors: 0 },
      { t: 4, wpm: 45, instantWpm: 10, errors: 0 },
    ];
    const value = consistency(samples);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(60);
  });

  it('reports 0 rather than a fake 100 when there is only one sample', () => {
    expect(consistency([{ t: 1, wpm: 40, instantWpm: 40, errors: 0 }])).toBe(0);
  });

  it('reports 0 for no samples at all', () => {
    expect(consistency([])).toBe(0);
  });

  it('never exceeds 100 or drops below 0', () => {
    const samples: RateSample[] = [
      { t: 1, wpm: 100, instantWpm: 100, errors: 0 },
      { t: 2, wpm: 50, instantWpm: 0, errors: 0 },
      { t: 3, wpm: 70, instantWpm: 200, errors: 0 },
    ];
    const value = consistency(samples);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });
});

describe('word level scoring', () => {
  it('counts a fully correct word as correct', () => {
    expect(wordStats(cellsFrom('hello world', 'hello world'))).toEqual({ correctWords: 2, incorrectWords: 0 });
  });

  it('counts a word with one wrong letter as incorrect', () => {
    expect(wordStats(cellsFrom('hello world', 'hallo world'))).toEqual({ correctWords: 1, incorrectWords: 1 });
  });

  it('counts an unfinished trailing word as incorrect', () => {
    expect(wordStats(cellsFrom('hello world', 'hello wor'))).toEqual({ correctWords: 1, incorrectWords: 1 });
  });

  it('counts nothing when no characters were typed', () => {
    expect(wordStats(cellsFrom('hello world', ''))).toEqual({ correctWords: 0, incorrectWords: 0 });
  });

  it('treats a corrected character as part of a correct word', () => {
    const cells = createCells('ab');
    cells[0] = { expected: 'a', actual: 'a', state: 'corrected', everWrong: true };
    cells[1] = { expected: 'b', actual: 'b', state: 'correct', everWrong: false };
    expect(wordStats(cells)).toEqual({ correctWords: 1, incorrectWords: 0 });
  });
});

describe('uncorrectedErrorsOf', () => {
  it('counts only slots that are still wrong', () => {
    expect(uncorrectedErrorsOf(cellsFrom('abcd', 'abXd'))).toBe(1);
  });

  it('ignores corrected slots', () => {
    const cells = createCells('ab');
    cells[0] = { expected: 'a', actual: 'a', state: 'corrected', everWrong: true };
    expect(uncorrectedErrorsOf(cells)).toBe(0);
  });
});

describe('computeMetrics', () => {
  it('assembles a consistent metric set', () => {
    const cells = cellsFrom('the quick brown fox', 'the quick brown fox');
    const m = computeMetrics({
      cells,
      totalCharacters: 19,
      correctCharacters: 19,
      incorrectCharacters: 0,
      correctedErrors: 0,
      elapsedSec: 30,
      samples: [],
    });
    expect(m.accuracy).toBe(100);
    expect(m.totalErrors).toBe(0);
    expect(m.netWpm).toBe(m.grossWpm);
    expect(m.correctWords).toBe(4);
  });

  it('penalises net WPM but not gross WPM for uncorrected errors', () => {
    const cells = cellsFrom('abcdefghij', 'abcdefghiX');
    const m = computeMetrics({
      cells,
      totalCharacters: 10,
      correctCharacters: 9,
      incorrectCharacters: 1,
      correctedErrors: 0,
      elapsedSec: 60,
      samples: [],
    });
    expect(m.grossWpm).toBe(2);
    expect(m.netWpm).toBe(1);
    expect(m.accuracy).toBe(90);
  });

  it('reports corrected errors separately from uncorrected ones', () => {
    const cells = createCells('ab');
    cells[0] = { expected: 'a', actual: 'a', state: 'corrected', everWrong: true };
    cells[1] = { expected: 'b', actual: 'X', state: 'incorrect', everWrong: true };
    const m = computeMetrics({
      cells,
      totalCharacters: 3,
      correctCharacters: 0,
      incorrectCharacters: 2,
      correctedErrors: 1,
      elapsedSec: 10,
      samples: [],
    });
    expect(m.correctedErrors).toBe(1);
    expect(m.totalErrors).toBe(1);
  });
});

describe('feedback helpers', () => {
  const base = {
    grossWpm: 0,
    netWpm: 0,
    accuracy: 0,
    consistency: 0,
    totalCharacters: 0,
    correctCharacters: 0,
    incorrectCharacters: 0,
    correctWords: 0,
    incorrectWords: 0,
    totalErrors: 0,
    correctedErrors: 0,
    elapsedSec: 0,
  };

  it('says nothing was typed for an empty test', () => {
    expect(performanceMessage(base)).toMatch(/Nothing was typed/);
  });

  it('prioritises an accuracy warning over speed praise', () => {
    expect(performanceMessage({ ...base, totalCharacters: 300, accuracy: 70, netWpm: 90 })).toMatch(/accuracy/i);
  });

  it('praises a high net WPM with good accuracy', () => {
    expect(performanceMessage({ ...base, totalCharacters: 300, accuracy: 98, netWpm: 95 })).toMatch(/Outstanding/);
  });

  it('identifies accuracy as the focus when it is low', () => {
    expect(improvementFocus({ netWpm: 80, accuracy: 88, consistency: 95 })).toBe('accuracy');
  });

  it('identifies consistency as the focus when the pace is erratic', () => {
    expect(improvementFocus({ netWpm: 80, accuracy: 98, consistency: 50 })).toBe('consistency');
  });

  it('identifies speed as the focus when accuracy is already good', () => {
    expect(improvementFocus({ netWpm: 30, accuracy: 98, consistency: 90 })).toBe('speed');
  });

  it('reports balanced when all three are strong', () => {
    expect(improvementFocus({ netWpm: 70, accuracy: 98, consistency: 90 })).toBe('balanced');
  });
});
