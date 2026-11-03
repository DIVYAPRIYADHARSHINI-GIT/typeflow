import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBackup,
  clearAppData,
  defaultAppData,
  DEFAULT_SETTINGS,
  isStorageAvailable,
  loadAppData,
  mergeAppData,
  parseBackup,
  readRaw,
  sanitiseAppData,
  sanitiseSettings,
  saveAppData,
  STORAGE_KEYS,
  writeRaw,
} from './storage';
import type { AppData, TestResult } from './types';

function result(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'r1',
    at: '2026-01-01T10:00:00.000Z',
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

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('storage availability', () => {
  it('detects a working localStorage', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('reports unavailable when setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(isStorageAvailable()).toBe(false);
  });

  it('leaves no probe key behind after the check', () => {
    isStorageAvailable();
    expect(localStorage.getItem('__typeflow_probe__')).toBeNull();
  });
});

describe('safe read and write', () => {
  it('round-trips a value', () => {
    expect(writeRaw('k', 'v')).toBe(true);
    expect(readRaw('k')).toBe('v');
  });

  it('returns null for a missing key rather than throwing', () => {
    expect(readRaw('nope')).toBeNull();
  });

  it('returns false instead of throwing when a write fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(writeRaw('k', 'v')).toBe(false);
  });

  it('classifies a quota error as a full store', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('quota');
      err.name = 'QuotaExceededError';
      throw err;
    });
    expect(writeRaw('k', 'v')).toBe(false);
  });

  it('returns null instead of throwing when a read fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readRaw('k')).toBeNull();
  });
});

describe('settings validation', () => {
  it('falls back to defaults for a non-object input', () => {
    expect(sanitiseSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(sanitiseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const s = sanitiseSettings({ theme: 'dark', sound: true, defaultDurationSec: 120 });
    expect(s.theme).toBe('dark');
    expect(s.sound).toBe(true);
    expect(s.defaultDurationSec).toBe(120);
  });

  it('replaces an invalid enum value with the default', () => {
    expect(sanitiseSettings({ theme: 'neon' }).theme).toBe(DEFAULT_SETTINGS.theme);
    expect(sanitiseSettings({ cursor: 'laser' }).cursor).toBe(DEFAULT_SETTINGS.cursor);
  });

  it('rejects a non-numeric duration', () => {
    expect(sanitiseSettings({ defaultDurationSec: 'fast' }).defaultDurationSec).toBe(60);
  });

  it('rejects NaN as a numeric setting', () => {
    expect(sanitiseSettings({ defaultWordCount: NaN }).defaultWordCount).toBe(DEFAULT_SETTINGS.defaultWordCount);
  });
});

describe('app data validation', () => {
  it('returns defaults for garbage input', () => {
    expect(sanitiseAppData(42)).toEqual(defaultAppData());
  });

  it('drops non-object entries from the results array', () => {
    const data = sanitiseAppData({ results: ['bad', 7, null, { netWpm: 40 }] });
    expect(data.results).toHaveLength(1);
  });

  it('coerces missing numeric metrics to 0 rather than NaN', () => {
    const data = sanitiseAppData({ results: [{ id: 'x', at: '2026-01-01T00:00:00Z' }] });
    expect(data.results[0].netWpm).toBe(0);
    expect(Number.isNaN(data.results[0].accuracy)).toBe(false);
  });

  it('replaces an unknown mode with a safe default', () => {
    const data = sanitiseAppData({ results: [{ id: 'x', mode: 'telepathy' }] });
    expect(data.results[0].mode).toBe('time');
  });

  it('generates an id when one is missing', () => {
    const data = sanitiseAppData({ results: [{ netWpm: 10 }] });
    expect(data.results[0].id).toBeTruthy();
  });

  it('keeps valid lesson progress and normalises the lesson id', () => {
    const data = sanitiseAppData({ lessons: { 'l1-1': { completed: true, attempts: 3, bestWpm: 22 } } });
    expect(data.lessons['l1-1'].lessonId).toBe('l1-1');
    expect(data.lessons['l1-1'].completed).toBe(true);
    expect(data.lessons['l1-1'].attempts).toBe(3);
  });

  it('ignores non-string achievement timestamps', () => {
    const data = sanitiseAppData({ achievements: { good: '2026-01-01T00:00:00Z', bad: 5 } });
    expect(Object.keys(data.achievements)).toEqual(['good']);
  });

  it('rebuilds records from a partial object', () => {
    const data = sanitiseAppData({ records: { bestNetWpm: 70, byKey: { 'time:60': { netWpm: 70 } } } });
    expect(data.records.bestNetWpm).toBe(70);
    expect(data.records.byKey['time:60'].accuracy).toBe(0);
  });
});

describe('persistence', () => {
  it('saves and loads data', () => {
    const data: AppData = { ...defaultAppData(), results: [result()] };
    expect(saveAppData(data)).toBe(true);
    expect(loadAppData().results).toHaveLength(1);
  });

  it('mirrors settings under their own key for the pre-paint theme script', () => {
    const data: AppData = { ...defaultAppData() };
    data.settings = { ...data.settings, theme: 'dark' };
    saveAppData(data);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)!).theme).toBe('dark');
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadAppData()).toEqual(defaultAppData());
  });

  it('returns defaults instead of crashing on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEYS.data, '{not json');
    expect(loadAppData()).toEqual(defaultAppData());
  });

  it('clears both keys on reset', () => {
    saveAppData({ ...defaultAppData(), results: [result()] });
    clearAppData();
    expect(localStorage.getItem(STORAGE_KEYS.data)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
  });
});

describe('backup export and import', () => {
  it('builds a tagged backup envelope', () => {
    const backup = buildBackup(defaultAppData());
    expect(backup.app).toBe('typeflow');
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBeTruthy();
  });

  it('accepts a backup it produced itself', () => {
    const data: AppData = { ...defaultAppData(), results: [result()] };
    const parsed = parseBackup(JSON.stringify(buildBackup(data)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.summary.results).toBe(1);
  });

  it('rejects invalid JSON with a readable message', () => {
    const parsed = parseBackup('{oops');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/not valid JSON/);
  });

  it('rejects a JSON array', () => {
    expect(parseBackup('[1,2,3]').ok).toBe(false);
  });

  it("rejects a file that is not TypeFlow's", () => {
    const parsed = parseBackup(JSON.stringify({ app: 'othertool', version: 1, data: {} }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/not exported by TypeFlow/);
  });

  it('rejects an unsupported backup version', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'typeflow', version: 99, data: {} }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/Unsupported backup version/);
  });

  it('rejects a backup with no data object', () => {
    const parsed = parseBackup(JSON.stringify({ app: 'typeflow', version: 1 }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/no "data" object/);
  });

  it('repairs corrupt fields inside an otherwise valid backup', () => {
    const parsed = parseBackup(
      JSON.stringify({ app: 'typeflow', version: 1, data: { results: [{ id: 'a', netWpm: 'fast' }] } }),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.results[0].netWpm).toBe(0);
  });
});

describe('merging imported data', () => {
  const current: AppData = {
    ...defaultAppData(),
    results: [result({ id: 'a', at: '2026-01-01T00:00:00.000Z', netWpm: 40 })],
    records: { byKey: { 'time:60': { netWpm: 40, accuracy: 90, at: '2026-01-01T00:00:00.000Z' } }, bestNetWpm: 40, bestAccuracy: 90 },
    lessons: { 'l1-1': { lessonId: 'l1-1', completed: true, attempts: 2, bestWpm: 20, bestAccuracy: 95, lastAt: '2026-01-01T00:00:00.000Z' } },
    achievements: { 'first-test': '2026-01-01T00:00:00.000Z' },
  };

  const incoming: AppData = {
    ...defaultAppData(),
    results: [result({ id: 'b', at: '2026-02-01T00:00:00.000Z', netWpm: 60 })],
    records: { byKey: { 'time:60': { netWpm: 60, accuracy: 97, at: '2026-02-01T00:00:00.000Z' } }, bestNetWpm: 60, bestAccuracy: 97 },
    lessons: { 'l1-1': { lessonId: 'l1-1', completed: false, attempts: 3, bestWpm: 25, bestAccuracy: 92, lastAt: '2026-02-01T00:00:00.000Z' } },
    achievements: { 'wpm-50': '2026-02-01T00:00:00.000Z' },
  };

  it('keeps results from both sides', () => {
    expect(mergeAppData(current, incoming).results).toHaveLength(2);
  });

  it('sorts merged results chronologically', () => {
    const merged = mergeAppData(current, incoming);
    expect(merged.results[0].id).toBe('a');
    expect(merged.results[1].id).toBe('b');
  });

  it('deduplicates results with the same id', () => {
    const merged = mergeAppData(current, { ...incoming, results: [result({ id: 'a', netWpm: 99 })] });
    expect(merged.results).toHaveLength(1);
    expect(merged.results[0].netWpm).toBe(99);
  });

  it('keeps the better record for each test kind', () => {
    expect(mergeAppData(current, incoming).records.byKey['time:60'].netWpm).toBe(60);
  });

  it('does not downgrade a completed lesson', () => {
    expect(mergeAppData(current, incoming).lessons['l1-1'].completed).toBe(true);
  });

  it('sums lesson attempts and keeps the best scores', () => {
    const merged = mergeAppData(current, incoming).lessons['l1-1'];
    expect(merged.attempts).toBe(5);
    expect(merged.bestWpm).toBe(25);
    expect(merged.bestAccuracy).toBe(95);
  });

  it('unions achievements from both sides', () => {
    expect(Object.keys(mergeAppData(current, incoming).achievements).sort()).toEqual(['first-test', 'wpm-50']);
  });

  it('keeps the earliest unlock time for a shared achievement', () => {
    const merged = mergeAppData(current, { ...incoming, achievements: { 'first-test': '2025-06-01T00:00:00.000Z' } });
    expect(merged.achievements['first-test']).toBe('2025-06-01T00:00:00.000Z');
  });
});
