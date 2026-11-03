// Progress dashboard. Every figure is derived from stored results at render time.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '../components/Layout';
import { BarChart, LineChart } from '../components/Charts';
import {
  achievementList,
  currentStreak,
  dailySeries,
  dashboardFeedback,
  filterByRange,
  formatDuration,
  improvementDelta,
  longestStreak,
  summarise,
} from '../lib/results';
import type { RangeKey } from '../lib/results';
import { LESSONS } from '../content/lessons';
import { useStore } from '../store/AppStore';

const RANGES: { id: RangeKey; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

export function ProgressPage() {
  const { data, deleteResult } = useStore();
  const [range, setRange] = useState<RangeKey>('all');

  const ranged = useMemo(() => filterByRange(data.results, range), [data.results, range]);
  const summary = useMemo(() => summarise(ranged), [ranged]);
  const allTime = useMemo(() => summarise(data.results), [data.results]);
  const daily = useMemo(() => dailySeries(ranged), [ranged]);
  const achievements = useMemo(() => achievementList(data), [data]);
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const completedLessons = Object.values(data.lessons).filter((l) => l.completed).length;
  const delta = improvementDelta(data.results);

  const wpmPoints = ranged.map((r) => ({
    label: new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: r.netWpm,
  }));
  const accuracyPoints = ranged.map((r) => ({
    label: new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: r.accuracy,
  }));
  const practicePoints = daily.map((d) => ({
    label: d.day.slice(5),
    value: Math.round((d.practiceSec / 60) * 10) / 10,
  }));

  if (data.results.length === 0) {
    return (
      <div>
        <PageHeader title="Progress dashboard" lead="Your typing history, records and achievements." />
        <div className="tf-card p-8 text-center">
          <p className="text-lg font-bold">No tests recorded yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
            Complete a typing test and this dashboard will fill with your speed trend, accuracy trend, practice history,
            streaks and achievements. Everything is calculated from data stored in this browser only.
          </p>
          <Link to="/test" className="tf-btn tf-btn-primary mt-5">
            Take your first test
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Progress dashboard" lead="Generated entirely from the results saved in this browser." />

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r.id} type="button" className="tf-chip" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tests completed" value={summary.totalTests} hint={`${allTime.totalTests} all time`} />
        <StatCard label="Average net WPM" value={summary.averageWpm} accent />
        <StatCard label="Highest net WPM" value={summary.highestWpm} hint={`${allTime.highestWpm} all time`} />
        <StatCard label="Average accuracy" value={`${summary.averageAccuracy}%`} />
        <StatCard label="Practice time" value={formatDuration(summary.totalPracticeSec)} />
        <StatCard label="Current streak" value={`${currentStreak(data.results)} days`} hint={`Longest ${longestStreak(data.results)} days`} />
        <StatCard label="Lessons completed" value={`${completedLessons} / ${LESSONS.length}`} />
        <StatCard
          label="Improvement"
          value={delta === null ? '--' : `${delta > 0 ? '+' : ''}${delta} WPM`}
          hint={delta === null ? 'Needs 4+ tests' : 'First vs latest tests'}
        />
      </section>

      <section className="tf-card mb-6 p-5">
        <h2 className="text-base font-bold">What to work on</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          {dashboardFeedback(data.results)}
        </p>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="tf-card p-5">
          <h2 className="mb-3 text-base font-bold">WPM improvement</h2>
          <LineChart points={wpmPoints} suffix=" WPM" label="your WPM trend" />
        </section>
        <section className="tf-card p-5">
          <h2 className="mb-3 text-base font-bold">Accuracy trend</h2>
          <LineChart points={accuracyPoints} suffix="%" label="your accuracy trend" />
        </section>
      </div>

      <section className="tf-card mb-6 p-5">
        <h2 className="mb-1 text-base font-bold">Practice history</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
          Minutes of typing per day.
        </p>
        <BarChart points={practicePoints} suffix=" min" label="practice minutes" />
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold">Personal records</h2>
        {Object.keys(data.records.byKey).length === 0 ? (
          <p className="tf-card p-5 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
            No records yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.records.byKey)
              .sort((a, b) => b[1].netWpm - a[1].netWpm)
              .map(([key, rec]) => (
                <div key={key} className="tf-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
                    {key.replace('time:', 'Timed ').replace('words:', 'Words ').replace(/^(\w)/, (m) => m.toUpperCase())}
                  </div>
                  <div className="tf-stat-value mt-1 text-2xl" style={{ color: 'var(--tf-accent)' }}>
                    {rec.netWpm} WPM
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
                    {rec.accuracy}% accuracy · {new Date(rec.at).toLocaleDateString()}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-1 text-lg font-bold">Achievements</h2>
        <p className="mb-3 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
          {unlocked.length} of {achievements.length} unlocked.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="tf-card p-4"
              style={a.unlockedAt ? { borderColor: 'var(--tf-accent)' } : { opacity: 0.6 }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold">{a.title}</h3>
                <span aria-hidden="true">{a.unlockedAt ? '★' : '☆'}</span>
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
                {a.description}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
                {a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : 'Locked'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent tests</h2>
        <div className="tf-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--tf-ink-faint)' }}>
                {['Date', 'Test', 'Net WPM', 'Gross', 'Accuracy', 'Errors', ''].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.results]
                .reverse()
                .slice(0, 25)
                .map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--tf-border)' }}>
                    <td className="whitespace-nowrap px-4 py-3">{new Date(r.at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.label}</td>
                    <td className="tf-stat-value px-4 py-3" style={{ color: 'var(--tf-accent)' }}>
                      {r.netWpm}
                    </td>
                    <td className="tf-stat-value px-4 py-3">{r.grossWpm}</td>
                    <td className="tf-stat-value px-4 py-3">{r.accuracy}%</td>
                    <td className="tf-stat-value px-4 py-3">{r.totalErrors}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="tf-btn tf-btn-ghost"
                        style={{ minHeight: 32, padding: '0 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => deleteResult(r.id)}
                        aria-label={`Delete the ${r.label} result from ${new Date(r.at).toLocaleString()}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data.results.length > 25 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--tf-ink-faint)' }}>
            Showing the 25 most recent of {data.results.length} saved results.
          </p>
        )}
      </section>
    </div>
  );
}
