// About page: purpose, privacy position and content provenance.

import { Link } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { CODE_SNIPPETS } from '../content/code';
import { LESSONS } from '../content/lessons';
import { PARAGRAPHS, QUOTES, SENTENCES } from '../content/passages';
import { ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS } from '../content/words';

export function AboutPage() {
  const wordCount = BEGINNER_WORDS.length + INTERMEDIATE_WORDS.length + ADVANCED_WORDS.length;

  return (
    <div>
      <PageHeader title="About TypeFlow" lead="Type faster. Type right." />

      <section className="tf-card mb-6 p-5">
        <h2 className="text-lg font-bold">Why this exists</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          Typing is the one computer skill almost everybody uses every day and almost nobody is taught properly. Most
          people reach a comfortable plateau and stay there for years, making the same handful of mistakes. TypeFlow
          exists to make the gap visible and fixable: it measures speed, accuracy and consistency separately, shows
          which of the three is holding you back, and gives you a structured course to work through rather than an
          endless stream of random words.
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          It is deliberately small and completely free. There is no account, no premium tier, no advertising, and no
          server collecting your keystrokes.
        </p>
      </section>

      <section className="tf-card mb-6 p-5">
        <h2 className="text-lg font-bold">Privacy</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          <li>TypeFlow is a static website. There is no backend, no database and no analytics service.</li>
          <li>Your test history, lesson progress, records, achievements and settings are stored in your browser's localStorage and never leave your device.</li>
          <li>No account or email address is required, and none is ever requested.</li>
          <li>
            Because the data lives in your browser, it is lost if you clear site data, use private browsing, or move to a
            different device or browser. You can export it as a JSON file from <Link to="/settings" style={{ color: 'var(--tf-accent)', fontWeight: 600 }}>Settings</Link> and import it again later.
          </li>
          <li>Nothing on this site costs money, and no paid service is needed to run it.</li>
        </ul>
      </section>

      <section className="tf-card mb-6 p-5">
        <h2 className="text-lg font-bold">Content and licensing</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          The typing library ships with the site, so everything works offline once the page has loaded and no external
          API is ever called to generate text.
        </p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2" style={{ color: 'var(--tf-ink-soft)' }}>
          <li>
            <strong>{wordCount}</strong> words across three difficulty levels
          </li>
          <li>
            <strong>{SENTENCES.length}</strong> practice sentences
          </li>
          <li>
            <strong>{PARAGRAPHS.length}</strong> paragraphs (short, medium and long)
          </li>
          <li>
            <strong>{QUOTES.length}</strong> quotes with sources recorded
          </li>
          <li>
            <strong>{CODE_SNIPPETS.length}</strong> coding snippets in 8 languages
          </li>
          <li>
            <strong>{LESSONS.length}</strong> lessons across 6 levels
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          All sentences, paragraphs, word lists, lessons and code snippets were written for TypeFlow. Quotes are either
          original lines or passages from public-domain works - Austen, Dickens, Thoreau, Shelley, Carroll, Lincoln,
          Marcus Aurelius and Sun Tzu - and each quote displays its source while you type it. Nothing is copied from
          commercial typing websites.
        </p>
      </section>

      <section className="tf-card p-5">
        <h2 className="text-lg font-bold">How it is built</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--tf-ink-soft)' }}>
          React, TypeScript and Vite, with Tailwind for styling and hand-written SVG for the charts. The typing engine
          is a pure state machine, which is what makes its scoring testable: every rule about correctness, backspace,
          timing and paste-blocking is covered by unit tests. The site is deployed as a static build on Vercel's free
          Hobby plan.
        </p>
      </section>
    </div>
  );
}
