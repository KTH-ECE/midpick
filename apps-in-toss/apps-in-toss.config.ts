import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // Must match the app name registered in the Apps in Toss console.
  appName: 'my-midpick',
  brand: {
    primaryColor: '#4361EE', // matches --accent in web/style.css
  },
  permissions: [
    { name: 'geolocation', access: 'access' }, // needed for the "Use my location" button
  ],
  // MidPick has no build step, so the existing static site is packed as-is.
  webBundleDir: '../web',
});
