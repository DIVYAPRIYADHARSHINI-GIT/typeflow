// Shared domain types for TypeFlow.
// Everything here is plain JSON-serialisable data so it can round-trip through
// localStorage and the JSON backup file without any transformation layer.

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type TestMode =
  | 'time'
  | 'words'
  | 'custom'
  | 'quote'
  | 'paragraph'
  | 'sentence'
  | 'code'
  | 'random'
  | 'lesson';

export type Theme = 'light' | 'dark';

export type CursorStyle = 'bar' | 'block' | 'underline';

/** Text-size preference for the typing passage. */
export type TextSize = 'small' | 'medium' | 'large';

export type CodeLanguage = 'python' | 'javascript' | 'html' | 'css' | 'sql' | 'typescript' | 'json' | 'bash';

/** Content-shaping switches available on word/random based modes. */
export interface ContentOptions {
  punctuation: boolean;
  numbers: boolean;
  capitalisation: boolean;
}

export const DEFAULT_CONTENT_OPTIONS: ContentOptions = {
  punctuation: false,
  numbers: false,
  capitalisation: false,
};

/** Fully resolved description of one test the engine should run. */
export interface TestConfig {
  mode: TestMode;
  difficulty: Difficulty;
  /** Seconds for time-limited tests; null for "type the whole passage" tests. */
  durationSec: number | null;
  /** Target word count for word-count tests; null when not applicable. */
  wordCount: number | null;
  options: ContentOptions;
  /** Only used by the coding mode. */
  language?: CodeLanguage;
  /** Set when the test came from a lesson. */
  lessonId?: string;
  /** Human-readable label shown in results and history. */
  label: string;
}

/** One character slot in the passage, as judged by the engine. */
export type CharState = 'pending' | 'correct' | 'incorrect' | 'corrected';

export interface CharCell {
  expected: string;
  /** What the user currently has in this slot, or null when untouched. */
  actual: string | null;
  state: CharState;
  /** True when this slot was wrong at some point, even if fixed later. */
  everWrong: boolean;
}

/** A one-second sample of typing rate, used for the consistency metric and charts. */
export interface RateSample {
  /** Seconds elapsed since the test started. */
  t: number;
  /** Raw WPM over the whole test up to this instant. */
  wpm: number;
  /** Raw WPM over this sample window only. */
  instantWpm: number;
  /** Uncorrected errors at this instant. */
  errors: number;
}

export interface Metrics {
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  consistency: number;
  totalCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  correctWords: number;
  incorrectWords: number;
  totalErrors: number;
  correctedErrors: number;
  elapsedSec: number;
}

export interface TestResult extends Metrics {
  id: string;
  /** ISO timestamp of completion. */
  at: string;
  mode: TestMode;
  difficulty: Difficulty;
  label: string;
  durationSec: number | null;
  wordCount: number | null;
  language?: CodeLanguage;
  lessonId?: string;
  completed: boolean;
  samples: RateSample[];
}

export interface Settings {
  version: 1;
  theme: Theme;
  sound: boolean;
  showKeyboard: boolean;
  showFingerGuide: boolean;
  cursor: CursorStyle;
  textSize: TextSize;
  liveStats: boolean;
  blindMode: boolean;
  defaultDifficulty: Difficulty;
  defaultDurationSec: number;
  defaultWordCount: number;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  attempts: number;
  bestWpm: number;
  bestAccuracy: number;
  lastAt: string | null;
}

export interface PersonalRecords {
  /** Best net WPM per mode key, e.g. "time:60" or "words:50". */
  byKey: Record<string, { netWpm: number; accuracy: number; at: string }>;
  bestNetWpm: number;
  bestAccuracy: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null;
}

/** The complete persisted application state. */
export interface AppData {
  version: 1;
  settings: Settings;
  results: TestResult[];
  lessons: Record<string, LessonProgress>;
  records: PersonalRecords;
  achievements: Record<string, string>; // achievement id -> ISO unlock time
}

export interface BackupFile {
  app: 'typeflow';
  version: 1;
  exportedAt: string;
  data: AppData;
}
