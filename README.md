# TypeFlow

**Type faster. Type right.**

A free, English-only typing speed test and practice platform. Timed tests, word-count
challenges, quotes, paragraphs, sentences, random words, coding drills and a progressive
25-lesson course — with speed, accuracy and consistency measured separately so you can see
which one is actually holding you back.

No account. No subscription. No advertising. No server. Your progress is stored in your own
browser and never leaves your device.

- **Live site:** https://typeflow.vercel.app
- **Repository:** https://github.com/DIVYAPRIYADHARSHINI-GIT/typeflow

---

## What it does

### Test modes
| Mode | Description |
| --- | --- |
| Time-based | 15 s, 30 s, 60 s, 2 min, 3 min, 5 min |
| Word count | 10, 25, 50, 100, 200 words |
| Custom | Any duration (10–1800 s) and word count (5–500) |
| Quote | Public-domain and original quotes, each with its source shown |
| Paragraph | Short, medium and long passages |
| Sentence | One sentence at a time, for rebuilding accuracy |
| Random words | Pure word sequences for raw speed |
| Coding | Python, JavaScript, TypeScript, HTML, CSS, SQL, JSON, Bash |

Three difficulty levels (beginner / intermediate / advanced), plus optional punctuation,
numbers and capital letters on word-based modes. Pause and resume, restart, and a clear exit
back to mode selection.

### Metrics — all documented in-app on the Help page
```
standard word = 5 characters (including the spaces between words)
Gross WPM     = (total characters / 5) / minutes
Net WPM       = Gross WPM − (uncorrected errors / minutes), floored at 0
Accuracy %    = correct characters / total characters × 100
Consistency % = 100 × (1 − stdev(per-second WPM) / mean(per-second WPM)), clamped 0–100
```
Also reported: total / correct / incorrect characters, correct and incorrect words,
uncorrected errors, and corrected errors (mistakes you fixed with backspace).

A character counts as correct for accuracy only if it was right **first time**, so fixing a
mistake still costs accuracy while no longer penalising Net WPM. That is a deliberate
distinction: Net WPM measures the text you left behind, accuracy measures your keystrokes.

### Everything else
- **Progressive lessons** — 25 lessons across 6 levels: home row, top row, bottom row,
  left/right-hand isolation, commonly confused letters, capitals, numbers, punctuation,
  the 100 most frequent words, sentence rhythm, endurance and technical text. Each lesson
  uses only the keys introduced so far, and has an explanation, a target, and progress
  tracking you can revisit.
- **On-screen QWERTY keyboard** — highlights the next key, colours the last keystroke
  correct/incorrect, names the finger and hand, and applies the opposite-hand Shift rule.
  Collapses to a compact finger hint on narrow screens.
- **Results dashboard** — full breakdown, correct-vs-incorrect comparison bar, in-test speed
  graph, comparison against earlier attempts at the same test, personal-best detection and a
  performance message.
- **Progress dashboard** — tests completed, average/highest WPM, average accuracy, practice
  time, streaks, 18 achievements, personal records per test kind, WPM and accuracy trend
  charts, practice history, and plain-language feedback on which dimension needs work.
  Filter by day / week / month / all time.
- **Settings** — light & dark themes, text size, cursor style (bar/block/underline), sound
  effects, keyboard and finger-guide toggles, live-stats toggle, blind mode, default
  difficulty / duration / word count, JSON export & import, and a confirmed reset.

---

## Free, private, and honest by design

- **Storage:** browser `localStorage` only — the single storage mechanism in the app. No
  IndexedDB, no cookies, no server, no database.
- **No backend:** a pure static site. There are no API routes, no serverless functions, no
  environment variables and no API keys.
- **No account:** open the URL and start typing.
- **Data loss is stated plainly** in Settings, Help and About: clearing site data, private
  browsing, or switching device/browser loses your history. Export a JSON backup to keep it.
- **Import is never destructive:** a backup file is validated first, then summarised, then
  the user explicitly chooses *merge* or *replace*. An invalid or foreign file is rejected
  with a reason and nothing is changed.
- **Storage failure is handled:** if `localStorage` is unavailable or full, a banner explains
  the situation and the app keeps working instead of crashing.
- **Anti-cheat:** the engine only ever accepts single characters, and paste/drop are refused
  with an on-screen explanation, so a pasted passage cannot inflate a score.

---

## Content library

All content ships in the bundle, so no external API is ever called to generate text.

| Pool | Count |
| --- | --- |
| Words (3 difficulty levels) | 746 |
| Practice sentences | 30 |
| Paragraphs (short/medium/long) | 10 |
| Quotes (with sources) | 15 |
| Coding snippets (8 languages) | 16 |
| Lessons (6 levels) | 25 |

Every sentence, paragraph, word list, lesson and code snippet was written for TypeFlow.
Quotes are either original lines or passages from public-domain works (Austen, Dickens,
Thoreau, Shelley, Carroll, Lincoln, Marcus Aurelius, Sun Tzu), and each quote displays its
source while you type it. Nothing is copied from commercial typing websites.

A unit test asserts that **every** shipped character — in every lesson, passage, quote and
snippet, plus generated word text at all option combinations — is typable on the mapped
QWERTY layout.

---

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router 7

Charts are hand-written SVG (no charting dependency). Sounds are synthesised with the Web
Audio API (no audio files). Runtime dependencies: `react`, `react-dom`, `react-router-dom`.

### Architecture

```
src/
  lib/
    types.ts       Shared domain types (all JSON-serialisable)
    engine.ts      Pure typing state machine - the heart of the app
    metrics.ts     WPM / accuracy / consistency formulas, one definition
    generator.ts   Seeded text generation per mode
    results.ts     Results, records, streaks, achievements, aggregation
    storage.ts     Safe localStorage access, validation, backup merge
    keyboard.ts    QWERTY layout and finger mapping
    sound.ts       Web Audio blips
  content/         words, passages, code snippets, lessons
  components/      TypingTest, Keyboard, ResultsView, Charts, Layout
  pages/           Home, Test, Lessons, Code, Progress, Settings, Help, About
  store/           AppStore - the single persistence boundary
```

The typing engine is a **pure reducer**: every keystroke is an action applied to immutable
state. Correctness, backspace semantics, word deletion, pause/resume timing, auto-finish and
paste rejection are therefore all unit-testable without a DOM — which is why the test suite
can assert scoring behaviour directly rather than through the UI.

Aggregates are never stored. Averages, records, streaks and charts are recomputed from the
raw result list, so deleting or importing history corrects every derived number automatically.

---

## Testing

| Suite | Checks | Command |
| --- | --- | --- |
| Unit tests (Vitest) | **231** | `npm run test` |
| E2E, headless Chrome vs production build | **74** | `npm run test:e2e` |
| Design QA (WCAG contrast + layout) | **57** | `npm run test:design` |
| Type check | clean | `npm run typecheck` |
| Lint (oxlint) | 0 errors, 0 warnings | `npm run lint` |
| **Total automated checks** | **362** | `npm run test:all` |

Unit tests cover WPM and Net WPM, accuracy, consistency, word-level scoring, character
validation, backspace and word-delete, corrected-vs-uncorrected errors, timer and pause
behaviour, auto-finish, progress reporting, paste rejection, localStorage persistence and
failure modes, JSON backup validation and merge, records, lesson progress, streaks,
achievements, seeded generation, the keyboard/finger map, and content integrity.

The E2E suite serves the real `dist/` build exactly as the host does (including the SPA
rewrite), drives a complete typing test with a real mistake and correction through actual
key events, verifies persistence across a reload, exercises the import-rejection path, and
**fails on any console error**. Responsive layout is asserted at 1440 / 1024 / 768 / 390 px.

The design-QA suite composites each rendered text node against its real painted background
and asserts WCAG AA across all 8 pages in **both themes**, plus tap-target and layout
invariants at four widths.

### Bugs the suites caught and fixed
1. `--tf-ink-faint` rendered at 4.33:1 on the surface ramp — below AA on all 8 pages, both themes.
2. `--tf-pending` (un-typed passage text) at 3.01:1 — well below AA.
3. A long code line forced 291 px of horizontal page scroll at 390 px (missing `min-w-0` on a flex child).
4. The header wordmark was a 28 px tap target, under the 44 px guideline.
5. The design-QA harness itself silently re-tested the light theme, because it set the
   settings mirror key but not the data blob the store hydrates from.

---

## Screenshots

`docs/screenshots/` — homepage (light & dark), test setup, live typing, results dashboard,
progress dashboard (light & dark), lessons, coding practice, settings, and mobile/tablet
views at 390 px and 768 px. Regenerate with `npm run screenshots`.

---

## Running locally

```bash
npm install
npm run dev        # development server
npm run build      # production build to dist/
npm run preview    # serve the production build
npm run test:all   # lint + typecheck + unit + build + e2e + design QA
```

Requires Node 20+. The E2E, design-QA and screenshot scripts need a local Chrome or
Chromium; set `CHROME_PATH` if it is not in a standard location.

## Deployment

Static build (`dist/`) on **Vercel Hobby (free)**, auto-deploying from `main`.
`vercel.json` sets the SPA rewrite so deep links such as `/progress` resolve after a hard
refresh. No serverless functions, no paid analytics, no databases, no environment variables.
