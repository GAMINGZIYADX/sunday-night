// Publishes a new version that players' copies will find with the update check.
//
//   npm run release -- patch "Fixed the kettle"     1.0.0 -> 1.0.1
//   npm run release -- minor "A new room"           1.0.0 -> 1.1.0
//   npm run release -- 2.0.0                        an exact version
//
// Steps: bump package.json, run the unit tests, build dist/index.html, commit,
// tag vX.Y.Z, push main and the tag, then create the GitHub release with the
// game file attached. Anything failing stops it before the push. Last, build
// the Windows desktop app (its installer and latest.yml) and the Android app
// (the APK), and attach them.
// The game file's self-update needs nothing extra: it downloads the tag's
// dist/index.html, which the release commit contains.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [bump, ...words] = process.argv.slice(2);
// npm on Windows can split quoted notes into words, so join them back up.
const notes = words.join(' ');
const fail = (msg) => {
  console.error(`release: ${msg}`);
  process.exit(1);
};
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
// npm is a .cmd script on Windows, which Node only starts through a shell.
const npm = (...args) => run('npm', args, { shell: process.platform === 'win32' });

if (!/^(patch|minor|major|\d+\.\d+\.\d+)$/.test(bump || '')) fail('say how to bump: patch, minor, major or an exact version like 1.4.0');
if (out('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') fail('switch to main first (git switch main)');
// Untracked files are fine: only committed files can end up in the build.
if (out('git', ['status', '--porcelain', '--untracked-files=no'])) fail('commit or stash your changes first; the release must match what is in git');
try {
  out('gh', ['auth', 'status']);
} catch {
  fail('the GitHub CLI is not signed in (run: gh auth login)');
}

npm('version', bump, '--no-git-tag-version');
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tag = `v${version}`;
console.log(`\nReleasing ${tag}\n`);

try {
  npm('test');
  npm('run', 'build');
} catch {
  run('git', ['checkout', '--', 'package.json', 'package-lock.json']);
  fail('tests or build failed, so nothing was released (version bump undone)');
}

run('git', ['add', 'package.json', 'package-lock.json', 'dist/index.html']);
run('git', ['commit', '-m', `Release ${tag}`]);
run('git', ['tag', '-a', tag, '-m', `Sunday Night ${tag}`]);
run('git', ['push', 'origin', 'main', tag]);

// Attach the game under a friendly name rather than "index.html".
const asset = path.join(mkdtempSync(path.join(tmpdir(), 'sunday-night-')), `Sunday-Night-${tag}.html`);
copyFileSync('dist/index.html', asset);
const ghArgs = ['release', 'create', tag, asset, '--title', `Sunday Night ${tag}`];
run('gh', notes ? [...ghArgs, '--notes', notes] : [...ghArgs, '--generate-notes']);
console.log(`\nThe game file is released. Copies from 1.2.0 on update themselves with "Update now".`);

// The Windows desktop app: build the installer and attach it with latest.yml,
// which installed apps read to find the update.
const appFiles = [`dist-app/Sunday-Night-Setup-${version}.exe`, `dist-app/Sunday-Night-Setup-${version}.exe.blockmap`, 'dist-app/latest.yml'];
try {
  run(process.execPath, ['node_modules/electron-builder/cli.js', '--win', '--publish', 'never']);
  run('gh', ['release', 'upload', tag, ...appFiles, '--clobber']);
  console.log(`\nThe desktop app updates itself to ${version} the next time it opens.`);
} catch {
  fail(
    `the game file is released, but the desktop app is not. Try again with:\n` +
      `  npx electron-builder --win --publish never\n` +
      `  gh release upload ${tag} ${appFiles.join(' ')} --clobber`,
  );
}

// The Android app. Installed copies update the same way as the game file
// ("Update now"), so the APK is only for people installing it the first time.
const apk = `dist-apk/Sunday-Night-v${version}.apk`;
try {
  run(process.execPath, ['scripts/build-apk.mjs', '--skip-web']);
  run('gh', ['release', 'upload', tag, apk, '--clobber']);
  console.log(`\nDone: ${tag} has the game file, the Windows installer and the Android app.`);
} catch {
  fail(
    `the game file and the desktop app are released, but the Android app is not. Try again with:\n` +
      `  node scripts/build-apk.mjs --skip-web\n` +
      `  gh release upload ${tag} ${apk} --clobber`,
  );
}
