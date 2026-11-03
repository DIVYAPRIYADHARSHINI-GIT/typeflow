// Typing test page: mode selection -> running test -> results.
//
// The page owns the three-phase flow and the seed, so "retry the same text" reproduces
// exactly the passage the user just typed while "new test" rolls a fresh seed.

import { useCallback, useMemo, useState } from 'react';
import { PageHeader } from '../components/Layout';
import { TypingTest } from '../components/TypingTest';
import { ResultsView } from '../components/ResultsView';
import { generateText, wordsForDuration } from '../lib/generator';
import { buildResult, isPersonalBest } from '../lib/results';
import { useStore } from '../store/AppStore';
import type { EngineState } from '../lib/engine';
import type { Difficulty, Metrics, TestConfig, TestMode, TestResult } from '../lib/types';

const TIME_OPTIONS = [
  { sec: 15, label: '15 seconds' },
  { sec: 30, label: '30 seconds' },
  { sec: 60, label: '60 seconds' },
  { sec: 120, label: '2 minutes' },
  { sec: 180, label: '3 minutes' },
  { sec: 300, label: '5 minutes' },
];

const WORD_OPTIONS = [10, 25, 50, 100, 200];

const MODE_CARDS: { mode: TestMode; title: string; body: string }[] = [
  { mode: 'time', title: 'Time-based test', body: 'Type as much as you can before the clock runs out. 15 s to 5 min.' },
  { mode: 'words', title: 'Word count test', body: 'Finish a fixed number of words. 10, 25, 50, 100 or 200.' },
  { mode: 'quote', title: 'Quote typing', body: 'Short meaningful quotes from public-domain works and original lines.' },
  { mode: 'paragraph', title: 'Paragraph typing', body: 'Short, medium and long passages for sustained practice.' },
  { mode: 'sentence', title: 'Sentence practice', body: 'One sentence at a time - the best way to rebuild accuracy.' },
  { mode: 'random', title: 'Random words', body: 'Pure word sequences with no sentence structure, for raw speed.' },
  { mode: 'custom', title: 'Custom test', body: 'Choose your own duration, word count and difficulty.' },
];

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'beginner', label: 'Beginner', hint: 'Short, common words' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Longer sentences and vocabulary' },
  { id: 'advanced', label: 'Advanced', hint: 'Complex words, punctuation and numbers' },
];

type Phase = 'select' | 'typing' | 'results';

export function TestPage() {
  const { settings, data, recordResult } = useStore();
  const [phase, setPhase] = useState<Phase>('select');
  const [mode, setMode] = useState<TestMode>('time');
  const [difficulty, setDifficulty] = useState<Difficulty>(settings.defaultDifficulty);
  const [durationSec, setDurationSec] = useState<number>(settings.defaultDurationSec);
  const [wordCount, setWordCount] = useState<number>(settings.defaultWordCount);
  const [options, setOptions] = useState({ punctuation: false, numbers: false, capitalisation: false });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [result, setResult] = useState<TestResult | null>(null);
  const [wasBest, setWasBest] = useState(false);

  const config = useMemo<TestConfig>(() => {
    const base = { difficulty, options };
    switch (mode) {
      case 'time':
        return { ...base, mode, durationSec, wordCount: null, label: `${durationSec}s test` };
      case 'words':
        return { ...base, mode, durationSec: null, wordCount, label: `${wordCount} words` };
      case 'custom':
        return {
          ...base,
          mode,
          durationSec,
          wordCount: wordsForDuration(durationSec),
          label: `Custom ${durationSec}s`,
        };
      case 'random':
        return { ...base, mode, durationSec, wordCount: null, label: `Random words ${durationSec}s` };
      case 'quote':
        return { ...base, mode, durationSec: null, wordCount: null, label: 'Quote' };
      case 'paragraph':
        return { ...base, mode, durationSec: null, wordCount: null, label: 'Paragraph' };
      case 'sentence':
        return { ...base, mode, durationSec: null, wordCount: null, label: 'Sentence' };
      default:
        return { ...base, mode: 'time', durationSec, wordCount: null, label: `${durationSec}s test` };
    }
  }, [mode, difficulty, durationSec, wordCount, options]);

  const generated = useMemo(() => generateText(config, seed), [config, seed]);

  const handleComplete = useCallback(
    (metrics: Metrics, state: EngineState) => {
      const built = buildResult(config, metrics, true, state.samples);
      setWasBest(isPersonalBest(data.records, built));
      setResult(built);
      recordResult(built);
      setPhase('results');
    },
    [config, data.records, recordResult],
  );

  const startTest = () => {
    setSeed(Math.floor(Math.random() * 2 ** 31));
    setPhase('typing');
  };

  const showsTime = mode === 'time' || mode === 'custom' || mode === 'random';
  const showsWords = mode === 'words' || mode === 'custom';
  const showsOptions = mode === 'time' || mode === 'words' || mode === 'custom' || mode === 'random';

  if (phase === 'typing') {
    return (
      <TypingTest
        config={config}
        text={generated.text}
        caption={generated.caption}
        settings={settings}
        onComplete={handleComplete}
        onRestart={() => setSeed(Math.floor(Math.random() * 2 ** 31))}
        onExit={() => setPhase('select')}
      />
    );
  }

  if (phase === 'results' && result) {
    return (
      <ResultsView
        result={result}
        records={data.records}
        isBest={wasBest}
        previous={data.results}
        onRetrySame={() => setPhase('typing')}
        onNewTest={startTest}
        onChangeMode={() => setPhase('select')}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Typing tests"
        lead="Pick a mode, set the difficulty, and start typing. The timer begins with your first keystroke, and everything you type is scored character by character."
      />

      <section aria-labelledby="mode-heading" className="mb-6">
        <h2 id="mode-heading" className="mb-3 text-lg font-bold">
          1. Choose a mode
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODE_CARDS.map((card) => {
            const active = card.mode === mode;
            return (
              <button
                key={card.mode}
                type="button"
                className="tf-card p-4 text-left transition"
                aria-pressed={active}
                onClick={() => setMode(card.mode)}
                style={active ? { borderColor: 'var(--tf-accent)', background: 'var(--tf-accent-soft)' } : undefined}
              >
                <span className="block font-bold" style={active ? { color: 'var(--tf-accent)' } : undefined}>
                  {card.title}
                </span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
                  {card.body}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="options-heading" className="mb-6">
        <h2 id="options-heading" className="mb-3 text-lg font-bold">
          2. Set your options
        </h2>
        <div className="tf-card flex flex-col gap-5 p-5">
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
              Difficulty
            </h3>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="tf-chip"
                  aria-pressed={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  title={d.hint}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
              {DIFFICULTIES.find((d) => d.id === difficulty)?.hint}
            </p>
          </div>

          {showsTime && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                Duration
              </h3>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t.sec}
                    type="button"
                    className="tf-chip"
                    aria-pressed={durationSec === t.sec}
                    onClick={() => setDurationSec(t.sec)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showsWords && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                Word count
              </h3>
              <div className="flex flex-wrap gap-2">
                {WORD_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="tf-chip"
                    aria-pressed={wordCount === w}
                    onClick={() => setWordCount(w)}
                  >
                    {w} words
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Custom duration (seconds)</span>
                <input
                  type="number"
                  className="tf-input"
                  min={10}
                  max={1800}
                  step={5}
                  value={durationSec}
                  onChange={(e) => setDurationSec(Math.max(10, Math.min(1800, Number(e.target.value) || 60)))}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Custom word count</span>
                <input
                  type="number"
                  className="tf-input"
                  min={5}
                  max={500}
                  step={5}
                  value={wordCount}
                  onChange={(e) => setWordCount(Math.max(5, Math.min(500, Number(e.target.value) || 25)))}
                />
              </label>
            </div>
          )}

          {showsOptions && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                Content
              </h3>
              <div className="flex flex-wrap gap-2">
                {([
                  ['punctuation', 'Punctuation'],
                  ['numbers', 'Numbers'],
                  ['capitalisation', 'Capital letters'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="tf-chip"
                    aria-pressed={options[key]}
                    onClick={() => setOptions((o) => ({ ...o, [key]: !o[key] }))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="start-heading">
        <h2 id="start-heading" className="mb-3 text-lg font-bold">
          3. Start
        </h2>
        <div className="tf-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-bold">{config.label}</p>
            <p className="text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
              {difficulty} difficulty
              {showsOptions &&
                (options.punctuation || options.numbers || options.capitalisation
                  ? ` · with ${[
                      options.punctuation && 'punctuation',
                      options.numbers && 'numbers',
                      options.capitalisation && 'capitals',
                    ]
                      .filter(Boolean)
                      .join(', ')}`
                  : ' · plain lower-case words')}
            </p>
          </div>
          <button type="button" className="tf-btn tf-btn-primary" style={{ minWidth: 170 }} onClick={startTest}>
            Start test
          </button>
        </div>
      </section>
    </div>
  );
}
