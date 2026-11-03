// Typing metric calculations.
//
// DOCUMENTED FORMULAS (one definition, used everywhere in the app):
//
//   standard word  = 5 characters (including the spaces between words)
//   minutes        = elapsedSec / 60
//   Gross WPM      = (totalCharacters / 5) / minutes
//   Net WPM        = Gross WPM - (uncorrectedErrors / minutes), floored at 0
//   Accuracy %     = correctCharacters / totalCharacters * 100
//   Consistency %  = 100 * (1 - stdev(instantWpm) / mean(instantWpm)), clamped to 0..100
//
// `totalCharacters` counts every character the user committed into a passage slot,
// including ones that were later corrected. Uncorrected errors are the slots that are
// still wrong when the test ends. Corrected errors are counted separately so a user can
// see how much time they spent fixing mistakes.

import type { CharCell, Metrics, RateSample } from './types';

export const CHARS_PER_WORD = 5;

export function minutesFrom(elapsedSec: number): number {
  return elapsedSec / 60;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function grossWpm(totalCharacters: number, elapsedSec: number): number {
  if (elapsedSec <= 0 || totalCharacters <= 0) return 0;
  return round1(totalCharacters / CHARS_PER_WORD / minutesFrom(elapsedSec));
}

export function netWpm(totalCharacters: number, uncorrectedErrors: number, elapsedSec: number): number {
  if (elapsedSec <= 0) return 0;
  const penalty = uncorrectedErrors / minutesFrom(elapsedSec);
  return round1(Math.max(0, totalCharacters / CHARS_PER_WORD / minutesFrom(elapsedSec) - penalty));
}

export function accuracy(correctCharacters: number, totalCharacters: number): number {
  if (totalCharacters <= 0) return 0;
  return round1((correctCharacters / totalCharacters) * 100);
}

/**
 * Consistency is the inverse of the coefficient of variation of the per-window typing
 * rate. A perfectly even typist scores 100; erratic bursts pull the score down.
 * Fewer than two samples cannot show variation, so it reports 0 rather than a fake 100.
 */
export function consistency(samples: RateSample[]): number {
  const values = samples.map((s) => s.instantWpm).filter((v) => Number.isFinite(v));
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const cv = Math.sqrt(variance) / mean;
  return round1(Math.max(0, Math.min(100, (1 - cv) * 100)));
}

/** Word-level scoring: a word counts as correct only if every one of its slots is correct. */
export function wordStats(cells: CharCell[]): { correctWords: number; incorrectWords: number } {
  let correctWords = 0;
  let incorrectWords = 0;
  let touched = false;
  let clean = true;

  const flush = () => {
    if (!touched) return;
    if (clean) correctWords += 1;
    else incorrectWords += 1;
    touched = false;
    clean = true;
  };

  for (const cell of cells) {
    if (cell.expected === ' ' || cell.expected === '\n') {
      flush();
      continue;
    }
    if (cell.actual !== null) {
      touched = true;
      if (cell.state !== 'correct' && cell.state !== 'corrected') clean = false;
      if (cell.state === 'incorrect') clean = false;
    } else if (touched) {
      // Word was started but not finished - it cannot be a correct word.
      clean = false;
    }
  }
  flush();
  return { correctWords, incorrectWords };
}

export interface MetricInput {
  cells: CharCell[];
  /** Total characters committed into slots, counting re-typed slots once each time. */
  totalCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  correctedErrors: number;
  elapsedSec: number;
  samples: RateSample[];
}

/** Count slots that are still wrong right now (what Net WPM is penalised for). */
export function uncorrectedErrorsOf(cells: CharCell[]): number {
  let n = 0;
  for (const cell of cells) if (cell.state === 'incorrect') n += 1;
  return n;
}

export function computeMetrics(input: MetricInput): Metrics {
  const uncorrected = uncorrectedErrorsOf(input.cells);
  const words = wordStats(input.cells);
  return {
    grossWpm: grossWpm(input.totalCharacters, input.elapsedSec),
    netWpm: netWpm(input.totalCharacters, uncorrected, input.elapsedSec),
    accuracy: accuracy(input.correctCharacters, input.totalCharacters),
    consistency: consistency(input.samples),
    totalCharacters: input.totalCharacters,
    correctCharacters: input.correctCharacters,
    incorrectCharacters: input.incorrectCharacters,
    correctWords: words.correctWords,
    incorrectWords: words.incorrectWords,
    totalErrors: uncorrected,
    correctedErrors: input.correctedErrors,
    elapsedSec: round1(input.elapsedSec),
  };
}

/** Short performance message shown on the results screen. */
export function performanceMessage(m: Metrics): string {
  if (m.totalCharacters === 0) return 'Nothing was typed in this test.';
  if (m.accuracy < 85) return 'Slow down a little - accuracy is what makes speed stick.';
  if (m.netWpm < 25) return 'Good start. Keep your fingers on the home row and build rhythm.';
  if (m.netWpm < 40) return 'Solid progress. Aim for steady rhythm over bursts of speed.';
  if (m.netWpm < 60) return 'Strong result. You are typing above the average office pace.';
  if (m.netWpm < 80) return 'Excellent. Your speed and accuracy are both well above average.';
  return 'Outstanding - professional typing speed.';
}

/** Which of the three dimensions most needs work, for dashboard feedback. */
export function improvementFocus(m: {
  netWpm: number;
  accuracy: number;
  consistency: number;
}): 'accuracy' | 'consistency' | 'speed' | 'balanced' {
  if (m.accuracy < 93) return 'accuracy';
  if (m.consistency > 0 && m.consistency < 70) return 'consistency';
  if (m.netWpm < 45) return 'speed';
  return 'balanced';
}
