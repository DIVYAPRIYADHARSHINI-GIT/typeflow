// Progressive lessons: level list -> lesson exercise -> feedback.

import { useCallback, useMemo, useState } from 'react';
import { PageHeader, StatCard } from '../components/Layout';
import { TypingTest } from '../components/TypingTest';
import { LESSONS, LESSON_LEVELS, lessonsByLevel } from '../content/lessons';
import type { Lesson } from '../content/lessons';
import { buildResult } from '../lib/results';
import { useStore } from '../store/AppStore';
import type { EngineState } from '../lib/engine';
import type { Metrics, TestConfig, TestResult } from '../lib/types';

export function LessonsPage() {
  const { settings, data, recordResult } = useStore();
  const [active, setActive] = useState<Lesson | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  const completedCount = useMemo(() => Object.values(data.lessons).filter((l) => l.completed).length, [data.lessons]);

  const config = useMemo<TestConfig | null>(
    () =>
      active
        ? {
            mode: 'lesson',
            difficulty: active.difficulty,
            durationSec: null,
            wordCount: null,
            options: { punctuation: false, numbers: false, capitalisation: false },
            lessonId: active.id,
            label: active.title,
          }
        : null,
    [active],
  );

  const handleComplete = useCallback(
    (metrics: Metrics, state: EngineState) => {
      if (!config || !active) return;
      const built = buildResult(config, metrics, true, state.samples);
      setResult(built);
      recordResult(built, { wpm: active.targetWpm, accuracy: active.targetAccuracy });
    },
    [config, active, recordResult],
  );

  // --- Lesson result view ---
  if (active && result) {
    const passed = result.netWpm >= active.targetWpm && result.accuracy >= active.targetAccuracy;
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{active.title}</h1>
          <p className="text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            {active.levelTitle}
          </p>
        </div>

        <div
          className="tf-card p-5"
          style={{
            borderColor: passed ? 'var(--tf-correct)' : 'var(--tf-warn)',
            background: passed ? 'var(--tf-correct-bg)' : 'var(--tf-warn-bg)',
          }}
          role="status"
        >
          <p className="text-lg font-bold" style={{ color: passed ? 'var(--tf-correct)' : 'var(--tf-warn)' }}>
            {passed ? 'Lesson complete' : 'Not quite yet'}
          </p>
          <p className="mt-1 text-sm" style={{ color: passed ? 'var(--tf-correct)' : 'var(--tf-warn)' }}>
            {passed
              ? `You met the target of ${active.targetWpm} WPM at ${active.targetAccuracy}% accuracy. This lesson is marked complete and you can repeat it any time.`
              : `This lesson needs ${active.targetWpm} WPM and ${active.targetAccuracy}% accuracy. You reached ${result.netWpm} WPM at ${result.accuracy}%. ${
                  result.accuracy < active.targetAccuracy
                    ? 'Accuracy is the gap - slow down and aim for clean keystrokes.'
                    : 'Accuracy is good - now build a little more speed.'
                }`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Net WPM" value={result.netWpm} accent hint={`Target ${active.targetWpm}`} />
          <StatCard label="Accuracy" value={`${result.accuracy}%`} hint={`Target ${active.targetAccuracy}%`} />
          <StatCard label="Errors left" value={result.totalErrors} />
          <StatCard label="Corrected" value={result.correctedErrors} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="tf-btn tf-btn-primary"
            onClick={() => {
              setResult(null);
              setAttempt((a) => a + 1);
            }}
          >
            Practise again
          </button>
          <button
            type="button"
            className="tf-btn"
            onClick={() => {
              const index = LESSONS.findIndex((l) => l.id === active.id);
              const next = LESSONS[index + 1];
              setResult(null);
              setAttempt((a) => a + 1);
              setActive(next ?? null);
            }}
          >
            {LESSONS.findIndex((l) => l.id === active.id) < LESSONS.length - 1 ? 'Next lesson' : 'Back to lessons'}
          </button>
          <button
            type="button"
            className="tf-btn tf-btn-ghost"
            onClick={() => {
              setResult(null);
              setActive(null);
            }}
          >
            All lessons
          </button>
        </div>
      </div>
    );
  }

  // --- Lesson exercise view ---
  if (active && config) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{active.title}</h1>
          <p className="text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            {active.levelTitle} · target {active.targetWpm} WPM at {active.targetAccuracy}% accuracy
          </p>
        </div>
        <div className="tf-card p-4" style={{ background: 'var(--tf-accent-soft)', borderColor: 'var(--tf-accent)' }}>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-ink)' }}>
            {active.explanation}
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
          exitLabel="All lessons"
        />
      </div>
    );
  }

  // --- Lesson list ---
  return (
    <div>
      <PageHeader
        title="Practice lessons"
        lead={`A structured course of ${LESSONS.length} lessons. Each one introduces a small group of keys, explains the finger movement, and gives you an exercise using only the keys you have learned so far.`}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Lessons completed" value={`${completedCount} / ${LESSONS.length}`} accent />
        <StatCard label="Levels" value={LESSON_LEVELS.length} />
        <StatCard
          label="Attempts recorded"
          value={Object.values(data.lessons).reduce((t, l) => t + l.attempts, 0)}
        />
      </div>

      <div className="flex flex-col gap-6">
        {LESSON_LEVELS.map((level) => {
          const lessons = lessonsByLevel(level);
          const done = lessons.filter((l) => data.lessons[l.id]?.completed).length;
          return (
            <section key={level} aria-labelledby={`level-${level}`}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`level-${level}`} className="text-lg font-bold">
                  {lessons[0].levelTitle}
                </h2>
                <span className="text-sm font-semibold" style={{ color: 'var(--tf-ink-faint)' }}>
                  {done} / {lessons.length} complete
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {lessons.map((lesson) => {
                  const progress = data.lessons[lesson.id];
                  return (
                    <article key={lesson.id} className="tf-card flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold">{lesson.title}</h3>
                        {progress?.completed && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ background: 'var(--tf-correct-bg)', color: 'var(--tf-correct)' }}
                          >
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
                        {lesson.explanation}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
                        Target {lesson.targetWpm} WPM / {lesson.targetAccuracy}%
                        {progress
                          ? ` · best ${progress.bestWpm} WPM at ${progress.bestAccuracy}% over ${progress.attempts} ${
                              progress.attempts === 1 ? 'attempt' : 'attempts'
                            }`
                          : ' · not attempted yet'}
                      </p>
                      <div className="mt-auto pt-2">
                        <button
                          type="button"
                          className={progress?.completed ? 'tf-btn' : 'tf-btn tf-btn-primary'}
                          onClick={() => {
                            setResult(null);
                            setAttempt((a) => a + 1);
                            setActive(lesson);
                          }}
                        >
                          {progress?.completed ? 'Practise again' : progress ? 'Try again' : 'Start lesson'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
