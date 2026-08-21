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

### "Failed to load the Kakao Maps SDK" in the Toss app

This means a real key *is* in the bundle (the prebuild check would have
caught a missing one) but the `<script src="//dapi.kakao.com/...">` request
itself failed. `apps-in-toss.config.ts`'s `permissions` field only covers
clipboard/geolocation/contacts/photos/camera/microphone — there's no
domain/network allowlist to set here, so this isn't something fixable by
editing this repo. It's one of:

1. **The Kakao key's allowed domains don't include wherever Apps in Toss
   actually serves the bundle from.** Add it under Kakao Developers console →
   your app → 플랫폼 → Web. Other Apps in Toss developers have registered
   combinations of: `https://<appName>.apps.tossmini.com`,
   `https://<appName>.private-apps.tossmini.com`,
   `https://apps-in-toss.toss.im`, `https://minion.toss.im`, `https://toss.im`
   — try the console's test/deploy logs or a devtools network trace to see
   the actual origin the SDK request is failing from, and register that
   exact one (scheme included).
2. **A known, still-open issue**: other developers report this exact script
   tag failing inside the Toss WebView even with the domain registered
   (especially on iOS), possibly a CSP (`script-src`) restriction on Toss's
   side. If (1) doesn't fix it, this is likely it — check
   [Apps in Toss dev community](https://techchat-apps-in-toss.toss.im) for
   the current workaround, since it may need a fix on Toss's end rather than
   this app's.

To isolate which one you're hitting: open the same key/config in a normal
mobile browser via a plain HTTPS URL (e.g. `web/` deployed to GitHub Pages)
first — if the map loads there, the key and its domain list are fine and
the problem is specific to the Toss WebView (case 2).

## Upload & test in the Toss app

Either:
- Upload `my-midpick.ait` manually in the console ("버전 등록하기" screen), or
- `npm run deploy` (uses the token from `ait token add`)

Either way, the console then gives you a test scheme/QR code — scan it from
inside the Toss app to try the real thing before requesting review.

## Requesting real review

Once it looks right in the test build, click "검토 요청하기" in the console.
Review takes up to 3 business days.
