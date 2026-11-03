// Coding practice: typing drills for programming syntax. Code is never executed.

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TypingTest } from '../components/TypingTest';
import { ResultsView } from '../components/ResultsView';
import { CODE_LANGUAGES, CODE_SNIPPETS } from '../content/code';
import type { CodeSnippet } from '../content/code';
import { buildResult, isPersonalBest } from '../lib/results';
import { useStore } from '../store/AppStore';
import type { EngineState } from '../lib/engine';
import type { CodeLanguage, Difficulty, Metrics, TestConfig, TestResult } from '../lib/types';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export function CodePage() {
  const { settings, data, recordResult } = useStore();
  const [language, setLanguage] = useState<CodeLanguage | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [active, setActive] = useState<CodeSnippet | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [wasBest, setWasBest] = useState(false);

  const visible = useMemo(
    () =>
      CODE_SNIPPETS.filter(
        (s) => (language === 'all' || s.language === language) && (difficulty === 'all' || s.difficulty === difficulty),
      ),
    [language, difficulty],
  );

  const config = useMemo<TestConfig | null>(
    () =>
      active
        ? {
            mode: 'code',
            difficulty: active.difficulty,
            durationSec: null,
            wordCount: null,
            options: { punctuation: true, numbers: true, capitalisation: true },
            language: active.language,
            label: `${active.language} - ${active.title}`,
          }
        : null,
    [active],
  );

  const handleComplete = useCallback(
    (metrics: Metrics, state: EngineState) => {
      if (!config) return;
      const built = buildResult(config, metrics, true, state.samples);
      setWasBest(isPersonalBest(data.records, built));
      setResult(built);
      recordResult(built);
    },
    [config, data.records, recordResult],
  );

  if (active && result) {
    return (
      <ResultsView
        result={result}
        records={data.records}
        isBest={wasBest}
        previous={data.results}
        onRetrySame={() => {
          setResult(null);
          setAttempt((a) => a + 1);
        }}
        onNewTest={() => {
          setResult(null);
          setAttempt((a) => a + 1);
        }}
        onChangeMode={() => {
          setResult(null);
          setActive(null);
        }}
      />
    );
  }

  if (active && config) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{active.title}</h1>
          <p className="text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            {CODE_LANGUAGES.find((l) => l.id === active.language)?.label} · {active.difficulty} · press Enter for line
            breaks and type the indentation spaces
          </p>
        </div>
        <TypingTest
          key={`${active.id}-${attempt}`}
          config={config}
          text={active.text}
          settings={settings}
          onComplete={handleComplete}
          onRestart={() => setAttempt((a) => a + 1)}
          onExit={() => setActive(null)}
          exitLabel="All snippets"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Coding practice"
        lead="Typing drills built from real code patterns in eight languages. These exercises train the brackets, quotes, underscores and operators that slow most typists down. TypeFlow never runs any code - this is typing practice only."
      />

      <div className="tf-card mb-6 flex flex-col gap-4 p-5">
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
            Language
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="tf-chip" aria-pressed={language === 'all'} onClick={() => setLanguage('all')}>
              All
            </button>
            {CODE_LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                className="tf-chip"
                aria-pressed={language === l.id}
                onClick={() => setLanguage(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
            Difficulty
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="tf-chip"
              aria-pressed={difficulty === 'all'}
              onClick={() => setDifficulty('all')}
            >
              All
            </button>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className="tf-chip capitalize"
                aria-pressed={difficulty === d}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="tf-card p-6 text-center text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
          No snippets match that combination. Try a different difficulty.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((snippet) => (
            <article key={snippet.id} className="tf-card flex min-w-0 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{snippet.title}</h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: 'var(--tf-accent-soft)', color: 'var(--tf-accent)' }}
                >
                  {CODE_LANGUAGES.find((l) => l.id === snippet.language)?.label}
                </span>
              </div>
              {/* min-w-0 is required: a grid/flex child defaults to min-content width, so
                  without it one long code line forces the whole page to scroll sideways. */}
              <pre
                className="w-full min-w-0 overflow-x-auto rounded-lg p-3 text-xs leading-relaxed"
                style={{ background: 'var(--tf-surface-2)', color: 'var(--tf-ink-soft)', fontFamily: 'var(--font-mono)' }}
              >
                <code>{snippet.text.split('\n').slice(0, 4).join('\n')}</code>
              </pre>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs capitalize" style={{ color: 'var(--tf-ink-faint)' }}>
                  {snippet.difficulty} · {snippet.text.length} characters
                </span>
                <button
                  type="button"
                  className="tf-btn tf-btn-primary"
                  onClick={() => {
                    setResult(null);
                    setAttempt((a) => a + 1);
                    setActive(snippet);
                  }}
                >
                  Practise
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
