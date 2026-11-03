// End-to-end checks against the REAL production build, driven by headless Chrome.
//
// This serves `dist/` exactly as a static host does (including the SPA fallback that
// vercel.json configures) and drives the app through a real browser. Any console error
// fails the run, because a console error in production is a bug.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

// fileURLToPath (not .pathname) so paths containing spaces resolve correctly.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = 4319;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return CHROME_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    let filePath = join(DIST, normalize(decodeURIComponent(url.pathname)));
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      // SPA fallback, mirroring the rewrite rule in vercel.json.
      filePath = join(DIST, 'index.html');
    }
    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

/** Type a string into the page one real key at a time. */
async function typeText(page, text, delay = 12) {
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

async function run() {
  const chrome = findChrome();
  if (!chrome) {
    console.error('No Chrome/Chromium found. Set CHROME_PATH to a browser binary.');
    process.exit(2);
  }

  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // ---- Homepage -----------------------------------------------------
    console.log('\nHomepage');
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    check('page title mentions TypeFlow', (await page.title()).includes('TypeFlow'));
    check('tagline is rendered', (await page.content()).includes('Type faster. Type right.'));
    check('start button exists', (await page.$$('a[href="/test"]')).length > 0);
    check(
      'free positioning is stated',
      (await page.$eval('body', (b) => b.innerText)).toLowerCase().includes('free'),
    );
    check('no paid wording on the homepage', !/subscribe|premium plan|upgrade now|\$\d/i.test(await page.$eval('body', (b) => b.innerText)));

    // ---- Navigation ----------------------------------------------------
    console.log('\nNavigation');
    for (const [path, heading] of [
      ['/test', 'Typing tests'],
      ['/lessons', 'Practice lessons'],
      ['/code', 'Coding practice'],
      ['/progress', 'Progress dashboard'],
      ['/settings', 'Settings'],
      ['/help', 'Help'],
      ['/about', 'About TypeFlow'],
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
      const h1 = await page.$eval('h1', (el) => el.textContent?.trim() ?? '');
      check(`${path} deep link renders "${heading}"`, h1 === heading, `got "${h1}"`);
    }

    // ---- Unknown route falls back --------------------------------------
    await page.goto(`${BASE}/this-route-does-not-exist`, { waitUntil: 'networkidle0' });
    check('unknown route redirects to the homepage', new URL(page.url()).pathname === '/');

    // ---- Run a real typing test -----------------------------------------
    console.log('\nTyping test');
    await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });

    // Choose the word-count mode so the test ends deterministically.
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Word count test'));
      btn?.click();
    });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '10 words');
      btn?.click();
    });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Start test');
      btn?.click();
    });
    await page.waitForSelector('.tf-passage');
    check('typing surface is rendered', (await page.$('.tf-passage')) !== null);
    check('on-screen keyboard is shown by default', (await page.$('.tf-key')) !== null);

    const expected = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.textContent).join(''));
    check('passage has 10 words', expected.trim().split(/\s+/).length === 10, `got "${expected}"`);

    const nextKeyBefore = await page.$$eval('.tf-key[data-next="true"]', (els) => els.length);
    check('next key is highlighted before typing', nextKeyBefore > 0);

    // Type the first character correctly and one wrong, then fix it.
    await typeText(page, expected.slice(0, 3));
    let states = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.dataset.state));
    check('correct characters are marked correct', states.slice(0, 3).every((s) => s === 'correct'));

    await page.keyboard.type('\u00a7'.replace('\u00a7', 'Z')); // a deliberately wrong character
    states = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.dataset.state));
    check('a wrong character is marked incorrect', states[3] === 'incorrect');

    await page.keyboard.press('Backspace');
    states = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.dataset.state));
    check('backspace clears the slot back to pending', states[3] === 'pending');

    await typeText(page, expected.slice(3, 4));
    states = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.dataset.state));
    check('a fixed mistake is marked corrected', states[3] === 'corrected');

    // Paste must be refused.
    await page.evaluate(() => {
      const input = document.querySelector('input[aria-label^="Typing input"]');
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'cheating text' } });
      input?.dispatchEvent(event);
    });
    await new Promise((r) => setTimeout(r, 150));
    const pasteWarning = await page.$eval('body', (b) => b.innerText);
    check('pasting is blocked and explained', pasteWarning.includes('Pasting is disabled'));

    // Finish the passage.
    await typeText(page, expected.slice(4), 6);
    await page.waitForFunction(() => document.body.innerText.includes('Test complete'), { timeout: 10_000 });
    console.log('\nResults');
    // Stat labels are rendered with CSS `text-transform: uppercase`, which Chrome
    // reflects in innerText, so these comparisons are deliberately case-insensitive.
    const resultsText = await page.$eval('body', (b) => b.innerText);
    const resultsLower = resultsText.toLowerCase();
    check('results screen shows Net WPM', resultsLower.includes('net wpm'));
    check('results screen shows Gross WPM', resultsLower.includes('gross wpm'));
    check('results screen shows accuracy', resultsLower.includes('accuracy'));
    check('results screen shows consistency', resultsLower.includes('consistency'));
    check('results show the correct/incorrect comparison', resultsText.includes('Correct vs incorrect characters'));
    check('results show a detailed breakdown', resultsText.includes('Corrected errors'));
    check('a personal best is announced on the first test', resultsText.includes('New personal best'));
    check('retry controls are offered', resultsText.includes('Retry the same text'));

    const accuracyShown = Number(/accuracy\s*\n\s*(\d+(?:\.\d+)?)%/i.exec(resultsText)?.[1] ?? '0');
    check('accuracy is below 100 after a real mistake', accuracyShown > 0 && accuracyShown < 100, `got ${accuracyShown}%`);
    const storedAccuracy = await page.evaluate(
      () => JSON.parse(localStorage.getItem('typeflow.data.v1')).results[0].accuracy,
    );
    check('stored accuracy reflects the mistake', storedAccuracy > 0 && storedAccuracy < 100, `got ${storedAccuracy}%`);

    // ---- Persistence ---------------------------------------------------
    console.log('\nPersistence');
    const stored = await page.evaluate(() => localStorage.getItem('typeflow.data.v1'));
    check('result is written to localStorage', stored !== null && JSON.parse(stored).results.length === 1);

    await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle0' });
    const progressText = await page.$eval('body', (b) => b.innerText);
    check('progress dashboard reflects the saved test', progressText.toLowerCase().includes('tests completed'));
    check('progress dashboard is no longer empty', !progressText.includes('No tests recorded yet'));
    check('progress dashboard lists recent tests', progressText.includes('Recent tests'));
    check('progress dashboard shows achievements', progressText.includes('First keystrokes'));

    // Survives a hard reload.
    await page.reload({ waitUntil: 'networkidle0' });
    check(
      'history survives a reload',
      !(await page.$eval('body', (b) => b.innerText)).includes('No tests recorded yet'),
    );

    // ---- Lessons --------------------------------------------------------
    console.log('\nLessons');
    await page.goto(`${BASE}/lessons`, { waitUntil: 'networkidle0' });
    const lessonsText = await page.$eval('body', (b) => b.innerText);
    check('lesson levels are listed', lessonsText.includes('Level 1 - Home row'));
    check('lesson completion counter is shown', lessonsText.toLowerCase().includes('lessons completed'));
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Start lesson');
      btn?.click();
    });
    await page.waitForSelector('.tf-passage');
    check('lesson exercise opens with its explanation', (await page.$eval('body', (b) => b.innerText)).includes('raised bump'));
    const lessonText = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.textContent).join(''));
    await typeText(page, lessonText, 4);
    await page.waitForFunction(
      () => /Lesson complete|Not quite yet/.test(document.body.innerText),
      { timeout: 15_000 },
    );
    check('lesson reports a pass/fail outcome', /Lesson complete|Not quite yet/.test(await page.$eval('body', (b) => b.innerText)));

    // ---- Coding practice -------------------------------------------------
    console.log('\nCoding practice');
    await page.goto(`${BASE}/code`, { waitUntil: 'networkidle0' });
    const codeText = await page.$eval('body', (b) => b.innerText);
    check('coding page states that code is not executed', codeText.includes('never runs any code'));
    check('language filters are available', codeText.includes('Python') && codeText.includes('SQL'));

    // ---- Settings, theme, export/import -----------------------------------
    console.log('\nSettings');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'dark');
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 120));
    check('dark theme is applied to the document', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
    check(
      'theme choice is persisted',
      JSON.parse(await page.evaluate(() => localStorage.getItem('typeflow.settings.v1'))).theme === 'dark',
    );

    const settingsText = await page.$eval('body', (b) => b.innerText);
    check('data loss is explained honestly', settingsText.includes('lost if you clear your browser storage'));
    check('export control is present', settingsText.includes('Export backup (JSON)'));
    check('import control is present', settingsText.includes('Import backup'));
    check('reset requires confirmation', settingsText.includes('Clear all my data'));

    // Import validation path: feed a bad file through the real handler.
    const importOutcome = await page.evaluate(async () => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['{"app":"somethingelse","version":1,"data":{}}'], 'bad.json', { type: 'application/json' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      return document.body.innerText;
    });
    check('a foreign backup file is rejected', importOutcome.includes('could not be imported'));
    check('rejection states that nothing changed', importOutcome.includes('Nothing was changed'));

    // ---- Help page documents the formulas ---------------------------------
    console.log('\nHelp');
    await page.goto(`${BASE}/help`, { waitUntil: 'networkidle0' });
    const helpText = await page.$eval('body', (b) => b.innerText);
    check('help documents the Net WPM formula', helpText.includes('Gross WPM − (uncorrected errors'));
    check('help documents the accuracy formula', helpText.includes('correct characters ÷ total characters'));
    // FAQ answers live inside collapsed <details>, so read the DOM rather than innerText.
    const helpHtml = (await page.content()).toLowerCase();
    check('help explains local-only storage', helpHtml.includes('localstorage'));
    check('help explains that nothing is paid', helpHtml.includes('no premium tier'));
    await page.evaluate(() => document.querySelector('details')?.setAttribute('open', 'open'));
    check(
      'FAQ answers become visible when expanded',
      (await page.$eval('body', (b) => b.innerText)).includes('first keystroke'),
    );

    // ---- Responsive viewports ---------------------------------------------
    console.log('\nResponsive layout');
    for (const [label, width, height] of [
      ['1440px desktop', 1440, 900],
      ['1024px laptop', 1024, 768],
      ['768px tablet', 768, 1024],
      ['390px mobile', 390, 844],
    ]) {
      await page.setViewport({ width, height });
      await page.goto(BASE, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${label}: no horizontal overflow on the homepage`, overflow <= 1, `overflow ${overflow}px`);

      await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
      const testOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${label}: no horizontal overflow on the test page`, testOverflow <= 1, `overflow ${testOverflow}px`);
    }

    // Mobile navigation menu.
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.click('button[aria-controls="mobile-nav"]');
    await page.waitForSelector('#mobile-nav');
    check('mobile menu opens', (await page.$('#mobile-nav')) !== null);

    // ---- Accessibility basics ----------------------------------------------
    console.log('\nAccessibility basics');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    check('a main landmark exists', (await page.$('main')) !== null);
    check('a skip link exists', (await page.$('.tf-skip-link')) !== null);
    check('exactly one h1 per page', (await page.$$('h1')).length <= 1);
    const unlabelled = await page.$$eval('button', (els) =>
      els.filter((el) => !el.textContent?.trim() && !el.getAttribute('aria-label')).length,
    );
    check('no unlabelled buttons', unlabelled === 0, `${unlabelled} found`);
    const imgsWithoutAlt = await page.$$eval('img', (els) => els.filter((el) => !el.hasAttribute('alt')).length);
    check('every img has alt text', imgsWithoutAlt === 0);

    // ---- No network calls to third parties -----------------------------------
    console.log('\nNetwork');
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
    const external = requests.filter((u) => !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:'));
    check('no external network requests', external.length === 0, external.join(', '));

    // ---- Console cleanliness ---------------------------------------------------
    console.log('\nConsole');
    check('no console errors during the whole run', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed.`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
