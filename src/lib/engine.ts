// The typing engine.
//
// This is a PURE state machine: every keystroke is an action applied to an immutable
// state object. The React layer only renders the state and feeds it keystrokes, which is
// why every rule below (correctness, backspace, word locking, paste blocking, timing)
// is directly unit-testable without a DOM.
//
// Rules implemented here:
//  - Each typed character is compared with the expected character at the cursor.
//    Wrong input is recorded as wrong; it is never silently accepted as correct.
//  - Backspace moves back one slot and clears it. A slot that was ever wrong keeps the
//    `everWrong` flag, so fixing it counts as a CORRECTED error, not as a clean hit.
//  - Accuracy is based on first-attempt correctness of every committed keystroke, so
//    typing a wrong letter and fixing it still costs accuracy. This matches the
//    documented formula in metrics.ts.
//  - Pasting is impossible: the engine only ever accepts single characters, and the
//    React layer rejects paste/drop events outright.
//  - The clock starts on the first committed character, not when the screen opens.

import { computeMetrics, round1 } from './metrics';
import type { CharCell, Metrics, RateSample, TestConfig } from './types';

export type EngineStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface EngineState {
  config: TestConfig;
  text: string;
  cells: CharCell[];
  cursor: number;
  status: EngineStatus;
  /** Monotonic ms timestamp of the first keystroke, or null before the test starts. */
  startedAt: number | null;
  /** Accumulated running milliseconds, excluding paused periods. */
  accumulatedMs: number;
  /** Timestamp of the last resume/start, used to extend accumulatedMs. */
  runningSince: number | null;
  totalCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  correctedErrors: number;
  samples: RateSample[];
  /** Last keystroke outcome, used for keyboard highlighting and sounds. */
  lastKeyCorrect: boolean | null;
  /** True when the user tried to paste - surfaced as a hint in the UI. */
  pasteBlocked: boolean;
}

export type EngineAction =
  | { type: 'type'; char: string; now: number }
  | { type: 'backspace'; now: number; word?: boolean }
  | { type: 'tick'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'reset'; text?: string }
  | { type: 'paste-blocked' };

export function createCells(text: string): CharCell[] {
  return Array.from(text).map((expected) => ({
    expected,
    actual: null,
    state: 'pending' as const,
    everWrong: false,
  }));
}

export function createEngineState(config: TestConfig, text: string): EngineState {
  return {
    config,
    text,
    cells: createCells(text),
    cursor: 0,
    status: 'idle',
    startedAt: null,
    accumulatedMs: 0,
    runningSince: null,
    totalCharacters: 0,
    correctCharacters: 0,
    incorrectCharacters: 0,
    correctedErrors: 0,
    samples: [],
    lastKeyCorrect: null,
    pasteBlocked: false,
  };
}

/** Running time in seconds, excluding paused periods. */
export function elapsedSeconds(state: EngineState, now: number): number {
  let ms = state.accumulatedMs;
  if (state.status === 'running' && state.runningSince !== null) {
    ms += Math.max(0, now - state.runningSince);
  }
  return ms / 1000;
}

/** Seconds left on a timed test, or null for untimed tests. */
export function remainingSeconds(state: EngineState, now: number): number | null {
  if (state.config.durationSec === null) return null;
  return Math.max(0, state.config.durationSec - elapsedSeconds(state, now));
}

/** 0..1 progress through the test, by time for timed tests and by characters otherwise. */
export function progressOf(state: EngineState, now: number): number {
  if (state.config.durationSec !== null) {
    const elapsed = elapsedSeconds(state, now);
    return Math.max(0, Math.min(1, elapsed / state.config.durationSec));
  }
  if (state.cells.length === 0) return 0;
  return Math.min(1, state.cursor / state.cells.length);
}

/** Characters remaining in the passage. */
export function remainingCharacters(state: EngineState): number {
  return Math.max(0, state.cells.length - state.cursor);
}

function sampleAt(state: EngineState, elapsed: number): RateSample[] {
  const second = Math.floor(elapsed);
  if (second < 1) return state.samples;
  const last = state.samples[state.samples.length - 1];
  if (last && last.t >= second) return state.samples;

  const prev = last ?? { t: 0, wpm: 0, instantWpm: 0, errors: 0 };
  const prevChars = (prev.wpm * 5 * prev.t) / 60;
  const windowSec = second - prev.t;
  const windowChars = Math.max(0, state.totalCharacters - prevChars);
  const instantWpm = windowSec > 0 ? round1(windowChars / 5 / (windowSec / 60)) : 0;

  let errors = 0;
  for (const cell of state.cells) if (cell.state === 'incorrect') errors += 1;

  return [
    ...state.samples,
    {
      t: second,
      wpm: round1(state.totalCharacters / 5 / (second / 60)),
      instantWpm,
      errors,
    },
  ];
}

function autoFinish(state: EngineState, now: number): EngineState {
  // Timed tests end when the clock runs out; passage tests end at the last character.
  if (state.status !== 'running') return state;
  if (state.config.durationSec !== null && elapsedSeconds(state, now) >= state.config.durationSec) {
    return stop(state, now);
  }
  if (state.config.durationSec === null && state.cursor >= state.cells.length && state.cells.length > 0) {
    return stop(state, now);
  }
  return state;
}

function stop(state: EngineState, now: number): EngineState {
  if (state.status === 'finished') return state;
  let accumulatedMs = state.accumulatedMs;
  if (state.status === 'running' && state.runningSince !== null) {
    accumulatedMs += Math.max(0, now - state.runningSince);
  }
  // A timed test never reports more than its configured duration.
  if (state.config.durationSec !== null) {
    accumulatedMs = Math.min(accumulatedMs, state.config.durationSec * 1000);
  }
  const stopped: EngineState = { ...state, accumulatedMs, runningSince: null, status: 'finished' };
  return { ...stopped, samples: sampleAt(stopped, accumulatedMs / 1000) };
}

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'reset':
      return createEngineState(state.config, action.text ?? state.text);

    case 'paste-blocked':
      return { ...state, pasteBlocked: true };

    case 'pause': {
      if (state.status !== 'running') return state;
      const accumulatedMs =
        state.accumulatedMs + (state.runningSince !== null ? Math.max(0, action.now - state.runningSince) : 0);
      return { ...state, status: 'paused', accumulatedMs, runningSince: null };
    }

    case 'resume': {
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running', runningSince: action.now };
    }

    case 'finish':
      return stop(state, action.now);

    case 'tick': {
      if (state.status !== 'running') return state;
      const elapsed = elapsedSeconds(state, action.now);
      const sampled = { ...state, samples: sampleAt(state, elapsed) };
      return autoFinish(sampled, action.now);
    }

    case 'backspace': {
      if (state.status === 'finished' || state.status === 'paused') return state;
      if (state.cursor === 0) return state;

      const cells = state.cells.slice();
      let cursor = state.cursor;
      const steps = action.word ? wordBackSteps(cells, cursor) : 1;
      for (let i = 0; i < steps && cursor > 0; i += 1) {
        cursor -= 1;
        cells[cursor] = { ...cells[cursor], actual: null, state: 'pending' };
      }
      return { ...state, cells, cursor, lastKeyCorrect: null };
    }

    case 'type': {
      if (state.status === 'finished' || state.status === 'paused') return state;
      if (action.char.length !== 1) return state; // engine only ever accepts one character
      if (state.cursor >= state.cells.length) return state;

      // Start the clock on the first committed keystroke.
      let next: EngineState = state;
      if (state.status === 'idle') {
        next = { ...state, status: 'running', startedAt: action.now, runningSince: action.now };
      }

      const cells = next.cells.slice();
      const cell = cells[next.cursor];
      const isCorrect = action.char === cell.expected;
      const wasEverWrong = cell.everWrong;

      cells[next.cursor] = {
        ...cell,
        actual: action.char,
        state: isCorrect ? (wasEverWrong ? 'corrected' : 'correct') : 'incorrect',
        everWrong: wasEverWrong || !isCorrect,
      };

      next = {
        ...next,
        cells,
        cursor: next.cursor + 1,
        totalCharacters: next.totalCharacters + 1,
        // Accuracy counts a keystroke as correct only if the slot had never been wrong:
        // re-typing a slot you got wrong is a correction, not a clean hit.
        correctCharacters: next.correctCharacters + (isCorrect && !wasEverWrong ? 1 : 0),
        incorrectCharacters: next.incorrectCharacters + (isCorrect ? 0 : 1),
        correctedErrors: next.correctedErrors + (isCorrect && wasEverWrong ? 1 : 0),
        lastKeyCorrect: isCorrect,
      };

      const elapsed = elapsedSeconds(next, action.now);
      next = { ...next, samples: sampleAt(next, elapsed) };
      return autoFinish(next, action.now);
    }

    default:
      return state;
  }
}

/** How many slots a ctrl/alt-backspace should clear (one word plus trailing spaces). */
function wordBackSteps(cells: CharCell[], cursor: number): number {
  let i = cursor;
  let steps = 0;
  while (i > 0 && cells[i - 1].expected === ' ') {
    i -= 1;
    steps += 1;
  }
  while (i > 0 && cells[i - 1].expected !== ' ') {
    i -= 1;
    steps += 1;
  }
  return Math.max(1, steps);
}

/** Metrics for the current engine state. Safe to call at any time, including mid-test. */
export function metricsOf(state: EngineState, now: number): Metrics {
  return computeMetrics({
    cells: state.cells,
    totalCharacters: state.totalCharacters,
    correctCharacters: state.correctCharacters,
    incorrectCharacters: state.incorrectCharacters,
    correctedErrors: state.correctedErrors,
    elapsedSec: elapsedSeconds(state, now),
    samples: state.samples,
  });
}

/** Keys that the typing surface must handle itself rather than let the browser act on. */
export function isTypableKey(key: string): boolean {
  return key.length === 1 && key !== '\u0000';
}
