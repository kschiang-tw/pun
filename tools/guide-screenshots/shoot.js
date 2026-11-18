// Regenerates guide/*.jpg for guide.html: renders the real app in headless
// Chromium against an in-memory Firebase stub with fictional demo data, and
// outlines the button each step talks about.
//
//   cd tools/guide-screenshots && npm install && npx playwright install chromium
//   npm run shoot
//
// No network needed: the app's CDN scripts are served from node_modules and
// repo files straight from disk.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../..');
const OUT = path.join(REPO, 'guide');
const ORIGIN = 'http://pun.local/';
// package "exports" hide the UMD builds from require.resolve, so go via package.json
const pkgFile = (pkg, file) => path.join(path.dirname(require.resolve(pkg + '/package.json')), file);
const CDN = {
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js': pkgFile('react', 'umd/react.production.min.js'),
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js': pkgFile('react-dom', 'umd/react-dom.production.min.js'),
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js': pkgFile('@babel/standalone', 'babel.min.js'),
};
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.jsx': 'text/plain',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

// ── Fictional demo data ─────────────────────────────────────────────────────
const members = [
  { id: 'an',  name: '小安', initial: '安', tint: 'sage' },
  { id: 'jie', name: '阿傑', initial: '傑', tint: 'clay' },
  { id: 'mei', name: '小美', initial: '美', tint: 'rose' },
];
const exp = (id, title, cat, paidBy, amount, ccy, date, mode = 'equal', splitData = {}) =>
  ({ id, title, cat, paidBy, amount, ccy, date, mode, splitData, note: '', createdAt: 1 });
const base = {
  ownerId: 'demo-user', collaborators: [], shareCode: null, loans: [], settlements: [],
  rateMode: 'manual', ratesUpdatedAt: Date.now() - 5 * 60000, liveRatesFetchedAt: null,
};
const SEED = [
  { ...base, id: 'kyoto', title: '京都五日遊', subtitle: '', startDate: '2026-11-04', endDate: '2026-11-08', cover: 2,
    baseCurrency: 'TWD', currencies: ['JPY', 'TWD'], rates: { TWD: 1, JPY: 0.2132 }, members,
    expenses: [
      exp('e5', '錦市場小吃', 'food', 'an', 5400, 'JPY', '2026-11-07', 'shares', { shares: { an: 2, jie: 1, mei: 1 } }),
      exp('e4', '嵐山小火車', 'transit', 'mei', 2640, 'JPY', '2026-11-06'),
      exp('e3', '一蘭拉麵', 'food', 'an', 3960, 'JPY', '2026-11-05'),
      exp('e2', '機場接送', 'transit', 'mei', 2400, 'TWD', '2026-11-04'),
      exp('e1', '町家民宿 4 晚', 'lodging', 'jie', 96000, 'JPY', '2026-11-04'),
    ] },
  { ...base, id: 'tainan', title: '台南小旅行', subtitle: '', startDate: '2026-02-14', endDate: '2026-02-15', cover: 0,
    baseCurrency: 'TWD', currencies: ['TWD'], rates: { TWD: 1 }, members,
    expenses: [exp('t1', '牛肉湯早餐', 'food', 'an', 600, 'TWD', '2026-02-14')],
    settlements: [
      { id: 's1', from: 'jie', to: 'an', amount: 200, ccy: 'TWD', date: '2026-02-16', note: '', batch: 1771200000000 },
      { id: 's2', from: 'mei', to: 'an', amount: 200, ccy: 'TWD', date: '2026-02-16', note: '', batch: 1771200000000 },
    ],
    settledAt: 1771200000000, settledBy: '小安' },
];

const MARK_CSS = `[data-guide-mark]{outline:3px solid #e0763c!important;outline-offset:3px!important;
  box-shadow:0 0 0 9px rgba(224,118,60,.22)!important;position:relative;z-index:1}`;

async function newPage(browser, init, arg) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    serviceWorkers: 'block', locale: 'zh-TW' });
  await ctx.addInitScript(init, arg);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('  pageerror:', e.message));
  page.on('dialog', d => d.accept());
  await page.route('**/*', route => {
    const url = route.request().url();
    if (CDN[url]) return route.fulfill({ path: CDN[url], contentType: 'application/javascript' });
    if (url.includes('firebase-app-compat')) return route.fulfill({ path: path.join(__dirname, 'firebase-stub.js'), contentType: 'application/javascript' });
    if (url.includes('firebasejs')) return route.fulfill({ body: '', contentType: 'application/javascript' });
    if (url.startsWith(ORIGIN)) {
      const rel = decodeURIComponent(new URL(url).pathname).replace(/^\//, '') || 'index.html';
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ path: file, contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
    }
    return route.abort();   // Google sign-in script, live-rate API, …
  });
  return page;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const shots = [];

  const shot = async (page, name) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 78 });
    await page.evaluate(() => document.querySelectorAll('[data-guide-mark]').forEach(e => e.removeAttribute('data-guide-mark')));
    shots.push(name);
  };
  const mark = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    await locator.evaluate((el, css) => {
      if (!document.getElementById('guide-mark-css')) {
        const st = document.createElement('style'); st.id = 'guide-mark-css'; st.textContent = css;
        document.head.appendChild(st);
      }
      el.setAttribute('data-guide-mark', '');
    }, MARK_CSS);
  };

  // ── 01 login (signed out) ──
  {
    const page = await newPage(browser, () => { window.__PUN_NO_USER = true; });
    await page.goto(ORIGIN + 'index.html');
    await page.getByText('寄出登入連結').waitFor({ timeout: 30000 });
    await mark(page.getByRole('button', { name: '使用 Google 登入' }));
    await shot(page, '01-login');
    await page.context().close();
  }

  // ── Signed in with demo trips ──
  const p = await newPage(browser, (seed) => { window.__PUN_SEED = seed; }, SEED);
  const back = () => p.locator('button').first().click();
  await p.goto(ORIGIN + 'index.html');
  await p.getByText('京都五日遊').first().waitFor({ timeout: 30000 });
  await p.waitForTimeout(1200);

  // 03 create trip (form only, not saved)
  await p.locator('button').filter({ has: p.locator('svg') }).nth(3).click();   // header ＋
  await p.getByText('新旅程').waitFor();
  await p.getByPlaceholder('例如：京都賞楓').fill('京都五日遊');
  await p.locator('input[type=date]').nth(0).fill('2026-11-04');
  await p.locator('input[type=date]').nth(1).fill('2026-11-08');
  const names = p.locator('input[placeholder="你"], input[placeholder="成員姓名"]');
  await names.nth(0).fill('小安');
  await names.nth(1).fill('阿傑');
  await p.getByText('+ 加入成員').click();
  await p.locator('input[placeholder="成員姓名"]').nth(1).fill('小美');
  await mark(p.getByRole('button', { name: '建立' }));
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, '03-create');
  await p.getByRole('button', { name: '取消' }).click();
  await p.getByText('京都五日遊').first().waitFor();

  // 05 join by code
  await p.locator('button[title="加入旅程"]').click();
  await p.getByPlaceholder('例：AB1C2D').fill('K7Q2MX');
  await mark(p.locator('button:not([title])', { hasText: /^加入旅程$/ }));
  await shot(p, '05-join');
  await p.mouse.click(195, 120);   // tap the backdrop to close

  // 06 members: claim yourself
  await p.getByText('京都五日遊').first().click();
  await p.getByText('你的餘額').waitFor();
  await p.getByRole('button', { name: '成員' }).click();
  await p.getByText('3 人').waitFor();
  await mark(p.getByRole('button', { name: '這是我' }).first());
  await shot(p, '06-members');
  await p.getByRole('button', { name: '這是我' }).first().click();   // 小安 = me from here on
  await back(); await p.getByText('你的餘額').waitFor();

  // 04 invite
  await p.locator('button').nth(1).click();   // ⋯
  await p.getByText('邀請旅伴').first().click();
  await p.getByRole('button', { name: '分享連結…' }).waitFor();
  await mark(p.getByRole('button', { name: '分享連結…' }));
  await shot(p, '04-invite');
  await p.mouse.click(195, 120);

  // 07 rates
  await p.getByRole('button', { name: '匯率' }).first().click();
  await p.getByText('1 TWD 換算').waitFor();
  await mark(p.getByRole('button', { name: /即時匯率/ }));
  await shot(p, '07-rates');
  await back(); await p.getByText('你的餘額').waitFor();

  // 08 add expense (form only, not saved)
  await p.locator('button').filter({ has: p.locator('svg') }).last().click();   // FAB ＋
  await p.getByPlaceholder('例如：晚餐、地鐵票').fill('伏見稻荷 午餐');
  await p.locator('input[inputmode="decimal"]').first().fill('4500');
  await p.locator('input[type=date]').first().fill('2026-11-06');
  await mark(p.getByRole('button', { name: '儲存' }));
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, '08-add');
  await p.getByRole('button', { name: '取消' }).click();
  await p.getByText('你的餘額').waitFor();

  // 09 trip page
  await mark(p.locator('.card.glass-thick').first());
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, '09-trip');

  // 02 home: active trip on top, settled trip below
  await back();
  await p.getByText(/已結清 · 1/).waitFor();
  await mark(p.locator('button', { hasText: '台南小旅行' }));
  await shot(p, '02-home');

  // 10 settle → 11 settled
  await p.getByText('京都五日遊').first().click();
  await p.getByRole('button', { name: '結算 →' }).click();
  await p.getByRole('button', { name: '結清這趟旅程' }).waitFor();
  await mark(p.getByRole('button', { name: '結清這趟旅程' }));
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p, '10-settle');
  await p.getByRole('button', { name: '結清這趟旅程' }).click();
  await p.getByText('旅程已結清').waitFor();
  await shot(p, '11-settled');

  // 12 export
  await back(); await p.getByText('你的餘額').waitFor();
  await p.getByRole('button', { name: '匯出' }).click();
  await p.getByText('匯出明細').waitFor();
  await mark(p.locator('button', { hasText: '個人帳單 PDF' }));
  await shot(p, '12-export');

  await browser.close();
  console.log('wrote', shots.length, 'screenshots to guide/:', shots.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
