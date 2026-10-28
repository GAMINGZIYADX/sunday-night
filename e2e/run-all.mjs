// Runs every browser test in sequence (expects both builds to exist).
import { spawnSync } from 'node:child_process';
const tests = [
  'prod.mjs',
  'props.mjs',
  'playthrough.mjs',
  'continue.mjs',
  'collision.mjs',
  'touch.mjs',
  'quality.mjs',
  'hybrid.mjs',
  'cozy.mjs',
  'maze.mjs',
  'selfupdate.mjs',
  'attic.mjs',
  'oldphones.mjs',
  'gfxcheck.mjs',
  'gfxtest.mjs',
  'siderooms.mjs',
  'perf.mjs',
  'bake.mjs',
  'bake.mjs --phone',
];
let failed = 0;
for (const t of tests) {
  const [file, ...args] = t.split(' ');
  const r = spawnSync(process.execPath, [`e2e/${file}`, ...args], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} browser test file(s) failed` : '\nAll browser tests passed');
process.exitCode = failed ? 1 : 0;
