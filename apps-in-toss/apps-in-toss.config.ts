import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // Must match the app name registered in the Apps in Toss console.
  appName: 'midpick',
  brand: {
    primaryColor: '#4361EE', // matches --accent in web/style.css
  },
  permissions: [],
  // MidPick has no build step, so the existing static site is packed as-is.
  webBundleDir: '../web',
});
