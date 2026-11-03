// Help page: how to use the tests and how every metric is calculated.

import { PageHeader } from '../components/Layout';

const FORMULAS = [
  ['Standard word', '5 characters, including the spaces between words. This is the industry convention, so a "word" is a unit of length, not an English word.'],
  ['Gross WPM', '(total characters typed ÷ 5) ÷ minutes elapsed. This is raw speed and ignores mistakes entirely.'],
  ['Net WPM', 'Gross WPM − (uncorrected errors ÷ minutes elapsed), never below 0. Each mistake you leave in the text costs you one word per minute of credit.'],
  ['Accuracy', 'correct characters ÷ total characters typed × 100. A character counts as correct only if you got it right the first time - fixing a mistake still costs accuracy, which is why accuracy and Net WPM tell you different things.'],
  ['Consistency', '100 × (1 − standard deviation ÷ mean) of your per-second typing rate. A steady pace scores high; bursts followed by pauses score low. It shows "--" when a test was too short to measure variation.'],
  ['Uncorrected errors', 'Characters that are still wrong when the test ends. These are what Net WPM is penalised for.'],
  ['Corrected errors', 'Characters you typed wrong and then fixed with backspace. These do not penalise Net WPM, but they cost you time and they do reduce accuracy.'],
  ['Correct / incorrect words', 'A word counts as correct only if every character in it is right. One wrong letter makes the whole word incorrect.'],
];

const FAQ = [
  [
    'When does the timer start?',
    'On your first keystroke, not when the page loads. You can read the passage for as long as you like before starting.',
  ],
  [
    'Can I pause a test?',
    'Yes. Press the Pause button and the clock stops; your typed progress is kept. Resume when you are ready. Paused time is not counted in your WPM.',
  ],
  [
    'Why can I not paste the passage?',
    'Pasting is blocked on purpose. The typing engine only ever accepts single characters, so a pasted block cannot produce a fake score.',
  ],
  [
    'How does backspace work?',
    'Backspace clears the previous character and moves the cursor back, so you can retype it. Ctrl, Alt or Cmd with Backspace clears the whole previous word. A character you got wrong is remembered as a corrected error even after you fix it.',
  ],
  [
    'Does a word-count test have a time limit?',
    'No. Word-count, quote, paragraph, sentence, lesson and coding tests end when you reach the last character. Only the timed and custom modes use a clock.',
  ],
  [
    'What is a good typing speed?',
    'Around 40 WPM is average for everyday computer users, 60-70 WPM is fast, and above 80 WPM is professional. Accuracy below 95% usually matters more than speed.',
  ],
  [
    'Where is my data stored?',
    'In this browser only, using localStorage. There is no account, no server and no database. If you clear site data, use private browsing, or switch device or browser, your history will not be there. Export a JSON backup from Settings to keep it.',
  ],
  [
    'Is anything paid?',
    'No. There is no premium tier, no advertising, no paid API and no account. Every feature on this site is available to everyone for free.',
  ],
];

const SHORTCUTS = [
  ['Esc', 'Restart the current test with fresh text'],
  ['Backspace', 'Delete the previous character'],
  ['Ctrl / Alt / Cmd + Backspace', 'Delete the previous word'],
  ['Enter', 'Type a line break (used in coding practice)'],
  ['Tab', 'Move focus to the next control'],
];

export function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help"
        lead="How to use TypeFlow, and exactly how every number on the results screen is calculated."
      />

      <section className="tf-card mb-6 p-5" aria-labelledby="getting-started">
        <h2 id="getting-started" className="text-lg font-bold">
          Taking a test
        </h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          <li>Open <strong>Typing Tests</strong> and choose a mode - a timed test, a word count, a quote, a paragraph, a single sentence, random words, or a fully custom test.</li>
          <li>Pick a difficulty. Beginner uses short common words, intermediate uses longer sentences and vocabulary, and advanced adds complex words, punctuation and numbers.</li>
          <li>Optionally switch on punctuation, numbers or capital letters for word-based modes.</li>
          <li>Press <strong>Start test</strong>, then simply begin typing. The timer starts with your first keystroke.</li>
          <li>Correct characters turn green, mistakes turn red, and the cursor marks your position. A wrong space is shown as a red block so you can see it.</li>
          <li>When the test ends you get a full results breakdown, and the result is saved to this browser.</li>
        </ol>
      </section>

      <section className="tf-card mb-6 p-5" aria-labelledby="metrics">
        <h2 id="metrics" className="text-lg font-bold">
          How the metrics are calculated
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--tf-ink-soft)' }}>
          Every mode uses exactly the same formulas, so results are comparable across tests.
        </p>
        <dl className="mt-4 flex flex-col gap-3">
          {FORMULAS.map(([term, definition]) => (
            <div key={term} className="border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--tf-border)' }}>
              <dt className="font-bold" style={{ color: 'var(--tf-accent)' }}>
                {term}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
                {definition}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="tf-card mb-6 p-5" aria-labelledby="shortcuts">
        <h2 id="shortcuts" className="text-lg font-bold">
          Keyboard shortcuts
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {SHORTCUTS.map(([key, meaning]) => (
            <li key={key} className="flex flex-wrap items-center gap-3 text-sm">
              <kbd
                className="rounded px-2 py-1 text-xs font-bold"
                style={{ background: 'var(--tf-surface-2)', border: '1px solid var(--tf-border)', fontFamily: 'var(--font-mono)' }}
              >
                {key}
              </kbd>
              <span style={{ color: 'var(--tf-ink-soft)' }}>{meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tf-card p-5" aria-labelledby="faq">
        <h2 id="faq" className="text-lg font-bold">
          Frequently asked questions
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="rounded-lg border p-3" style={{ borderColor: 'var(--tf-border)' }}>
              <summary className="cursor-pointer font-semibold">{question}</summary>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
