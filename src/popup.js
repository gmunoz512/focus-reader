const api = globalThis.browser ?? globalThis.chrome;
const D = { globalOn: false, sites: {}, fixation: 3, saccade: 1, opacity: 100, dim: false };
const $ = (id) => document.getElementById(id);
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
if (isIOS) $('sc').textContent = 'Open this panel any time from the puzzle-piece / “Aa” menu in the address bar.';
(async () => {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  let host = null;
  if (!host && tab) { try { host = (await api.tabs.sendMessage(tab.id, { type: 'fr-host' }))?.host || null; } catch {} }
  if (!host && tab && tab.url) { try { const u = new URL(tab.url); if (/^https?:|^file:/.test(u.protocol)) host = u.hostname || 'file'; } catch {} }
  const s = await api.storage.sync.get(D);
  const siteOn = () => (host in s.sites ? s.sites[host] : s.globalOn);
  const paint = () => { $('site').checked = !!host && siteOn(); $('state').textContent = $('site').checked ? 'On' : 'Off'; };
  $('host').textContent = host ? 'on ' + host : 'Not available on this page';
  $('site').disabled = !host; $('global').checked = s.globalOn; paint();
  $('site').onchange = () => { s.sites[host] = $('site').checked; paint(); api.storage.sync.set({ sites: s.sites }); };
  $('global').onchange = () => { s.globalOn = $('global').checked; if (host) delete s.sites[host]; paint(); api.storage.sync.set({ globalOn: s.globalOn, sites: s.sites }); };
  const lbl = { fixation: (v) => v + '/5', saccade: (v) => (v == 1 ? 'every word' : 'every ' + v), opacity: (v) => v + '%' };
  for (const k of ['fixation', 'saccade', 'opacity']) {
    const el = $(k), out = $(k[0] + 'v'); el.value = s[k]; out.textContent = lbl[k](s[k]);
    el.oninput = () => { out.textContent = lbl[k](el.value); };
    el.onchange = () => api.storage.sync.set({ [k]: +el.value });
  }
  $('dim').checked = s.dim; $('dim').onchange = () => api.storage.sync.set({ dim: $('dim').checked });
})();
