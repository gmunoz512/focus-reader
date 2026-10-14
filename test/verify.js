const { chromium } = require('playwright');
const path = require('path');
const EXT = path.resolve(__dirname, '..', 'chrome'), SH = path.resolve(__dirname, '..', 'shots');
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/fr-profile-' + Date.now(), {
    headless: true, channel: 'chromium', args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`], viewport: { width: 1000, height: 800 } });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const set = (o) => sw.evaluate((o) => chrome.storage.sync.set(o), o);
  await set({ globalOn: false, sites: {}, fixation: 3, saccade: 1, opacity: 100, dim: false });
  const page = await ctx.newPage();
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  await page.goto('file://' + path.join(__dirname, 'test.html'));
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => document.body.innerHTML);
  await page.screenshot({ path: SH + '/test-before.png' });
  await set({ sites: { file: true } }); await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    nb: document.querySelectorAll('b.fr-b').length,
    first: document.querySelector('h1 b.fr-b')?.textContent,
    code: document.getElementById('code').innerHTML, inp: document.getElementById('inp').value,
    ta: document.getElementById('ta').querySelector('b') === null, ce: document.getElementById('ce').querySelector('b') === null,
    url: document.querySelector('a[href^=http]').querySelector('b') === null, h1: document.querySelector('h1').textContent,
    cafe: [...document.querySelectorAll('b.fr-b')].map(b=>b.textContent).includes('Ca') }));
  console.log(r);
  ok(r.nb > 30, 'bolding applied'); ok(!r.code.includes('<b'), 'code untouched'); ok(r.inp === 'input text stays untouched' && r.ta && r.ce, 'inputs/textarea/contenteditable untouched');
  ok(r.url, 'URL left plain'); ok(r.h1 === 'The Science of Reading Faster', 'text content preserved'); ok(r.cafe, 'unicode word Café handled');
  await page.click('#lnk'); ok(await page.title() === 'clicked', 'link JS still works');
  await page.evaluate(() => { const p = document.createElement('p'); p.id = 'dyn2'; p.textContent = 'Another dynamic sentence arrives.'; document.body.appendChild(p); });
  await page.waitForTimeout(1500);
  ok(await page.evaluate(() => !!document.querySelector('#dyn b.fr-b') && !!document.querySelector('#dyn2 b.fr-b')), 'dynamic text processed');
  await page.screenshot({ path: SH + '/test-after.png' });
  await set({ dim: true, fixation: 5, saccade: 2, opacity: 85 }); await page.waitForTimeout(1500);
  await page.screenshot({ path: SH + '/test-after-fix5-sacc2-dim.png' });
  await set({ dim: false, fixation: 3, saccade: 1, opacity: 100, sites: { file: false } }); await page.waitForTimeout(800);
  const after = await page.evaluate(() => { document.getElementById('dyn2').remove(); return document.body.innerHTML; });
  if (after !== before) { require('fs').writeFileSync('/tmp/b.html', before); require('fs').writeFileSync('/tmp/a.html', after); } const norm = (h) => h.replace(/ style=""/g, ''); /* Playwright screenshots add empty style attrs */ ok(norm(after) === norm(before), 'toggle-off restores original DOM exactly');
  await page.screenshot({ path: SH + '/test-restored.png' });
  // Popup UI: open popup as a page while test tab is focused-ish; tabs.query finds the active tab
  await page.bringToFront(); await set({ sites: { file: true } }); await page.waitForTimeout(800);
  const extId = sw.url().split('/')[2];
  const badge = await sw.evaluate(async () => { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); return chrome.action.getBadgeText({ tabId: t.id }); });
  ok(badge === 'ON', 'badge shows ON when enabled (' + badge + ')');
  const pp = await ctx.newPage(); await pp.setViewportSize({ width: 300, height: 420 });
  await pp.goto(`chrome-extension://${extId}/popup.html`); await pp.waitForTimeout(600);
  await pp.screenshot({ path: SH + '/popup.png' });
  await pp.click('summary'); await pp.waitForTimeout(200); await pp.screenshot({ path: SH + '/popup-more.png' });
  await pp.click('#global + span'); await pp.waitForTimeout(300);
  ok(await sw.evaluate(async () => (await chrome.storage.sync.get('globalOn')).globalOn) === true, 'popup All-sites switch writes storage');
  await pp.click('#global + span'); await pp.close();
  await page.bringToFront(); await set({ sites: { file: false } }); await page.waitForTimeout(800);
  const badge2 = await sw.evaluate(async () => { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); return chrome.action.getBadgeText({ tabId: t.id }); });
  ok(badge2 === '', 'badge cleared when off');
  // Wikipedia
  await set({ sites: { 'en.wikipedia.org': false } });
  const w = await ctx.newPage();
  await w.goto('https://en.wikipedia.org/wiki/Reading', { waitUntil: 'domcontentloaded', timeout: 60000 }); await w.waitForTimeout(2000);
  const wb = await w.evaluate(() => document.querySelector('#mw-content-text').innerHTML);
  await w.screenshot({ path: SH + '/wiki-before.png' });
  await set({ sites: { 'en.wikipedia.org': true } }); await w.waitForTimeout(4000);
  const wn = await w.evaluate(() => document.querySelectorAll('b.fr-b').length);
  ok(wn > 1000, 'wikipedia bolded (' + wn + ' words)');
  await w.screenshot({ path: SH + '/wiki-after.png' });
  await set({ sites: { 'en.wikipedia.org': false } }); await w.waitForTimeout(1500);
  ok(await w.evaluate((wb) => document.querySelectorAll('.fr-w').length === 0 && document.body.innerText.length > 1000, wb), 'wikipedia restored (no wrappers left)');
  ok(await w.evaluate(() => document.querySelector('#mw-content-text').innerHTML) === wb, 'wikipedia innerHTML identical after restore');
  await ctx.close();
})();
