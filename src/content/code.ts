// Coding practice snippets.
//
// These are typing exercises only - TypeFlow never executes user input or these snippets.
// All snippets are original, short, and chosen to drill the symbols that slow typists
// down: brackets, quotes, underscores, colons, semicolons, arrows and operators.
//
// Tabs are deliberately avoided; indentation is spaces so every expected character is
// visible and typable.

import type { CodeLanguage, Difficulty } from '../lib/types';

export interface CodeSnippet {
  id: string;
  language: CodeLanguage;
  difficulty: Difficulty;
  title: string;
  text: string;
}

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'py-1',
    language: 'python',
    difficulty: 'beginner',
    title: 'Average of a list',
    text: 'def average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n',
  },
  {
    id: 'py-2',
    language: 'python',
    difficulty: 'intermediate',
    title: 'Word frequency',
    text: 'def word_counts(text):\n    counts = {}\n    for word in text.lower().split():\n        counts[word] = counts.get(word, 0) + 1\n    return dict(sorted(counts.items(), key=lambda kv: -kv[1]))\n',
  },
  {
    id: 'py-3',
    language: 'python',
    difficulty: 'advanced',
    title: 'Dataclass and comprehension',
    text: '@dataclass(frozen=True)\nclass Result:\n    wpm: float\n    accuracy: float\n\n    def score(self) -> float:\n        return round(self.wpm * (self.accuracy / 100), 2)\n\ntop = [r for r in results if r.accuracy >= 95.0][:10]\n',
  },
  {
    id: 'js-1',
    language: 'javascript',
    difficulty: 'beginner',
    title: 'Sum with reduce',
    text: 'const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);\n\nconsole.log(sum([1, 2, 3, 4, 5]));\n',
  },
  {
    id: 'js-2',
    language: 'javascript',
    difficulty: 'intermediate',
    title: 'Debounce helper',
    text: 'function debounce(fn, waitMs) {\n  let timer = null;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), waitMs);\n  };\n}\n',
  },
  {
    id: 'js-3',
    language: 'javascript',
    difficulty: 'advanced',
    title: 'Safe local storage read',
    text: 'export function readJson(key, fallback) {\n  try {\n    const raw = localStorage.getItem(key);\n    return raw === null ? fallback : JSON.parse(raw);\n  } catch (error) {\n    console.warn(`readJson failed for ${key}`, error);\n    return fallback;\n  }\n}\n',
  },
  {
    id: 'ts-1',
    language: 'typescript',
    difficulty: 'intermediate',
    title: 'Typed result union',
    text: 'type Parsed<T> =\n  | { ok: true; value: T }\n  | { ok: false; error: string };\n\nfunction unwrap<T>(input: Parsed<T>, fallback: T): T {\n  return input.ok ? input.value : fallback;\n}\n',
  },
  {
    id: 'ts-2',
    language: 'typescript',
    difficulty: 'advanced',
    title: 'Generic reducer signature',
    text: 'export function createStore<S, A>(reducer: (state: S, action: A) => S, initial: S) {\n  let state: S = initial;\n  const listeners = new Set<(s: S) => void>();\n  return {\n    getState: (): S => state,\n    dispatch: (action: A): void => {\n      state = reducer(state, action);\n      listeners.forEach((listener) => listener(state));\n    },\n  };\n}\n',
  },
  {
    id: 'html-1',
    language: 'html',
    difficulty: 'beginner',
    title: 'Basic page structure',
    text: '<section class="card">\n  <h2>Typing test</h2>\n  <p>Start typing to begin the timer.</p>\n  <button type="button">Restart</button>\n</section>\n',
  },
  {
    id: 'html-2',
    language: 'html',
    difficulty: 'intermediate',
    title: 'Accessible form field',
    text: '<label for="duration">Duration</label>\n<select id="duration" name="duration" aria-describedby="duration-help">\n  <option value="15">15 seconds</option>\n  <option value="60" selected>60 seconds</option>\n</select>\n<p id="duration-help">The timer starts on your first keystroke.</p>\n',
  },
  {
    id: 'css-1',
    language: 'css',
    difficulty: 'beginner',
    title: 'Card styling',
    text: '.card {\n  border-radius: 12px;\n  padding: 1.25rem;\n  background: var(--surface);\n  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);\n}\n',
  },
  {
    id: 'css-2',
    language: 'css',
    difficulty: 'advanced',
    title: 'Responsive grid with tokens',
    text: ':root {\n  --accent: #4f46e5;\n  --gap: clamp(0.75rem, 2vw, 1.5rem);\n}\n\n.grid {\n  display: grid;\n  gap: var(--gap);\n  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));\n}\n\n@media (prefers-reduced-motion: reduce) {\n  * { transition-duration: 0.01ms !important; }\n}\n',
  },
  {
    id: 'sql-1',
    language: 'sql',
    difficulty: 'beginner',
    title: 'Select with filter',
    text: 'SELECT name, wpm, accuracy\nFROM results\nWHERE accuracy >= 95\nORDER BY wpm DESC\nLIMIT 10;\n',
  },
  {
    id: 'sql-2',
    language: 'sql',
    difficulty: 'advanced',
    title: 'Grouped report',
    text: 'SELECT mode,\n       COUNT(*) AS attempts,\n       ROUND(AVG(net_wpm), 1) AS avg_wpm,\n       MAX(net_wpm) AS best_wpm\nFROM results\nWHERE created_at >= DATE(\'now\', \'-30 day\')\nGROUP BY mode\nHAVING COUNT(*) > 2\nORDER BY avg_wpm DESC;\n',
  },
  {
    id: 'json-1',
    language: 'json',
    difficulty: 'intermediate',
    title: 'Backup envelope',
    text: '{\n  "app": "typeflow",\n  "version": 1,\n  "data": {\n    "results": [],\n    "settings": { "theme": "dark", "showKeyboard": true }\n  }\n}\n',
  },
  {
    id: 'bash-1',
    language: 'bash',
    difficulty: 'intermediate',
    title: 'Build and test',
    text: '#!/usr/bin/env bash\nset -euo pipefail\n\nnpm ci\nnpm run test -- --run\nnpm run build\necho "build complete: $(du -sh dist | cut -f1)"\n',
  },
];

export const CODE_LANGUAGES: { id: CodeLanguage; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'sql', label: 'SQL' },
  { id: 'json', label: 'JSON' },
  { id: 'bash', label: 'Bash' },
];

export function snippetsFor(language?: CodeLanguage, difficulty?: Difficulty): CodeSnippet[] {
  return CODE_SNIPPETS.filter(
    (s) => (!language || s.language === language) && (!difficulty || s.difficulty === difficulty),
  );
}
