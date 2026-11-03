// Safe localStorage access.
//
// localStorage is the ONLY storage mechanism in TypeFlow (no IndexedDB, no server, no
// cloud DB). It can fail in real browsers: Safari private mode throws on write, quotas
// fill up, and users can disable site data entirely. Every access therefore goes through
// this module, which never throws - it reports a status the UI can show instead.

import type { AppData, BackupFile, PersonalRecords, Settings } from './types';

export const STORAGE_KEYS = {
  settings: 'typeflow.settings.v1',
  data: 'typeflow.data.v1',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  theme: 'light',
  sound: false,
  showKeyboard: true,
  showFingerGuide: true,
  cursor: 'bar',
  textSize: 'medium',
  liveStats: true,
  blindMode: false,
  defaultDifficulty: 'beginner',
  defaultDurationSec: 60,
  defaultWordCount: 25,
};

export const DEFAULT_RECORDS: PersonalRecords = { byKey: {}, bestNetWpm: 0, bestAccuracy: 0 };

export function defaultAppData(): AppData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    results: [],
    lessons: {},
    records: { ...DEFAULT_RECORDS, byKey: {} },
    achievements: {},
  };
}

export type StorageStatus = 'ok' | 'unavailable' | 'full';

let lastStatus: StorageStatus = 'ok';

export function storageStatus(): StorageStatus {
  return lastStatus;
}

/** Feature-detect localStorage without assuming it exists or is writable. */
export function isStorageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const probe = '__typeflow_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      lastStatus = 'unavailable';
      return null;
    }
    return localStorage.getItem(key);
  } catch {
    lastStatus = 'unavailable';
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      lastStatus = 'unavailable';
      return false;
    }
    localStorage.setItem(key, value);
    lastStatus = 'ok';
    return true;
  } catch (err) {
    // QuotaExceededError (and Firefox's NS_ERROR_DOM_QUOTA_REACHED) mean "full";
    // anything else means storage is not usable at all.
    const name = err instanceof Error ? err.name : '';
    lastStatus = /quota|QUOTA/i.test(name) ? 'full' : 'unavailable';
    return false;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Coerce anything into a valid Settings object, filling gaps with defaults. */
export function sanitiseSettings(input: unknown): Settings {
  if (!isRecord(input)) return { ...DEFAULT_SETTINGS };
  return {
    version: 1,
    theme: oneOf(input.theme, ['light', 'dark'] as const, DEFAULT_SETTINGS.theme),
    sound: bool(input.sound, DEFAULT_SETTINGS.sound),
    showKeyboard: bool(input.showKeyboard, DEFAULT_SETTINGS.showKeyboard),
    showFingerGuide: bool(input.showFingerGuide, DEFAULT_SETTINGS.showFingerGuide),
    cursor: oneOf(input.cursor, ['bar', 'block', 'underline'] as const, DEFAULT_SETTINGS.cursor),
    textSize: oneOf(input.textSize, ['small', 'medium', 'large'] as const, DEFAULT_SETTINGS.textSize),
    liveStats: bool(input.liveStats, DEFAULT_SETTINGS.liveStats),
    blindMode: bool(input.blindMode, DEFAULT_SETTINGS.blindMode),
    defaultDifficulty: oneOf(
      input.defaultDifficulty,
      ['beginner', 'intermediate', 'advanced'] as const,
      DEFAULT_SETTINGS.defaultDifficulty,
    ),
    defaultDurationSec: num(input.defaultDurationSec, DEFAULT_SETTINGS.defaultDurationSec),
    defaultWordCount: num(input.defaultWordCount, DEFAULT_SETTINGS.defaultWordCount),
  };
}

const MODES = ['time', 'words', 'custom', 'quote', 'paragraph', 'sentence', 'code', 'random', 'lesson'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

/**
 * Validate and repair persisted application data. Unknown or corrupt fields are dropped
 * rather than crashing the app, and every numeric metric is coerced so a hand-edited
 * backup cannot produce NaN in a chart.
 */
export function sanitiseAppData(input: unknown): AppData {
  const base = defaultAppData();
  if (!isRecord(input)) return base;

  const results = Array.isArray(input.results)
    ? input.results.filter(isRecord).map((r, i) => ({
        id: typeof r.id === 'string' && r.id ? r.id : `imported-${i}-${Math.random().toString(36).slice(2, 8)}`,
        at: typeof r.at === 'string' ? r.at : new Date(0).toISOString(),
        mode: oneOf(r.mode, MODES, 'time'),
        difficulty: oneOf(r.difficulty, DIFFICULTIES, 'beginner'),
        label: typeof r.label === 'string' ? r.label : 'Imported test',
        durationSec: typeof r.durationSec === 'number' ? r.durationSec : null,
        wordCount: typeof r.wordCount === 'number' ? r.wordCount : null,
        language: typeof r.language === 'string' ? (r.language as AppData['results'][number]['language']) : undefined,
        lessonId: typeof r.lessonId === 'string' ? r.lessonId : undefined,
        completed: bool(r.completed, true),
        grossWpm: num(r.grossWpm, 0),
        netWpm: num(r.netWpm, 0),
        accuracy: num(r.accuracy, 0),
        consistency: num(r.consistency, 0),
        totalCharacters: num(r.totalCharacters, 0),
        correctCharacters: num(r.correctCharacters, 0),
        incorrectCharacters: num(r.incorrectCharacters, 0),
        correctWords: num(r.correctWords, 0),
        incorrectWords: num(r.incorrectWords, 0),
        totalErrors: num(r.totalErrors, 0),
        correctedErrors: num(r.correctedErrors, 0),
        elapsedSec: num(r.elapsedSec, 0),
        samples: Array.isArray(r.samples)
          ? r.samples.filter(isRecord).map((s) => ({
              t: num(s.t, 0),
              wpm: num(s.wpm, 0),
              instantWpm: num(s.instantWpm, 0),
              errors: num(s.errors, 0),
            }))
          : [],
      }))
    : [];

  const lessons: AppData['lessons'] = {};
  if (isRecord(input.lessons)) {
    for (const [id, value] of Object.entries(input.lessons)) {
      if (!isRecord(value)) continue;
      lessons[id] = {
        lessonId: id,
        completed: bool(value.completed, false),
        attempts: num(value.attempts, 0),
        bestWpm: num(value.bestWpm, 0),
        bestAccuracy: num(value.bestAccuracy, 0),
        lastAt: typeof value.lastAt === 'string' ? value.lastAt : null,
      };
    }
  }

  const records: PersonalRecords = { byKey: {}, bestNetWpm: 0, bestAccuracy: 0 };
  if (isRecord(input.records)) {
    records.bestNetWpm = num(input.records.bestNetWpm, 0);
    records.bestAccuracy = num(input.records.bestAccuracy, 0);
    if (isRecord(input.records.byKey)) {
      for (const [key, value] of Object.entries(input.records.byKey)) {
        if (!isRecord(value)) continue;
        records.byKey[key] = {
          netWpm: num(value.netWpm, 0),
          accuracy: num(value.accuracy, 0),
          at: typeof value.at === 'string' ? value.at : new Date(0).toISOString(),
        };
      }
    }
  }

  const achievements: Record<string, string> = {};
  if (isRecord(input.achievements)) {
    for (const [id, at] of Object.entries(input.achievements)) {
      if (typeof at === 'string') achievements[id] = at;
    }
  }

  return {
    version: 1,
    settings: sanitiseSettings(isRecord(input.settings) ? input.settings : undefined),
    results,
    lessons,
    records,
    achievements,
  };
}

export function loadAppData(): AppData {
  const raw = readRaw(STORAGE_KEYS.data);
  if (!raw) return defaultAppData();
  try {
    return sanitiseAppData(JSON.parse(raw));
  } catch {
    return defaultAppData();
  }
}

export function saveAppData(data: AppData): boolean {
  // Settings are mirrored under their own key so the pre-paint theme script in
  // index.html can read the theme without parsing the whole history blob.
  writeRaw(STORAGE_KEYS.settings, JSON.stringify(data.settings));
  return writeRaw(STORAGE_KEYS.data, JSON.stringify(data));
}

export function clearAppData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.data);
    localStorage.removeItem(STORAGE_KEYS.settings);
  } catch {
    /* nothing persisted, nothing to clear */
  }
}

export function buildBackup(data: AppData): BackupFile {
  return { app: 'typeflow', version: 1, exportedAt: new Date().toISOString(), data };
}

export type ImportResult =
  | { ok: true; data: AppData; summary: { results: number; lessons: number; achievements: number } }
  | { ok: false; error: string };

/**
 * Validate a backup file before it is allowed anywhere near existing data.
 * The caller must still confirm with the user before replacing anything.
 */
export function parseBackup(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'The backup file must contain a JSON object.' };
  if (parsed.app !== 'typeflow') {
    return { ok: false, error: 'This file was not exported by TypeFlow (missing "app": "typeflow").' };
  }
  if (parsed.version !== 1) {
    return { ok: false, error: `Unsupported backup version: ${String(parsed.version)}. This app reads version 1.` };
  }
  if (!isRecord(parsed.data)) return { ok: false, error: 'The backup file has no "data" object.' };

  const data = sanitiseAppData(parsed.data);
  return {
    ok: true,
    data,
    summary: {
      results: data.results.length,
      lessons: Object.keys(data.lessons).length,
      achievements: Object.keys(data.achievements).length,
    },
  };
}

/** Merge an imported backup into existing data without losing either side's history. */
export function mergeAppData(current: AppData, incoming: AppData): AppData {
  const byId = new Map(current.results.map((r) => [r.id, r]));
  for (const r of incoming.results) byId.set(r.id, r);
  const results = [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));

  const lessons = { ...current.lessons };
  for (const [id, prog] of Object.entries(incoming.lessons)) {
    const existing = lessons[id];
    lessons[id] = existing
      ? {
          lessonId: id,
          completed: existing.completed || prog.completed,
          attempts: existing.attempts + prog.attempts,
          bestWpm: Math.max(existing.bestWpm, prog.bestWpm),
          bestAccuracy: Math.max(existing.bestAccuracy, prog.bestAccuracy),
          lastAt: [existing.lastAt, prog.lastAt].filter(Boolean).sort().pop() ?? null,
        }
      : prog;
  }

  const byKey = { ...current.records.byKey };
  for (const [key, rec] of Object.entries(incoming.records.byKey)) {
    const existing = byKey[key];
    if (!existing || rec.netWpm > existing.netWpm) byKey[key] = rec;
  }

  const achievements = { ...current.achievements };
  for (const [id, at] of Object.entries(incoming.achievements)) {
    if (!achievements[id] || at < achievements[id]) achievements[id] = at;
  }

  return {
    version: 1,
    settings: incoming.settings,
    results,
    lessons,
    records: {
      byKey,
      bestNetWpm: Math.max(current.records.bestNetWpm, incoming.records.bestNetWpm),
      bestAccuracy: Math.max(current.records.bestAccuracy, incoming.records.bestAccuracy),
    },
    achievements,
  };
}
