// Verify the DEPLOYED site, not a local build.
//
// Usage: node scripts/live-check.mjs [url]
// Defaults to the production URL. Any console error on the live site fails the run.

import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv[2] ?? 'https://typeflow.vercel.app').replace(/\/$/, '');
const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` - ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

async function typeText(page, text, delay = 10) {
  for (const char of text) await page.keyboard.type(char, { delay });
}

async function run() {
  if (!CHROME) {
    console.error('No Chrome found. Set CHROME_PATH.');
    process.exit(2);
  }
  console.log(`Checking live site: ${BASE}\n`);

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });
  const consoleErrors = [];
  const pageErrors = [];

  try {
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    await page.setViewport({ width: 1440, height: 900 });

    console.log('Reachability');
    const response = await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 45_000 });
    check('homepage returns 200', response?.status() === 200, `status ${response?.status()}`);
    check('served over HTTPS', BASE.startsWith('https://'));
    check('page title is correct', (await page.title()).includes('TypeFlow'));
    check('tagline renders', (await page.content()).includes('Type faster. Type right.'));

    console.log('\nRoutes (deep links must work after deployment)');
    for (const [path, heading] of [
      ['/test', 'Typing tests'],
      ['/lessons', 'Practice lessons'],
      ['/code', 'Coding practice'],
      ['/progress', 'Progress dashboard'],
      ['/settings', 'Settings'],
      ['/help', 'Help'],
      ['/about', 'About TypeFlow'],
    ]) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0', timeout: 45_000 });
      check(`${path} returns 200`, res?.status() === 200, `status ${res?.status()}`);
      const h1 = await page.$eval('h1', (el) => el.textContent?.trim() ?? '').catch(() => '');
      check(`${path} renders "${heading}"`, h1 === heading, `got "${h1}"`);
    }

    console.log('\nLive typing test');
    await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Word count test'))?.click();
    });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '10 words')?.click();
    });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Start test')?.click();
    });
    await page.waitForSelector('.tf-passage', { timeout: 20_000 });
    const text = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.textContent).join(''));
    check('a passage is generated on the live site', text.trim().split(/\s+/).length === 10);
    await typeText(page, text, 5);
    await page.waitForFunction(() => document.body.innerText.includes('Test complete'), { timeout: 20_000 });
    check('a test completes and shows results', true);
    const stored = await page.evaluate(() => localStorage.getItem('typeflow.data.v1'));
    check('the result persists to localStorage on the live site', stored !== null && JSON.parse(stored).results.length >= 1);

    console.log('\nProgress after a reload');
    await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle0' });
    check(
      'progress dashboard shows the live result',
      !(await page.$eval('body', (b) => b.innerText)).includes('No tests recorded yet'),
    );

    console.log('\nAssets and responsiveness');
    const cssLoaded = await page.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)');
    check('stylesheet is served and applied', cssLoaded);
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no horizontal overflow at 390px on the live site', overflow <= 1, `${overflow}px`);

    console.log('\nConsole');
    check('no console errors on the live site', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('no uncaught page errors on the live site', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }

  console.log(`\n${passed} live checks passed, ${failures.length} failed.`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
