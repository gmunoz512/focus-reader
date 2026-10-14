(() => {
  if (window.__focusReader) return; window.__focusReader = true;
  const api = globalThis.browser ?? globalThis.chrome;
  const D = { globalOn: false, sites: {}, fixation: 3, saccade: 1, opacity: 100, dim: false };
  const host = location.hostname || 'file';
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','SELECT','OPTION','CODE','PRE','KBD','SAMP','SVG','MATH','CANVAS','IFRAME','TEMPLATE','HEAD','TITLE','BUTTON']);
  const WORD = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;
  const URLISH = /\b(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/gi;
  let on = false, fixation = 3, saccade = 1, cfgKey = '', observer = null, queue = new Set(), scheduled = false;
  const wrappers = new Set(); // span.fr-w elements we inserted

  // Fixation level 1..5 -> share of letters bolded. Words are bucketed short/medium/long
  // (short words always keep >=1 bold letter and >=1 plain letter when possible).
  const RATIO = [0, 0.25, 0.35, 0.45, 0.6, 0.75];
  function boldLen(w) {
    const n = [...w].length, r = RATIO[fixation] || 0.45;
    if (n <= 1) return 1;
    if (n <= 3) return fixation >= 4 ? 2 : 1;          // short
    const k = n <= 7 ? Math.round(n * r) : Math.ceil(n * r); // medium / long
    return Math.max(1, Math.min(n - 1, k));
  }
  function skipEl(el) {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (SKIP.has(e.tagName.toUpperCase()) || e.isContentEditable || (e.classList && e.classList.contains('fr-w'))) return true;
    }
    return false;
  }
  function transform(node) {
    const text = node.nodeValue;
    if (!text || !/[\p{L}]/u.test(text) || !node.parentElement || skipEl(node.parentElement)) return;
    const skipRanges = []; let m; URLISH.lastIndex = 0;
    while ((m = URLISH.exec(text))) skipRanges.push([m.index, m.index + m[0].length]);
    const frag = document.createDocumentFragment(); let last = 0, changed = false, wordIdx = 0; WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      const i = m.index;
      if (skipRanges.some(([a, b]) => i >= a && i < b)) continue;
      // skip words glued to digits (e.g. 3rd, A4)
      if (/\d/.test(text[i - 1] || '') || /\d/.test(text[i + m[0].length] || '')) continue;
      if ((wordIdx++ % saccade) !== 0) continue;
      const chars = [...m[0]]; const k = boldLen(m[0]);
      if (i > last) frag.append(text.slice(last, i));
      const b = document.createElement('b'); b.className = 'fr-b'; b.textContent = chars.slice(0, k).join('');
      frag.append(b);
      const rest = chars.slice(k).join('');
      if (rest) { const r = document.createElement('span'); r.className = 'fr-r'; r.textContent = rest; frag.append(r); }
      last = i + m[0].length; changed = true;
    }
    if (!changed) return;
    if (last < text.length) frag.append(text.slice(last));
    const w = document.createElement('span'); w.className = 'fr-w'; w.dataset.frOrig = text; w.append(frag);
    node.parentNode.replaceChild(w, node); wrappers.add(w);
  }
  function collect(root) {
    if (root.nodeType === 3) { queue.add(root); return; }
    if (root.nodeType !== 1 || skipEl(root)) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => n.nodeType === 1
        ? (SKIP.has(n.tagName.toUpperCase()) || n.isContentEditable || n.classList.contains('fr-w') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP)
        : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = tw.nextNode())) queue.add(n);
  }
  const idle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 8 }), 1));
  function schedule() { if (scheduled) return; scheduled = true; idle(work, { timeout: 500 }); }
  function work(dl) {
    scheduled = false; if (!on) { queue.clear(); return; }
    pause();
    const it = queue.values(); let n, c = 0;
    while (!(n = it.next()).done) {
      queue.delete(n.value);
      if (n.value.isConnected) transform(n.value);
      if (++c % 50 === 0 && dl.timeRemaining() < 2) break;
    }
    resume();
    if (queue.size) schedule();
  }
  let mtimer = null, pending = [];
  function onMut(muts) {
    for (const m of muts) {
      if (m.type === 'characterData') pending.push(m.target);
      else m.addedNodes.forEach((n) => pending.push(n));
    }
    clearTimeout(mtimer);
    mtimer = setTimeout(() => { const p = pending; pending = []; p.forEach((n) => n.isConnected && collect(n)); schedule(); }, 200);
  }
  function pause() { if (observer) observer.disconnect(); }
  function resume() { if (on && observer && document.body) observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  function enable() {
    if (on) return; on = true;
    observer = observer || new MutationObserver(onMut);
    collect(document.body); schedule(); resume();
  }
  function restoreAll() {
    document.querySelectorAll('span.fr-w').forEach((w) => wrappers.add(w));
    for (const w of wrappers) if (w.isConnected) w.replaceWith(document.createTextNode(w.dataset.frOrig));
    wrappers.clear();
  }
  function disable() { on = false; pause(); queue.clear(); pending = []; clearTimeout(mtimer); restoreAll(); }
  function apply(s) {
    const want = host in s.sites ? s.sites[host] : s.globalOn;
    document.documentElement.classList.toggle('fr-dim', !!s.dim);
    document.documentElement.style.setProperty('--fr-op', String((s.opacity || 100) / 100));
    const key = s.fixation + '/' + s.saccade;
    if (key !== cfgKey) { cfgKey = key; fixation = +s.fixation; saccade = Math.max(1, +s.saccade); if (on) disable(); }
    want ? enable() : disable();
    try { api.runtime.sendMessage({ type: 'fr-state', on: !!want }); } catch (e) {}
  }
  api.storage.sync.get(D).then(apply);
  api.storage.onChanged.addListener((_c, area) => { if (area === 'sync') api.storage.sync.get(D).then(apply); });
  // Popup asks for the hostname (Safari may hide tab.url until the user grants the site).
  api.runtime.onMessage.addListener((msg, _s, reply) => { if (msg && msg.type === 'fr-host') { reply({ host, on }); } });
  window.__focusReaderDebug = { enable, disable };
})();
