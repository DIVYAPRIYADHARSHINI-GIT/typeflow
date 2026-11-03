// Results, personal records, achievements and streaks.
//
// Every number shown on the dashboard is DERIVED from the stored result list by the pure
// functions in this file. Nothing aggregated is persisted, so deleting or importing
// history automatically corrects every average, record, streak and chart.

import type { Achievement, AppData, LessonProgress, Metrics, PersonalRecords, TestConfig, TestResult } from './types';
import { improvementFocus } from './metrics';
import { LESSONS } from '../content/lessons';

/** Stable key identifying "the same kind of test" for personal records. */
export function recordKey(config: Pick<TestConfig, 'mode' | 'durationSec' | 'wordCount'>): string {
  if (config.mode === 'time') return `time:${config.durationSec ?? 0}`;
  if (config.mode === 'words') return `words:${config.wordCount ?? 0}`;
  return config.mode;
}

let counter = 0;
export function makeResultId(now = Date.now()): string {
  counter += 1;
  return `${now.toString(36)}-${counter.toString(36)}`;
}

export function buildResult(
  config: TestConfig,
  metrics: Metrics,
  completed: boolean,
  samples: TestResult['samples'],
  at = new Date().toISOString(),
): TestResult {
  return {
    id: makeResultId(),
    at,
    mode: config.mode,
    difficulty: config.difficulty,
    label: config.label,
    durationSec: config.durationSec,
    wordCount: config.wordCount,
    language: config.language,
    lessonId: config.lessonId,
    completed,
    samples,
    ...metrics,
  };
}

export function updateRecords(records: PersonalRecords, result: TestResult): PersonalRecords {
  const key = recordKey(result);
  const existing = records.byKey[key];
  const byKey = { ...records.byKey };
  if (!existing || result.netWpm > existing.netWpm) {
    byKey[key] = { netWpm: result.netWpm, accuracy: result.accuracy, at: result.at };
  }
  return {
    byKey,
    bestNetWpm: Math.max(records.bestNetWpm, result.netWpm),
    bestAccuracy: Math.max(records.bestAccuracy, result.accuracy),
  };
}

/** True when this result beats the previous best for its own test kind. */
export function isPersonalBest(records: PersonalRecords, result: TestResult): boolean {
  const existing = records.byKey[recordKey(result)];
  return !existing || result.netWpm > existing.netWpm;
}

export function updateLessonProgress(
  current: LessonProgress | undefined,
  lessonId: string,
  result: TestResult,
  targetWpm: number,
  targetAccuracy: number,
): LessonProgress {
  const passed = result.netWpm >= targetWpm && result.accuracy >= targetAccuracy;
  return {
    lessonId,
    completed: (current?.completed ?? false) || passed,
    attempts: (current?.attempts ?? 0) + 1,
    bestWpm: Math.max(current?.bestWpm ?? 0, result.netWpm),
    bestAccuracy: Math.max(current?.bestAccuracy ?? 0, result.accuracy),
    lastAt: result.at,
  };
}

// ---------------------------------------------------------------------------
// Aggregate statistics
// ---------------------------------------------------------------------------

export interface Summary {
  totalTests: number;
  averageWpm: number;
  highestWpm: number;
  averageAccuracy: number;
  bestAccuracy: number;
  totalPracticeSec: number;
  totalCharacters: number;
  averageConsistency: number;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export function summarise(results: TestResult[]): Summary {
  return {
    totalTests: results.length,
    averageWpm: avg(results.map((r) => r.netWpm)),
    highestWpm: results.reduce((best, r) => Math.max(best, r.netWpm), 0),
    averageAccuracy: avg(results.map((r) => r.accuracy)),
    bestAccuracy: results.reduce((best, r) => Math.max(best, r.accuracy), 0),
    totalPracticeSec: Math.round(results.reduce((total, r) => total + r.elapsedSec, 0)),
    totalCharacters: results.reduce((total, r) => total + r.totalCharacters, 0),
    averageConsistency: avg(results.filter((r) => r.consistency > 0).map((r) => r.consistency)),
  };
}

/** Local calendar day key (not UTC) so a late-evening test counts as today. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type RangeKey = 'day' | 'week' | 'month' | 'all';

export function filterByRange(results: TestResult[], range: RangeKey, now = new Date()): TestResult[] {
  if (range === 'all') return results;
  const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return results.filter((r) => new Date(r.at).getTime() >= cutoff.getTime());
}

export interface DailyPoint {
  day: string;
  tests: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  practiceSec: number;
}

export function dailySeries(results: TestResult[]): DailyPoint[] {
  const groups = new Map<string, TestResult[]>();
  for (const r of results) {
    const key = dayKey(r.at);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.entries()]
    .map(([day, list]) => ({
      day,
      tests: list.length,
      averageWpm: avg(list.map((r) => r.netWpm)),
      bestWpm: list.reduce((best, r) => Math.max(best, r.netWpm), 0),
      averageAccuracy: avg(list.map((r) => r.accuracy)),
      practiceSec: Math.round(list.reduce((total, r) => total + r.elapsedSec, 0)),
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Consecutive days of practice ending today (or yesterday - today is still open). */
export function currentStreak(results: TestResult[], now = new Date()): number {
  if (results.length === 0) return 0;
  const days = new Set(results.map((r) => dayKey(r.at)));
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);

  const todayKey = dayKey(cursor.toISOString());
  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.toISOString()))) return 0;
  }

  let streak = 0;
  for (;;) {
    if (!days.has(dayKey(cursor.toISOString()))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function longestStreak(results: TestResult[]): number {
  const days = [...new Set(results.map((r) => dayKey(r.at)))].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12);
    if (previous && Math.round((date.getTime() - previous.getTime()) / 86400000) === 1) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

/** Improvement between the first and last five tests, in net WPM. */
export function improvementDelta(results: TestResult[]): number | null {
  if (results.length < 4) return null;
  const sorted = [...results].sort((a, b) => a.at.localeCompare(b.at));
  const take = Math.min(5, Math.floor(sorted.length / 2));
  const first = avg(sorted.slice(0, take).map((r) => r.netWpm));
  const last = avg(sorted.slice(-take).map((r) => r.netWpm));
  return Math.round((last - first) * 10) / 10;
}

export function dashboardFeedback(results: TestResult[]): string {
  if (results.length === 0) return 'Complete your first test to see personalised feedback here.';
  const s = summarise(results);
  const focus = improvementFocus({
    netWpm: s.averageWpm,
    accuracy: s.averageAccuracy,
    consistency: s.averageConsistency,
  });
  if (focus === 'accuracy') {
    return `Your average accuracy is ${s.averageAccuracy}%. Accuracy is the limiting factor right now - slow down by about 10% and aim for 95% before pushing speed.`;
  }
  if (focus === 'consistency') {
    return `Your speed swings a lot within a test (consistency ${s.averageConsistency}%). Try longer tests at a deliberately even pace rather than short bursts.`;
  }
  if (focus === 'speed') {
    return `Accuracy is solid at ${s.averageAccuracy}%. You now have room to push speed - try the 60-second test and allow yourself to type slightly faster than feels comfortable.`;
  }
  return `Speed, accuracy and consistency are all in good shape (${s.averageWpm} WPM, ${s.averageAccuracy}%). Try the advanced difficulty or coding practice to keep progressing.`;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** Pure predicate over the full data set after a result is recorded. */
  test: (data: AppData) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-test', title: 'First keystrokes', description: 'Complete your first typing test.', test: (d) => d.results.length >= 1 },
  { id: 'ten-tests', title: 'Getting serious', description: 'Complete 10 typing tests.', test: (d) => d.results.length >= 10 },
  { id: 'fifty-tests', title: 'Dedicated typist', description: 'Complete 50 typing tests.', test: (d) => d.results.length >= 50 },
  { id: 'wpm-30', title: '30 WPM', description: 'Reach 30 net words per minute.', test: (d) => d.records.bestNetWpm >= 30 },
  { id: 'wpm-50', title: '50 WPM', description: 'Reach 50 net words per minute.', test: (d) => d.records.bestNetWpm >= 50 },
  { id: 'wpm-70', title: '70 WPM', description: 'Reach 70 net words per minute.', test: (d) => d.records.bestNetWpm >= 70 },
  { id: 'wpm-90', title: '90 WPM', description: 'Reach 90 net words per minute.', test: (d) => d.records.bestNetWpm >= 90 },
  { id: 'accuracy-95', title: 'Precise', description: 'Finish a test with 95% accuracy or better.', test: (d) => d.records.bestAccuracy >= 95 },
  { id: 'accuracy-100', title: 'Flawless', description: 'Finish a test with 100% accuracy.', test: (d) => d.records.bestAccuracy >= 100 },
  {
    id: 'consistent',
    title: 'Metronome',
    description: 'Finish a test with 90% consistency or better.',
    test: (d) => d.results.some((r) => r.consistency >= 90),
  },
  {
    id: 'streak-3',
    title: 'Three in a row',
    description: 'Practise on three consecutive days.',
    test: (d) => longestStreak(d.results) >= 3,
  },
  {
    id: 'streak-7',
    title: 'Full week',
    description: 'Practise on seven consecutive days.',
    test: (d) => longestStreak(d.results) >= 7,
  },
  {
    id: 'lesson-5',
    title: 'Student',
    description: 'Complete 5 lessons.',
    test: (d) => Object.values(d.lessons).filter((l) => l.completed).length >= 5,
  },
  {
    id: 'lesson-all',
    title: 'Graduate',
    description: 'Complete every lesson in the course.',
    // Derived from the lesson list so adding a lesson cannot silently unlock this early.
    test: (d) => Object.values(d.lessons).filter((l) => l.completed).length >= LESSONS.length,
  },
  {
    id: 'coder',
    title: 'Code typist',
    description: 'Complete a coding practice test.',
    test: (d) => d.results.some((r) => r.mode === 'code'),
  },
  {
    id: 'marathon',
    title: 'Marathon',
    description: 'Practise for a total of one hour.',
    test: (d) => d.results.reduce((t, r) => t + r.elapsedSec, 0) >= 3600,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Try five different test modes.',
    test: (d) => new Set(d.results.map((r) => r.mode)).size >= 5,
  },
  {
    id: 'advanced',
    title: 'Advanced class',
    description: 'Complete an advanced-difficulty test at 95% accuracy.',
    test: (d) => d.results.some((r) => r.difficulty === 'advanced' && r.accuracy >= 95),
  },
];

/** Returns the ids newly unlocked by the current data state. */
export function evaluateAchievements(data: AppData): string[] {
  return ACHIEVEMENTS.filter((a) => !data.achievements[a.id] && a.test(data)).map((a) => a.id);
}

export function achievementList(data: AppData): Achievement[] {
  return ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    unlockedAt: data.achievements[a.id] ?? null,
  }));
}

/** Human-friendly duration, e.g. "1 h 05 m" or "48 s". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} s`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} m ${String(s % 60).padStart(2, '0')} s`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} m`;
}
