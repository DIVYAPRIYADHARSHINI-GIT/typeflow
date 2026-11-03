import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  achievementList,
  buildResult,
  currentStreak,
  dailySeries,
  dashboardFeedback,
  dayKey,
  evaluateAchievements,
  filterByRange,
  formatDuration,
  improvementDelta,
  isPersonalBest,
  longestStreak,
  recordKey,
  summarise,
  updateLessonProgress,
  updateRecords,
} from './results';
import { defaultAppData, DEFAULT_RECORDS } from './storage';
import type { AppData, Metrics, TestConfig, TestResult } from './types';

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: Math.random().toString(36).slice(2),
    at: '2026-03-01T10:00:00.000Z',
    mode: 'time',
    difficulty: 'beginner',
    label: '60s test',
    durationSec: 60,
    wordCount: null,
    completed: true,
    samples: [],
    grossWpm: 50,
    netWpm: 48,
    accuracy: 96,
    consistency: 85,
    totalCharacters: 250,
    correctCharacters: 240,
    incorrectCharacters: 10,
    correctWords: 45,
    incorrectWords: 3,
    totalErrors: 2,
    correctedErrors: 8,
    elapsedSec: 60,
    ...overrides,
  };
}

describe('record keys', () => {
  it('separates timed tests by duration', () => {
    expect(recordKey({ mode: 'time', durationSec: 60, wordCount: null })).toBe('time:60');
    expect(recordKey({ mode: 'time', durationSec: 30, wordCount: null })).toBe('time:30');
  });

  it('separates word tests by word count', () => {
    expect(recordKey({ mode: 'words', durationSec: null, wordCount: 50 })).toBe('words:50');
  });

  it('uses the plain mode for passage-style tests', () => {
    expect(recordKey({ mode: 'quote', durationSec: null, wordCount: null })).toBe('quote');
  });
});

describe('building a result', () => {
  const config: TestConfig = {
    mode: 'words',
    difficulty: 'intermediate',
    durationSec: null,
    wordCount: 25,
    options: { punctuation: true, numbers: false, capitalisation: false },
    label: '25 words',
  };
  const metrics: Metrics = {
    grossWpm: 55,
    netWpm: 52,
    accuracy: 97,
    consistency: 80,
    totalCharacters: 130,
    correctCharacters: 126,
    incorrectCharacters: 4,
    correctWords: 24,
    incorrectWords: 1,
    totalErrors: 1,
    correctedErrors: 3,
    elapsedSec: 28.4,
  };

  it('copies configuration and metrics into the stored result', () => {
    const r = buildResult(config, metrics, true, []);
    expect(r.mode).toBe('words');
    expect(r.wordCount).toBe(25);
    expect(r.netWpm).toBe(52);
    expect(r.completed).toBe(true);
  });

  it('gives each result a unique id', () => {
    const a = buildResult(config, metrics, true, []);
    const b = buildResult(config, metrics, true, []);
    expect(a.id).not.toBe(b.id);
  });
});

describe('personal records', () => {
  it('records the first result as a best', () => {
    const records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 40 }));
    expect(records.byKey['time:60'].netWpm).toBe(40);
    expect(records.bestNetWpm).toBe(40);
  });

  it('replaces the record only when beaten', () => {
    let records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 60 }));
    records = updateRecords(records, makeResult({ netWpm: 45 }));
    expect(records.byKey['time:60'].netWpm).toBe(60);
  });

  it('tracks records for each test kind separately', () => {
    let records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 60 }));
    records = updateRecords(records, makeResult({ mode: 'words', durationSec: null, wordCount: 25, netWpm: 44 }));
    expect(records.byKey['time:60'].netWpm).toBe(60);
    expect(records.byKey['words:25'].netWpm).toBe(44);
  });

  it('tracks the best accuracy independently of the best speed', () => {
    let records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 70, accuracy: 90 }));
    records = updateRecords(records, makeResult({ netWpm: 40, accuracy: 99 }));
    expect(records.bestNetWpm).toBe(70);
    expect(records.bestAccuracy).toBe(99);
  });

  it('detects a first attempt as a personal best', () => {
    expect(isPersonalBest({ ...DEFAULT_RECORDS, byKey: {} }, makeResult())).toBe(true);
  });

  it('does not call a slower result a personal best', () => {
    const records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 60 }));
    expect(isPersonalBest(records, makeResult({ netWpm: 59 }))).toBe(false);
  });

  it('does not call an equal result a personal best', () => {
    const records = updateRecords({ ...DEFAULT_RECORDS, byKey: {} }, makeResult({ netWpm: 60 }));
    expect(isPersonalBest(records, makeResult({ netWpm: 60 }))).toBe(false);
  });
});

describe('lesson progress', () => {
  it('marks a lesson complete when both targets are met', () => {
    const p = updateLessonProgress(undefined, 'l1-1', makeResult({ netWpm: 20, accuracy: 95 }), 15, 90);
    expect(p.completed).toBe(true);
    expect(p.attempts).toBe(1);
  });

  it('does not complete a lesson when accuracy is short', () => {
    const p = updateLessonProgress(undefined, 'l1-1', makeResult({ netWpm: 40, accuracy: 85 }), 15, 90);
    expect(p.completed).toBe(false);
  });

  it('does not complete a lesson when speed is short', () => {
    const p = updateLessonProgress(undefined, 'l1-1', makeResult({ netWpm: 10, accuracy: 99 }), 15, 90);
    expect(p.completed).toBe(false);
  });

  it('never un-completes a lesson on a later worse attempt', () => {
    const first = updateLessonProgress(undefined, 'l1-1', makeResult({ netWpm: 40, accuracy: 99 }), 15, 90);
    const second = updateLessonProgress(first, 'l1-1', makeResult({ netWpm: 5, accuracy: 50 }), 15, 90);
    expect(second.completed).toBe(true);
  });

  it('accumulates attempts and keeps best scores', () => {
    const first = updateLessonProgress(undefined, 'l1-1', makeResult({ netWpm: 20, accuracy: 92 }), 15, 90);
    const second = updateLessonProgress(first, 'l1-1', makeResult({ netWpm: 30, accuracy: 88 }), 15, 90);
    expect(second.attempts).toBe(2);
    expect(second.bestWpm).toBe(30);
    expect(second.bestAccuracy).toBe(92);
  });
});

describe('summary statistics', () => {
  it('returns zeros for no results', () => {
    const s = summarise([]);
    expect(s.totalTests).toBe(0);
    expect(s.averageWpm).toBe(0);
    expect(s.highestWpm).toBe(0);
  });

  it('averages net WPM across results', () => {
    const s = summarise([makeResult({ netWpm: 40 }), makeResult({ netWpm: 60 })]);
    expect(s.averageWpm).toBe(50);
    expect(s.highestWpm).toBe(60);
  });

  it('sums practice time and characters', () => {
    const s = summarise([makeResult({ elapsedSec: 60, totalCharacters: 200 }), makeResult({ elapsedSec: 30, totalCharacters: 100 })]);
    expect(s.totalPracticeSec).toBe(90);
    expect(s.totalCharacters).toBe(300);
  });

  it('excludes unmeasurable consistency values from the average', () => {
    const s = summarise([makeResult({ consistency: 0 }), makeResult({ consistency: 80 })]);
    expect(s.averageConsistency).toBe(80);
  });
});

describe('date grouping and streaks', () => {
  it('derives the day key from the local calendar date', () => {
    const local = new Date(2026, 2, 15, 23, 30);
    expect(dayKey(local.toISOString())).toBe('2026-03-15');
  });

  it('groups results per day', () => {
    const d1 = new Date(2026, 2, 1, 10).toISOString();
    const d2 = new Date(2026, 2, 2, 10).toISOString();
    const series = dailySeries([makeResult({ at: d1 }), makeResult({ at: d1 }), makeResult({ at: d2 })]);
    expect(series).toHaveLength(2);
    expect(series[0].tests).toBe(2);
  });

  it('sorts the daily series chronologically', () => {
    const later = new Date(2026, 2, 5, 10).toISOString();
    const earlier = new Date(2026, 2, 1, 10).toISOString();
    const series = dailySeries([makeResult({ at: later }), makeResult({ at: earlier })]);
    expect(series[0].day < series[1].day).toBe(true);
  });

  it('reports a zero streak with no results', () => {
    expect(currentStreak([])).toBe(0);
  });

  it('counts a streak ending today', () => {
    const now = new Date(2026, 2, 10, 12);
    const results = [0, 1, 2].map((offset) =>
      makeResult({ at: new Date(2026, 2, 10 - offset, 9).toISOString() }),
    );
    expect(currentStreak(results, now)).toBe(3);
  });

  it('still counts a streak that ended yesterday, since today is not over', () => {
    const now = new Date(2026, 2, 10, 12);
    const results = [makeResult({ at: new Date(2026, 2, 9, 9).toISOString() })];
    expect(currentStreak(results, now)).toBe(1);
  });

  it('breaks the streak after a missed day', () => {
    const now = new Date(2026, 2, 10, 12);
    const results = [makeResult({ at: new Date(2026, 2, 5, 9).toISOString() })];
    expect(currentStreak(results, now)).toBe(0);
  });

  it('finds the longest historical streak', () => {
    const results = [1, 2, 3, 7, 8].map((day) => makeResult({ at: new Date(2026, 2, day, 9).toISOString() }));
    expect(longestStreak(results)).toBe(3);
  });

  it('counts a single day as a streak of one', () => {
    expect(longestStreak([makeResult({ at: new Date(2026, 2, 3, 9).toISOString() })])).toBe(1);
  });
});

describe('range filtering', () => {
  const now = new Date(2026, 2, 20, 12);
  const results = [
    makeResult({ at: new Date(2026, 2, 20, 9).toISOString() }), // today
    makeResult({ at: new Date(2026, 2, 18, 9).toISOString() }), // 2 days ago
    makeResult({ at: new Date(2026, 0, 5, 9).toISOString() }), // ~74 days ago
  ];

  it('returns everything for the all-time range', () => {
    expect(filterByRange(results, 'all', now)).toHaveLength(3);
  });

  it('returns only today for the day range', () => {
    expect(filterByRange(results, 'day', now)).toHaveLength(1);
  });

  it('returns the last seven days for the week range', () => {
    expect(filterByRange(results, 'week', now)).toHaveLength(2);
  });

  it('returns the last thirty days for the month range', () => {
    expect(filterByRange(results, 'month', now)).toHaveLength(2);
  });

  it('includes a result that is exactly inside the thirty-day window', () => {
    const edge = [makeResult({ at: new Date(2026, 1, 20, 9).toISOString() })]; // 28 days ago
    expect(filterByRange(edge, 'month', now)).toHaveLength(1);
  });
});

describe('improvement and feedback', () => {
  it('needs at least four tests before reporting improvement', () => {
    expect(improvementDelta([makeResult(), makeResult(), makeResult()])).toBeNull();
  });

  it('reports a positive delta when speed increases', () => {
    const results = [30, 32, 55, 58].map((netWpm, i) =>
      makeResult({ netWpm, at: new Date(2026, 2, i + 1, 9).toISOString() }),
    );
    expect(improvementDelta(results)).toBeGreaterThan(0);
  });

  it('reports a negative delta when speed decreases', () => {
    const results = [60, 58, 35, 30].map((netWpm, i) =>
      makeResult({ netWpm, at: new Date(2026, 2, i + 1, 9).toISOString() }),
    );
    expect(improvementDelta(results)).toBeLessThan(0);
  });

  it('prompts a first test when there is no history', () => {
    expect(dashboardFeedback([])).toMatch(/first test/i);
  });

  it('calls out accuracy when it is the weakest dimension', () => {
    expect(dashboardFeedback([makeResult({ accuracy: 80, netWpm: 70, consistency: 95 })])).toMatch(/accuracy/i);
  });
});

describe('achievements', () => {
  it('unlocks the first-test achievement after one result', () => {
    const data: AppData = { ...defaultAppData(), results: [makeResult()] };
    expect(evaluateAchievements(data)).toContain('first-test');
  });

  it('does not re-unlock an achievement that is already recorded', () => {
    const data: AppData = {
      ...defaultAppData(),
      results: [makeResult()],
      achievements: { 'first-test': '2026-01-01T00:00:00.000Z' },
    };
    expect(evaluateAchievements(data)).not.toContain('first-test');
  });

  it('unlocks speed milestones from the stored records', () => {
    const data: AppData = {
      ...defaultAppData(),
      results: [makeResult({ netWpm: 55 })],
      records: { byKey: {}, bestNetWpm: 55, bestAccuracy: 96 },
    };
    const unlocked = evaluateAchievements(data);
    expect(unlocked).toContain('wpm-30');
    expect(unlocked).toContain('wpm-50');
    expect(unlocked).not.toContain('wpm-70');
  });

  it('unlocks the coding achievement only after a coding test', () => {
    const without: AppData = { ...defaultAppData(), results: [makeResult()] };
    expect(evaluateAchievements(without)).not.toContain('coder');
    const withCode: AppData = { ...defaultAppData(), results: [makeResult({ mode: 'code' })] };
    expect(evaluateAchievements(withCode)).toContain('coder');
  });

  it('lists every achievement with its unlock state', () => {
    const data: AppData = { ...defaultAppData(), achievements: { 'first-test': '2026-01-01T00:00:00.000Z' } };
    const list = achievementList(data);
    expect(list).toHaveLength(ACHIEVEMENTS.length);
    expect(list.find((a) => a.id === 'first-test')?.unlockedAt).toBeTruthy();
    expect(list.find((a) => a.id === 'wpm-90')?.unlockedAt).toBeNull();
  });

  it('gives every achievement a unique id', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('duration formatting', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(48)).toBe('48 s');
  });

  it('formats minutes with zero-padded seconds', () => {
    expect(formatDuration(125)).toBe('2 m 05 s');
  });

  it('formats hours with zero-padded minutes', () => {
    expect(formatDuration(3900)).toBe('1 h 05 m');
  });

  it('never formats a negative duration', () => {
    expect(formatDuration(-10)).toBe('0 s');
  });
});
