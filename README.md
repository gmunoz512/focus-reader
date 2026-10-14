# EMPsize

A Chrome / Edge / Brave extension (Manifest V3) that bolds the start of each word so your eye lands on word beginnings. This is an independent implementation. It is not affiliated with Bionic Reading® and does not use its API. Everything runs locally: no network calls and no remote code.

## Install
1. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Turn on **Developer mode**.
3. Run `./build.sh`, then click **Load unpacked** and pick the generated `chrome/` folder.
4. Pin the extension, then click its icon.

## Layout
- `src/`: the single source. Run `./build.sh` to produce `chrome/`, `safari/extension/` and the zips.
- Safari (iPhone/Mac) steps: `safari/README.md`.

## Popup
A big ON/OFF switch for the current site, plus an "All sites" switch. Advanced settings are under **More**. The toolbar icon shows an ON badge when it's active and is greyed out when it's off.

## Advanced settings
- **On for this site** / **On by default (all sites)**. A setting for one site overrides the default.
- **Fixation 1–5**: how much of each word is bold (about 25/35/45/60/75% of letters; default 3). Short words (1–3 letters) get 1 bold letter, or 2 at levels 4–5.
- **Saccade 1–5**: bold every word (default) or every 2nd–5th word.
- **Bold opacity 80–100%** (default 100).
- **Dim the rest**: fades the non-bold part of each word.
- **Shortcut:** Alt+B toggles the current site. You can change it at `chrome://extensions/shortcuts`.

## Notes and limitations
- Skips code, pre, inputs, textareas, contenteditable, svg, buttons and script/style. Skips URLs, emails, and words attached to digits.
- Turning it off restores the original text nodes exactly.
- Doesn't work on PDFs in the built-in viewer, the Chrome Web Store, `chrome://` pages, or inside iframes (top frame only). Canvas-rendered text (e.g. Google Docs) is unaffected.
- To test: run `./build.sh`, `npm i -D playwright && npx playwright install chromium`, then `node test/verify.js` (and `node test/linkedin.js`).

## TestFlight (iOS) through GitHub Actions
`.github/workflows/testflight.yml` builds on a macOS runner and uploads to TestFlight. It needs these repo secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (the .p8 file contents) and `APPLE_TEAM_ID`. Optional repo variables: `BUNDLE_ID` (default `com.gmunoz.focusreader`), `MARKETING_VERSION` (default 1.0.0), and `TESTFLIGHT_ENABLED=true` to build on every push to main. Without that variable, you start it by hand from the Actions tab.
