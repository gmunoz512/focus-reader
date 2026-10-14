// Shared by Chrome/Edge/Brave and Safari (macOS + iOS).
const api = globalThis.browser ?? globalThis.chrome;
const action = api.action ?? api.browserAction;
const ICON = (off) => Object.fromEntries([16, 32, 48, 128].map((s) => [s, `icons/icon${s}${off ? '-off' : ''}.png`]));

function show(tabId, on) {
  try {
    action.setBadgeText({ tabId, text: on ? 'ON' : '' });
    action.setBadgeBackgroundColor && action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
    action.setIcon({ tabId, path: ICON(!on) });
  } catch (e) {}
}
// Content script reports its state for each tab.
api.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === 'fr-state' && sender.tab) show(sender.tab.id, msg.on);
});

// Keyboard shortcut (desktop only; iOS has no commands API).
if (api.commands && api.commands.onCommand) {
  api.commands.onCommand.addListener(async (cmd) => {
    if (cmd !== 'toggle-focus') return;
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    let host = null;
    try { host = (await api.tabs.sendMessage(tab.id, { type: 'fr-host' }))?.host; } catch {}
    if (!host) { try { host = new URL(tab.url).hostname; } catch {} }
    if (!host) return;
    const s = await api.storage.sync.get({ globalOn: false, sites: {} });
    s.sites[host] = !(host in s.sites ? s.sites[host] : s.globalOn);
    await api.storage.sync.set({ sites: s.sites });
  });
}
