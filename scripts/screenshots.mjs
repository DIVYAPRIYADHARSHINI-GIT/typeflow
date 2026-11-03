// Capture the report screenshots from the real production build.
// Output: docs/screenshots/*.png

import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));

function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, BASE);
    let filePath = join(DIST, normalize(decodeURIComponent(url.pathname)));
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
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

async function typeText(page, text, delay = 8) {
  for (const char of text) await page.keyboard.type(char, { delay });
}

/** Seed a realistic 3-week history so the dashboard screenshots are not empty. */
function seedHistory() {
  const results = [];
  const now = Date.now();
  for (let day = 20; day >= 0; day -= 1) {
    if (day % 3 === 2) continue; // a few rest days
    const count = day % 5 === 0 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      const progress = (20 - day) / 20;
      const netWpm = Math.round((38 + progress * 22 + (i === 1 ? 3 : 0)) * 10) / 10;
      const accuracy = Math.round((93 + progress * 5) * 10) / 10;
      const at = new Date(now - day * 86400000 + i * 3600000).toISOString();
      results.push({
        id: `seed-${day}-${i}`,
        at,
        mode: i === 1 ? 'words' : 'time',
        difficulty: 'intermediate',
        label: i === 1 ? '50 words' : '60s test',
        durationSec: i === 1 ? null : 60,
        wordCount: i === 1 ? 50 : null,
        completed: true,
        grossWpm: Math.round((netWpm + 3) * 10) / 10,
        netWpm,
        accuracy,
        consistency: Math.round((74 + progress * 14) * 10) / 10,
        totalCharacters: Math.round(netWpm * 5),
        correctCharacters: Math.round(netWpm * 5 * (accuracy / 100)),
        incorrectCharacters: Math.round(netWpm * 5 * (1 - accuracy / 100)),
        correctWords: Math.round(netWpm * 0.9),
        incorrectWords: 2,
        totalErrors: 3,
        correctedErrors: 6,
        elapsedSec: 60,
        samples: Array.from({ length: 12 }, (_, t) => ({
          t: t * 5 + 5,
          wpm: netWpm,
          instantWpm: netWpm + ((t % 3) - 1) * 6,
          errors: t % 4,
        })),
      });
    }
  }
  return {
    version: 1,
    settings: {
      version: 1,
      theme: 'light',
      sound: false,
      showKeyboard: true,
      showFingerGuide: true,
      cursor: 'bar',
      textSize: 'medium',
      liveStats: true,
      blindMode: false,
      defaultDifficulty: 'intermediate',
      defaultDurationSec: 60,
      defaultWordCount: 50,
    },
    results,
    lessons: {
      'l1-1': { lessonId: 'l1-1', completed: true, attempts: 3, bestWpm: 24, bestAccuracy: 97, lastAt: new Date(now).toISOString() },
      'l1-2': { lessonId: 'l1-2', completed: true, attempts: 2, bestWpm: 26, bestAccuracy: 95, lastAt: new Date(now).toISOString() },
      'l1-3': { lessonId: 'l1-3', completed: true, attempts: 1, bestWpm: 22, bestAccuracy: 93, lastAt: new Date(now).toISOString() },
      'l2-1': { lessonId: 'l2-1', completed: true, attempts: 4, bestWpm: 29, bestAccuracy: 96, lastAt: new Date(now).toISOString() },
      'l2-2': { lessonId: 'l2-2', completed: false, attempts: 2, bestWpm: 18, bestAccuracy: 88, lastAt: new Date(now).toISOString() },
    },
    records: {
      byKey: {
        'time:60': { netWpm: 63, accuracy: 98, at: new Date(now).toISOString() },
        'words:50': { netWpm: 60.4, accuracy: 97.2, at: new Date(now).toISOString() },
      },
      bestNetWpm: 63,
      bestAccuracy: 98,
    },
    achievements: {
      'first-test': new Date(now - 20 * 86400000).toISOString(),
      'ten-tests': new Date(now - 10 * 86400000).toISOString(),
      'wpm-30': new Date(now - 19 * 86400000).toISOString(),
      'wpm-50': new Date(now - 6 * 86400000).toISOString(),
      'accuracy-95': new Date(now - 14 * 86400000).toISOString(),
      'streak-3': new Date(now - 16 * 86400000).toISOString(),
      'streak-7': new Date(now - 8 * 86400000).toISOString(),
      'lesson-5': new Date(now - 4 * 86400000).toISOString(),
    },
  };
}

async function run() {
  if (!CHROME) {
    console.error('No Chrome found. Set CHROME_PATH.');
    process.exit(2);
  }
  await mkdir(OUT, { recursive: true });
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'shell',
    args: ['--no-sandbox', '--force-device-scale-factor=2'],
  });

  const shots = [];
  try {
    const page = await browser.newPage();

    // Seed history so the dashboard screenshots show real-looking data.
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate((data) => {
      localStorage.setItem('typeflow.data.v1', JSON.stringify(data));
      localStorage.setItem('typeflow.settings.v1', JSON.stringify(data.settings));
    }, seedHistory());

    const shoot = async (name, path, { width = 1440, height = 1000, full = false } = {}) => {
      await page.setViewport({ width, height });
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));
      const file = join(OUT, `${name}.png`);
      await page.screenshot({ path: file, fullPage: full });
      shots.push(`${name}.png`);
      console.log(`  captured ${name}.png`);
    };

    await shoot('01-homepage-desktop', '/', { full: true });
    await shoot('02-typing-test-setup', '/test');

    // Live typing test mid-run.
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Start test')?.click();
    });
    await page.waitForSelector('.tf-passage');
    const text = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.textContent).join(''));
    await typeText(page, text.slice(0, 48));
    await page.keyboard.type('x'); // one visible mistake for the screenshot
    await new Promise((r) => setTimeout(r, 500));
    await page.screenshot({ path: join(OUT, '03-typing-test-live.png') });
    shots.push('03-typing-test-live.png');
    console.log('  captured 03-typing-test-live.png');

    // Results screen: run a short word test to completion.
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
    await page.waitForSelector('.tf-passage');
    const wordText = await page.$$eval('.tf-passage .tf-ch', (els) => els.map((e) => e.textContent).join(''));
    await typeText(page, wordText.slice(0, 14), 6);
    await page.keyboard.type('q');
    await page.keyboard.press('Backspace');
    await typeText(page, wordText.slice(14), 6);
    await page.waitForFunction(() => document.body.innerText.includes('Test complete'), { timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: join(OUT, '04-results-dashboard.png'), fullPage: true });
    shots.push('04-results-dashboard.png');
    console.log('  captured 04-results-dashboard.png');

    await shoot('05-progress-dashboard', '/progress', { full: true });
    await shoot('06-lessons', '/lessons', { full: true });
    await shoot('07-coding-practice', '/code', { full: true });
    await shoot('08-settings', '/settings', { full: true });

    // Dark mode.
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'dark')?.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    await shoot('09-homepage-dark', '/', { full: true });
    await shoot('10-progress-dark', '/progress', { full: true });

    // Mobile.
    await shoot('11-mobile-homepage', '/', { width: 390, height: 844, full: true });
    await shoot('12-mobile-test', '/test', { width: 390, height: 844, full: true });
    await shoot('13-mobile-progress', '/progress', { width: 390, height: 844, full: true });
    await shoot('14-tablet-lessons', '/lessons', { width: 768, height: 1024, full: true });
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\n${shots.length} screenshots written to docs/screenshots/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
