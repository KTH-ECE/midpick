// Guards against silently packaging a .ait with no working Kakao Maps key.
// `ait build` packs web/ as-is; if web/config.js is missing (it's gitignored)
// or still has the placeholder key, the bundle loads fine but shows
// "config.js is missing or the app key is not set" for every user who opens it.
import { existsSync, readFileSync } from 'node:fs';

const configPath = new URL('../web/config.js', import.meta.url);

if (!existsSync(configPath)) {
  console.error(
    '\nweb/config.js not found.\n' +
    'Copy web/config.example.js to web/config.js and set your real Kakao ' +
    'JavaScript app key before building the .ait bundle.\n'
  );
  process.exit(1);
}

const contents = readFileSync(configPath, 'utf8');
if (contents.indexOf('YOUR_JAVASCRIPT_APP_KEY_HERE') !== -1 || contents.indexOf('(API KEY)') !== -1) {
  console.error(
    '\nweb/config.js still has a placeholder Kakao app key.\n' +
    'Set your real Kakao JavaScript app key before building the .ait bundle.\n'
  );
  process.exit(1);
}
