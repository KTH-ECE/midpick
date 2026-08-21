# MidPick — Apps in Toss packaging

Packages the existing `web/` app (unmodified) as a `.ait` bundle so it can be
tested inside the Toss app via [Apps in Toss](https://developers-apps-in-toss.toss.im/).
This folder only exists to produce that bundle — it does not duplicate or
rebuild `web/`; `apps-in-toss.config.ts` points `webBundleDir` straight at
`../web` and packs it as-is. This is the one place in the repo with its own
`package.json`/`node_modules`; it's required by the Apps in Toss CLI and is
separate from the main app's "no build step" convention.

## One-time setup (you, not this repo)

The account/registration side can't be done from here — it needs your own
Toss app login:

1. Sign up at the Apps in Toss console (needs a Toss app login under your
   real name, 19+). Create a workspace.
2. In the workspace, register a new app named **`my-midpick`** (must match
   `appName` in `apps-in-toss.config.ts`).
3. Grab an API token for deploying from the CLI: console → workspace →
   API tokens (or run `npx ait token add` and paste it when prompted).

## Build & test locally

```bash
cd apps-in-toss
npm install
npm run build      # produces my-midpick.ait in this folder
```

`web/config.js` (your real Kakao Maps key, gitignored) must exist first —
copy it from `web/config.example.js` if you haven't already, since it's
loaded by `web/index.html` and gets packed into the bundle as-is. `npm run
build` now checks this first and fails loudly if `web/config.js` is missing
or still has a placeholder key — that's what "API key" errors when testing
in the Toss app usually mean: the bundle was built without a real key baked
in, not that each user needs their own key. **One key from the Kakao
Developers console is baked into the bundle and shared by every user**, the
same way it works on a normal website — just make sure that key's allowed
domains (Kakao Developers console → your app → 플랫폼 → Web) cover wherever
Apps in Toss actually serves the bundle from.

Note: other Apps in Toss developers have reported the Kakao Maps SDK
`<script>` tag failing to load (infinite loading, especially on iOS) inside
the Toss WebView even with the domain registered — possibly a CSP
(`script-src`) restriction. If the map still doesn't load with a real key
and the right domain registered, check the
[Apps in Toss dev community](https://techchat-apps-in-toss.toss.im) for the
current workaround.

## Upload & test in the Toss app

Either:
- Upload `my-midpick.ait` manually in the console ("버전 등록하기" screen), or
- `npm run deploy` (uses the token from `ait token add`)

Either way, the console then gives you a test scheme/QR code — scan it from
inside the Toss app to try the real thing before requesting review.

## Requesting real review

Once it looks right in the test build, click "검토 요청하기" in the console.
Review takes up to 3 business days.
