// Design QA: WCAG contrast and layout measurement against the real build.
//
// Screenshots cannot be eyeballed in CI, so the visual contract is asserted numerically:
// every rendered text node must clear WCAG AA against its real painted background, and
// key layout invariants (tap targets, keyboard fit, passage legibility) are measured in
// both themes at four widths.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = 4322;
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
      res.writeHead(404).end('nf');
    }
  });
  return new Promise((r) => server.listen(PORT, '127.0.0.1', () => r(server)));
}

/** Runs in the page: find every text node failing WCAG AA against its painted background. */
const CONTRAST_PROBE = () => {
  const parse = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const parts = m[1].split(',').map((v) => parseFloat(v.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  // Walk up the tree compositing backgrounds until an opaque one is found.
  const bgOf = (el) => {
    let acc = null;
    let node = el;
    while (node && node !== document.documentElement.parentElement) {
      const style = getComputedStyle(node);
      const c = parse(style.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    return acc && acc.a >= 0.999 ? acc : { r: 255, g: 255, b: 255, a: 1 };
  };

  const failing = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) {
    const text = textNode.textContent?.trim();
    if (!text) continue;
    const el = textNode.parentElement;
    if (!el) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const opacity = parseFloat(style.opacity);
    if (opacity === 0) continue;

    let fg = parse(style.color);
    if (!fg) continue;
    const bg = bgOf(el);
    // Element opacity dims the text against its own background.
    if (opacity < 1) fg = { ...fg, a: fg.a * opacity };
    const composited = over(fg, bg);

    const l1 = lum(composited);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;

    if (ratio < required - 0.005) {
      failing.push({
        text: text.slice(0, 48),
        ratio: Math.round(ratio * 100) / 100,
        required,
        color: style.color,
        size,
      });
    }
  }
  return failing;
};

async function run() {
  if (!CHROME) {
    console.error('No Chrome found. Set CHROME_PATH.');
    process.exit(2);
  }
  const server = await startServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell', args: ['--no-sandbox'] });

  const PAGES = ['/', '/test', '/lessons', '/code', '/progress', '/settings', '/help', '/about'];

  try {
    const page = await browser.newPage();

    for (const theme of ['light', 'dark']) {
      console.log(`\nContrast - ${theme} theme`);
      await page.setViewport({ width: 1440, height: 1000 });
      await page.goto(BASE, { waitUntil: 'networkidle0' });
      // The pre-paint script reads the settings mirror, but the React store hydrates from
      // the data blob - both must be set or the dark pass silently re-tests light.
      await page.evaluate((t) => {
        const settings = { version: 1, theme: t };
        localStorage.setItem('typeflow.settings.v1', JSON.stringify(settings));
        localStorage.setItem(
          'typeflow.data.v1',
          JSON.stringify({
            version: 1,
            settings,
            results: [],
            lessons: {},
            records: { byKey: {}, bestNetWpm: 0, bestAccuracy: 0 },
            achievements: {},
          }),
        );
      }, theme);

      for (const path of PAGES) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => d.setAttribute('open', 'open')));
        await new Promise((r) => setTimeout(r, 120));
        const applied = await page.evaluate(() => document.documentElement.dataset.theme);
        if (applied !== theme) {
          check(`${theme} ${path}: theme actually applied`, false, `document theme is "${applied}"`);
          continue;
        }
        const failing = await page.evaluate(CONTRAST_PROBE);
        check(
          `${theme} ${path}: all text meets WCAG AA`,
          failing.length === 0,
          failing.map((f) => `"${f.text}" ${f.ratio}:1 < ${f.required}`).slice(0, 4).join(' | '),
        );
      }
    }

    // Reset to light for layout checks.
    await page.goto(BASE, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.setItem('typeflow.settings.v1', JSON.stringify({ version: 1, theme: 'light' })));

    console.log('\nLayout invariants');
    for (const [label, width, height] of [
      ['1440px', 1440, 900],
      ['1024px', 1024, 768],
      ['768px', 768, 1024],
      ['390px', 390, 844],
    ]) {
      await page.setViewport({ width, height });
      for (const path of PAGES) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        check(`${label} ${path}: no horizontal overflow`, overflow <= 1, `${overflow}px`);
      }

      // Interactive controls must be large enough to tap.
      await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
      const small = await page.$$eval('button, a[href]', (els) =>
        els
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && r.height < 32;
          })
          .map((el) => `${el.tagName}:${el.textContent?.trim().slice(0, 20)}`),
      );
      check(`${label}: no tap target under 32px tall`, small.length === 0, small.slice(0, 3).join(', '));
    }

    // Typing surface specifics.
    console.log('\nTyping surface');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE}/test`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Start test')?.click();
    });
    await page.waitForSelector('.tf-passage');

    const passageSize = await page.$eval('.tf-passage', (el) => parseFloat(getComputedStyle(el).fontSize));
    check('passage font size is at least 16px', passageSize >= 16, `${passageSize}px`);

    const mono = await page.$eval('.tf-passage', (el) => getComputedStyle(el).fontFamily.toLowerCase());
    check('passage uses a monospace family', mono.includes('mono') || mono.includes('menlo') || mono.includes('consolas'));

    const keyboardFits = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.tf-key')];
      if (rows.length === 0) return false;
      return rows.every((k) => k.getBoundingClientRect().width > 8);
    });
    check('on-screen keyboard keys are rendered at a usable width', keyboardFits);

    // Correct/incorrect colours must be visually distinct, not just different states.
    await page.keyboard.type('x');
    await new Promise((r) => setTimeout(r, 100));
    const distinct = await page.evaluate(() => {
      const first = document.querySelector('.tf-passage .tf-ch');
      const pending = [...document.querySelectorAll('.tf-passage .tf-ch')].find((c) => c.dataset.state === 'pending');
      if (!first || !pending) return false;
      return getComputedStyle(first).color !== getComputedStyle(pending).color;
    });
    check('typed characters are coloured differently from pending text', distinct);

    // The on-screen keyboard must hide on narrow screens rather than squash.
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 250));
    const keyboardVisibleOnMobile = await page.evaluate(() => {
      const key = document.querySelector('.tf-key');
      if (!key) return false;
      return key.getBoundingClientRect().width > 0;
    });
    check('full keyboard is hidden on a 390px screen', keyboardVisibleOnMobile === false);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${passed} design checks passed, ${failures.length} failed.`);
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
