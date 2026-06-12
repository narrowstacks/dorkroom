import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/dorkroom-shots';
fs.mkdirSync(OUT, { recursive: true });

const AUDIT_PAGES = [
  ['home', '/'],
  ['border', '/border'],
  ['stops', '/stops'],
  ['lenses', '/lenses'],
  ['exposure', '/exposure'],
  ['mat', '/mat'],
  ['development', '/development'],
];
const SHOT_THEMES = ['light', 'high-contrast', 'darkroom'];
const SHOT_PAGES = [
  ['home', '/'],
  ['lenses', '/lenses'],
  ['border', '/border'],
  ['development', '/development'],
];

const browser = await chromium.launch();

async function makeCtx(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('dorkroom-theme', t);
      localStorage.setItem('dorkroom-animations-enabled', 'false');
    } catch {}
  }, theme);
  return ctx;
}

// --- 1. theme screenshots ---
for (const theme of SHOT_THEMES) {
  const ctx = await makeCtx(theme);
  const page = await ctx.newPage();
  for (const [name, path] of SHOT_PAGES) {
    await page.goto(`http://localhost:4200${path}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/t-${theme}-${name}.png` });
  }
  await ctx.close();
}

// --- 2. contrast audit (dark + light) ---
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const results = {};
for (const theme of ['dark', 'light']) {
  const ctx = await makeCtx(theme);
  const page = await ctx.newPage();
  for (const [name, path] of AUDIT_PAGES) {
    await page.goto(`http://localhost:4200${path}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1200);

    // collect visible text leaf elements
    const items = await page.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
      );
      const seen = new Set();
      let node = walker.nextNode();
      while (node) {
        const text = node.textContent.trim();
        const el = node.parentElement;
        if (text && el) {
          const cs = getComputedStyle(el);
          const r = node.parentElement.getBoundingClientRect
            ? (() => {
                const range = document.createRange();
                range.selectNodeContents(node);
                return range.getBoundingClientRect();
              })()
            : null;
          if (
            r &&
            r.width > 2 &&
            r.height > 4 &&
            cs.visibility !== 'hidden' &&
            cs.display !== 'none' &&
            parseFloat(cs.opacity) > 0.1
          ) {
            const key = text.slice(0, 40) + '|' + cs.color + '|' + cs.fontSize;
            if (!seen.has(key)) {
              seen.add(key);
              out.push({
                text: text.slice(0, 50),
                color: cs.color,
                fontSize: parseFloat(cs.fontSize),
                fontWeight: cs.fontWeight,
                x: r.x + window.scrollX,
                y: r.y + window.scrollY,
                w: r.width,
                h: r.height,
              });
            }
          }
        }
        node = walker.nextNode();
      }
      return out;
    });

    const shotPath = `${OUT}/audit-${theme}-${name}.png`;
    await page.screenshot({ path: shotPath, fullPage: true });

    // sample background pixels around each text bbox using a canvas page
    const b64 = fs.readFileSync(shotPath).toString('base64');
    const sampler = await ctx.newPage();
    await sampler.goto('about:blank');
    const sampled = await sampler.evaluate(
      async ({ b64, items }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const cx = canvas.getContext('2d');
        cx.drawImage(img, 0, 0);
        const px = (x, y) => {
          x = Math.max(0, Math.min(img.width - 1, Math.round(x)));
          y = Math.max(0, Math.min(img.height - 1, Math.round(y)));
          return Array.from(cx.getImageData(x, y, 1, 1).data.slice(0, 3));
        };
        return items.map((it) => {
          const pts = [
            px(it.x - 4, it.y + it.h / 2),
            px(it.x + it.w + 4, it.y + it.h / 2),
            px(it.x + it.w / 2, it.y - 4),
            px(it.x + it.w / 2, it.y + it.h + 4),
          ];
          return { ...it, bgSamples: pts };
        });
      },
      { b64, items }
    );
    await sampler.close();

    const parseColor = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    };
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

    const findings = [];
    for (const it of sampled) {
      const fg = parseColor(it.color);
      if (!fg) continue;
      const bgs = it.bgSamples.filter((s) => dist(s, fg) > 40);
      if (!bgs.length) continue;
      const bg = bgs
        .reduce(
          (acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2]],
          [0, 0, 0]
        )
        .map((v) => v / bgs.length);
      const r = ratio(fg, bg);
      const large =
        it.fontSize >= 24 || (it.fontSize >= 18.66 && +it.fontWeight >= 700);
      const threshold = large ? 3 : 4.5;
      if (r < threshold) {
        findings.push({
          text: it.text,
          fg: it.color,
          bgApprox: bg.map(Math.round),
          ratio: +r.toFixed(2),
          fontSize: it.fontSize,
          fontWeight: it.fontWeight,
          threshold,
        });
      }
    }
    findings.sort((a, b) => a.ratio - b.ratio);
    results[`${theme}/${name}`] = findings.slice(0, 30);
    console.log(`${theme}/${name}: ${findings.length} below threshold`);
  }
  await ctx.close();
}

fs.writeFileSync(
  `${OUT}/contrast-findings.json`,
  JSON.stringify(results, null, 2)
);
await browser.close();
console.log('audit complete');
