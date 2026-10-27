import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// __DEBUG__ is a build-time flag. It is true only for `npm run dev` and
// `npm run build:debug`. The production build (`npm run build`) sets it to
// false, so every debug shortcut is stripped out of dist/index.html.
// __APP_VERSION__ is package.json's version, used by the update check. It is
// also stamped into a <meta> so a downloaded update can be checked before use.
const versionMeta = {
  name: 'version-meta',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { name: 'sunday-night-version', content: pkg.version }, injectTo: 'head-prepend' }],
};

export default defineConfig(({ command, mode }) => {
  const debug = command === 'serve' || mode === 'debug';
  return {
    base: './',
    define: { __DEBUG__: JSON.stringify(debug), __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [versionMeta, viteSingleFile()],
    // Chrome 80 is the oldest browser the game supports: an Android 5 phone
    // from 2013-14 with its system WebView updated reaches it. The Android app
    // asks for that update when the WebView is older.
    build: {
      target: ['es2020', 'chrome80'],
      cssTarget: 'chrome80',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 4000,
      cssCodeSplit: false,
      reportCompressedSize: false,
    },
    test: { include: ['tests/**/*.test.js'], environment: 'node' },
  };
});
