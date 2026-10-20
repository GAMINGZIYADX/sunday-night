import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// __DEBUG__ is a build-time flag. It is true only for `npm run dev` and
// `npm run build:debug`. The production build (`npm run build`) sets it to
// false, so every debug shortcut is stripped out of dist/index.html.
export default defineConfig(({ command, mode }) => {
  const debug = command === 'serve' || mode === 'debug';
  return {
    base: './',
    define: { __DEBUG__: JSON.stringify(debug) },
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
