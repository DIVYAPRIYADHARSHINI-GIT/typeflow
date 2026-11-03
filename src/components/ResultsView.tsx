// Results dashboard shown after every completed test.

import { ComparisonBar, LineChart } from './Charts';
import { StatCard } from './Layout';
import { performanceMessage } from '../lib/metrics';
import { recordKey } from '../lib/results';
import type { PersonalRecords, TestResult } from '../lib/types';

interface Props {
  result: TestResult;
  records: PersonalRecords;
  isBest: boolean;
  previous: TestResult[];
  onRetrySame: () => void;
  onNewTest: () => void;
  onChangeMode: () => void;
}

export function ResultsView({ result, records, isBest, previous, onRetrySame, onNewTest, onChangeMode }: Props) {
  const sameKind = previous.filter((r) => recordKey(r) === recordKey(result) && r.id !== result.id);
  const last = sameKind[sameKind.length - 1];
  const delta = last ? Math.round((result.netWpm - last.netWpm) * 10) / 10 : null;
  const best = records.byKey[recordKey(result)];

  const trend = [...sameKind.slice(-11), result].map((r) => ({
    label: new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: r.netWpm,
  }));

  const liveTrend = result.samples.map((s) => ({ label: `${s.t}s`, value: s.wpm }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Test complete</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
            {result.label} · {result.difficulty} · {result.completed ? 'Finished' : 'Ended early'}
          </p>
        </div>
        {isBest && (
          <span
            className="rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ background: 'var(--tf-correct-bg)', color: 'var(--tf-correct)' }}
          >
            New personal best
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net WPM" value={result.netWpm} accent hint="Speed after error penalty" />
        <StatCard label="Gross WPM" value={result.grossWpm} hint="Raw typing speed" />
        <StatCard label="Accuracy" value={`${result.accuracy}%`} hint="Correct of all keystrokes" />
        <StatCard label="Consistency" value={result.consistency > 0 ? `${result.consistency}%` : '--'} hint="Evenness of pace" />
      </div>

      <div className="tf-card p-5">
        <p className="text-base font-semibold">{performanceMessage(result)}</p>
        {delta !== null && (
          <p className="mt-2 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
            {delta === 0
              ? `Exactly the same net WPM as your previous ${result.label}.`
              : delta > 0
                ? `That is ${delta} WPM faster than your previous ${result.label} (${last.netWpm} WPM).`
                : `That is ${Math.abs(delta)} WPM slower than your previous ${result.label} (${last.netWpm} WPM).`}
          </p>
        )}
        {best && !isBest && (
          <p className="mt-1 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            Your best for this test is {best.netWpm} WPM at {best.accuracy}% accuracy.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tf-card p-5">
          <h3 className="mb-3 text-base font-bold">Correct vs incorrect characters</h3>
          <ComparisonBar correct={result.correctCharacters} incorrect={result.incorrectCharacters} />
        </section>

        <section className="tf-card p-5">
          <h3 className="mb-1 text-base font-bold">Detailed breakdown</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['Test duration', `${result.elapsedSec.toFixed(1)} s`],
              ['Total characters', result.totalCharacters],
              ['Correct characters', result.correctCharacters],
              ['Incorrect characters', result.incorrectCharacters],
              ['Correct words', result.correctWords],
              ['Incorrect words', result.incorrectWords],
              ['Uncorrected errors', result.totalErrors],
              ['Corrected errors', result.correctedErrors],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between gap-2 border-b pb-1" style={{ borderColor: 'var(--tf-border)' }}>
                <dt style={{ color: 'var(--tf-ink-faint)' }}>{label}</dt>
                <dd className="tf-stat-value">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {liveTrend.length >= 2 && (
        <section className="tf-card p-5">
          <h3 className="mb-3 text-base font-bold">Speed during this test</h3>
          <LineChart points={liveTrend} suffix=" WPM" label="speed during this test" minPoints={2} />
        </section>
      )}

      {trend.length >= 2 && (
        <section className="tf-card p-5">
          <h3 className="mb-1 text-base font-bold">Compared with earlier attempts</h3>
          <p className="mb-3 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            Net WPM for your recent {result.label} attempts.
          </p>
          <LineChart points={trend} suffix=" WPM" label="previous attempts" minPoints={2} />
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="tf-btn tf-btn-primary" onClick={onRetrySame}>
          Retry the same text
        </button>
        <button type="button" className="tf-btn" onClick={onNewTest}>
          New test, same settings
        </button>
        <button type="button" className="tf-btn tf-btn-ghost" onClick={onChangeMode}>
          Change test mode
        </button>
      </div>
    </div>
  );
}
