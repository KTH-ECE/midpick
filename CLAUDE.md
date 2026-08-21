# MidPick

Web app that finds a fair midpoint between two or more people (Kakao Maps API)
and lists the places nearby. Plain JS/HTML/CSS, run with VS Code Live Server.

## Layout
- `web/` — the app: `index.html`, `app.js`, `style.css`, `config.example.js`
- `web/config.js` — Kakao JS app key (gitignored; copy from `config.example.js`)
- `apps-in-toss/` — packages `web/` as-is into a `.ait` bundle for testing
  inside the Toss app (Apps in Toss); see its README. Has its own
  `package.json` since the Apps in Toss CLI requires it — exempt from the
  "no build step" rule below.
- `docs/notes_&_results.md` — changelog / version notes
- `images/` — screenshots

## Conventions
- **Keep `docs/notes_&_results.md` current.** Whenever a feature or improvement
  is added or changed, add/edit an entry under the current version (or start a
  new version) and tick off the matching backlog item. Keep entries short —
  what changed and any caveat.
- **Bilingual UI (EN/KO).** User-facing text is switched via the `I18N`
  dictionary plus `data-i18n` / `data-i18n-ph` attributes in `app.js`. When you
  add any user-facing string, provide both `en` and `ko` and hook it up.
- **No build step, no dependencies.** Match the existing vanilla, ES5-style JS.
