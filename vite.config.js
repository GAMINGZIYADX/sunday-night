import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// __DEBUG__ is a build-time flag. It is true only for `npm run dev` and
// `npm run build:debug`. The production build (`npm run build`) sets it to
// false, so every debug shortcut is stripped out of dist/index.html.
// __APP_VERSION__ is package.json's version, used by the update check.
export default defineConfig(({ command, mode }) => {
  const debug = command === 'serve' || mode === 'debug';
  return {
    base: './',
    define: { __DEBUG__: JSON.stringify(debug), __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [viteSingleFile()],
    build: {
      target: 'es2020',
      assetsInlineLimit: 100000000,
      chunkSizeWarningLimit: 4000,
      cssCodeSplit: false,
      reportCompressedSize: false,
    },
    test: { include: ['tests/**/*.test.js'], environment: 'node' },
  };
});
