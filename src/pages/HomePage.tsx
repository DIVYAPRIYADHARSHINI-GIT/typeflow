import { Link } from 'react-router-dom';
import { Logo, StatCard } from '../components/Layout';
import { useStore } from '../store/AppStore';
import { currentStreak, formatDuration, summarise } from '../lib/results';
import { LESSONS } from '../content/lessons';

const FEATURES = [
  {
    title: 'Every test mode you need',
    body: 'Timed tests from 15 seconds to 5 minutes, word-count challenges from 10 to 200 words, quotes, paragraphs, single sentences, random words and a fully custom test.',
  },
  {
    title: 'Honest, documented metrics',
    body: 'Gross and Net WPM, accuracy, consistency, corrected errors and word-level scoring - all computed with one formula that is written down in the Help page.',
  },
  {
    title: 'Structured lessons',
    body: `${LESSONS.length} progressive lessons covering the home row, top and bottom rows, hand isolation, capitals, numbers, punctuation and fluency.`,
  },
  {
    title: 'Coding practice',
    body: 'Python, JavaScript, TypeScript, HTML, CSS, SQL, JSON and Bash snippets for drilling brackets, quotes and operators. Nothing is ever executed.',
  },
  {
    title: 'On-screen keyboard',
    body: 'See the next key highlighted and which finger should press it, including the correct opposite-hand Shift.',
  },
  {
    title: 'Private by design',
    body: 'No account, no tracking, no server. Everything is stored in your own browser and can be exported as a JSON backup at any time.',
  },
];

export function HomePage() {
  const { data } = useStore();
  const summary = summarise(data.results);
  const streak = currentStreak(data.results);
  const hasHistory = data.results.length > 0;

  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="tf-card overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={42} />
              <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">TypeFlow</span>
            </div>
            <p className="mt-3 text-xl font-semibold" style={{ color: 'var(--tf-accent)' }}>
              Type faster. Type right.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
              A free typing speed test and practice platform. Measure your words per minute, find the keys that slow
              you down, and work through a structured course that takes you from the home row to full paragraphs.
              No sign-up, no subscription, no adverts - open the page and start typing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/test" className="tf-btn tf-btn-primary" style={{ minWidth: 180 }}>
                Start typing
              </Link>
              <Link to="/lessons" className="tf-btn">
                Learn with lessons
              </Link>
              <Link to="/progress" className="tf-btn tf-btn-ghost">
                View progress
              </Link>
            </div>
            <p className="mt-4 text-sm" style={{ color: 'var(--tf-ink-faint)' }}>
              Free to use forever. Your results never leave this browser.
            </p>
          </div>

          {/* Decorative preview of the typing surface */}
          <div
            className="rounded-xl border p-5"
            style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-surface-2)' }}
            aria-hidden="true"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--tf-ink-faint)' }}>
              <span>60 s</span>
              <span>WPM 62</span>
              <span>Acc 97%</span>
            </div>
            <p className="tf-passage mt-4" data-size="small" data-cursor="bar">
              <span className="tf-ch" data-state="correct">t</span>
              <span className="tf-ch" data-state="correct">h</span>
              <span className="tf-ch" data-state="correct">e</span>
              <span className="tf-ch" data-state="correct"> </span>
              <span className="tf-ch" data-state="correct">q</span>
              <span className="tf-ch" data-state="correct">u</span>
              <span className="tf-ch" data-state="incorrect">o</span>
              <span className="tf-ch" data-state="correct">e</span>
              <span className="tf-ch" data-state="correct">t</span>
              <span className="tf-ch" data-current="true">
                {' '}
              </span>
              <span className="tf-ch">w</span>
              <span className="tf-ch">r</span>
              <span className="tf-ch">i</span>
              <span className="tf-ch">t</span>
              <span className="tf-ch">e</span>
              <span className="tf-ch">r</span>
              <span className="tf-ch"> </span>
              <span className="tf-ch">t</span>
              <span className="tf-ch">r</span>
              <span className="tf-ch">i</span>
              <span className="tf-ch">e</span>
              <span className="tf-ch">d</span>
            </p>
            <p className="mt-4 text-center text-sm font-semibold" style={{ color: 'var(--tf-accent)' }}>
              Right index finger - U
            </p>
          </div>
        </div>
      </section>

      {/* Personal snapshot */}
      {hasHistory && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Your snapshot</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tests completed" value={summary.totalTests} />
            <StatCard label="Average net WPM" value={summary.averageWpm} accent />
            <StatCard label="Best net WPM" value={summary.highestWpm} />
            <StatCard label="Practice time" value={formatDuration(summary.totalPracticeSec)} hint={`${streak}-day streak`} />
          </div>
        </section>
      )}

      {/* Features */}
      <section>
        <h2 className="mb-1 text-xl font-bold">Everything here is free</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
          There is no premium tier, no paid plan and nothing locked behind an account. These are all of the features.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="tf-card p-5">
              <h3 className="text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Getting started */}
      <section className="tf-card p-6">
        <h2 className="text-xl font-bold">How to start</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['1. Pick a test', 'Choose a duration or word count, set the difficulty, and open the test.'],
            ['2. Just type', 'The timer starts on your first keystroke. Correct characters turn green, mistakes turn red.'],
            ['3. Review and repeat', 'See your WPM, accuracy and consistency, then retry the same test or move on.'],
          ].map(([title, body]) => (
            <li key={title}>
              <h3 className="font-bold" style={{ color: 'var(--tf-accent)' }}>
                {title}
              </h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
                {body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <Link to="/test" className="tf-btn tf-btn-primary">
            Start your first test
          </Link>
        </div>
      </section>
    </div>
  );
}
