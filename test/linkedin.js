const { chromium } = require('playwright'); const path = require('path');
const EXT = path.resolve(__dirname, '..', 'chrome'), SH = path.resolve(__dirname, '..', 'shots');
(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/fr-li-' + Date.now(), { headless: true, channel: 'chromium',
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`], viewport: { width: 1100, height: 900 } });
  let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const set = (o) => sw.evaluate((o) => chrome.storage.sync.set(o), o);
  await set({ globalOn: false, sites: { 'www.linkedin.com': true }, fixation: 3, saccade: 1, opacity: 100, dim: false });
  const p = await ctx.newPage();
  await p.goto('https://www.linkedin.com/top-content/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000);
  console.log('url', p.url(), 'title', await p.title());
  const n1 = await p.evaluate(() => document.querySelectorAll('b.fr-b').length); console.log('bolded initial', n1);
  await p.screenshot({ path: SH + '/linkedin-after.png' });
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 3000); await p.waitForTimeout(1200); }
  const r = await p.evaluate(() => { const ws=[...document.querySelectorAll('p,span,h2,h3,a')].filter(e=>e.childNodes.length && [...e.childNodes].some(n=>n.nodeType===3&&/\p{L}{4}/u.test(n.nodeValue)) && !e.closest('.fr-w,script,style,code,pre,textarea,button')); return { bolded: document.querySelectorAll('b.fr-b').length, unprocessed: ws.length, sample: ws.slice(0,3).map(e=>e.outerHTML.slice(0,120)) }; });
  console.log('after scroll', r);
  await p.goto('https://www.linkedin.com/top-content/career/mentorship-coaching/how-to-find-the-right-mentor-for-your-career/',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(4000); console.log('topic bolded', await p.evaluate(()=>document.querySelectorAll('b.fr-b').length)); for (let i=0;i<5;i++){await p.mouse.wheel(0,3000); await p.waitForTimeout(1200);} console.log('topic after scroll', await p.evaluate(()=>document.querySelectorAll('b.fr-b').length)); await p.screenshot({path: SH + '/linkedin-topic-after.png'}); const art = 'https://www.linkedin.com/posts/ericnitzberg_ive-been-thinking-about-mentors-recently-activity-7381713917921726464-h5V1'; const pp = await ctx.newPage(); await pp.goto('chrome-extension://' + sw.url().split('/')[2] + '/popup.html'); await pp.waitForTimeout(800); console.log('popup', await pp.evaluate(()=>document.body.innerText.replace(/\n/g,' | '))); await pp.close();
  console.log('pulse', art);
  if (art) { await p.goto(art, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000);
    console.log('pulse url', p.url(), 'bolded', await p.evaluate(() => document.querySelectorAll('b.fr-b').length));
    await p.screenshot({ path: SH + '/linkedin-pulse-after.png' });
    await set({ sites: { 'www.linkedin.com': false } }); await p.waitForTimeout(1500);
    console.log('wrappers after off', await p.evaluate(() => document.querySelectorAll('.fr-w').length)); }
  await ctx.close();
})();
