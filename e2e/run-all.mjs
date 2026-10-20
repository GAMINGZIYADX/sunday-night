// Runs every browser test in sequence (expects both builds to exist).
import { spawnSync } from 'node:child_process';
const tests = ['prod.mjs', 'playthrough.mjs', 'continue.mjs', 'collision.mjs'];
let failed = 0;
for (const t of tests) {
  const r = spawnSync(process.execPath, [`e2e/${t}`], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} browser test file(s) failed` : '\nAll browser tests passed');
process.exitCode = failed ? 1 : 0;
