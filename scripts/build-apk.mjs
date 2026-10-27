// Builds the Android app: dist/index.html in a Capacitor WebView, signed with
// the release key, into dist-apk/Sunday-Night-vX.Y.Z.apk.
//
//   npm run build:apk               builds the game first
//   node scripts/build-apk.mjs --skip-web   uses the dist/ already built
//
// Needs the Android SDK (ANDROID_HOME, or %LOCALAPPDATA%\Android\Sdk), a JDK 17
// (JAVA_HOME, or the java on PATH), and the release key in
// %USERPROFILE%\.sunday-night\keystore.properties (see README).
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const fail = (msg) => {
  console.error(`build:apk: ${msg}`);
  process.exit(1);
};
const win = process.platform === 'win32';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', shell: win, ...opts });

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;

const env = { ...process.env };
env.ANDROID_HOME ||= path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk');
if (!existsSync(env.ANDROID_HOME)) fail(`no Android SDK at ${env.ANDROID_HOME} (set ANDROID_HOME)`);
if (!env.JAVA_HOME) {
  // The JDK of the java on PATH (it prints its settings on stderr).
  const r = spawnSync('java', ['-XshowSettings:properties', '-version'], { encoding: 'utf8' });
  env.JAVA_HOME = /java\.home = (.+)/.exec(`${r.stdout}${r.stderr}`)?.[1]?.trim();
  if (!env.JAVA_HOME) fail('no JDK found (install JDK 17 or set JAVA_HOME)');
}
const keystore = env.SUNDAY_NIGHT_KEYSTORE || path.join(homedir(), '.sunday-night', 'keystore.properties');
if (!existsSync(keystore)) fail(`no release key at ${keystore} (see README: Android app)`);
// Gradle finds the SDK through local.properties (not in git).
writeFileSync('android/local.properties', `sdk.dir=${env.ANDROID_HOME.replace(/\\/g, '/')}\n`);

if (!process.argv.includes('--skip-web')) run('npm', ['run', 'build'], { env });
run('npx', ['cap', 'sync', 'android'], { env });
// The full path, quoted: cmd does not look in the working folder, and the
// path may have spaces.
const gradlew = path.resolve('android', win ? 'gradlew.bat' : 'gradlew');
run(win ? `"${gradlew}"` : gradlew, ['assembleRelease', `-PappVersionName=${version}`, `-PappVersionCode=${versionCode}`, '--no-daemon', '-q'], {
  env,
  cwd: 'android',
});

const built = 'android/app/build/outputs/apk/release/app-release.apk';
if (!existsSync(built)) fail('Gradle finished but no signed APK was made (is the release key set up?)');
mkdirSync('dist-apk', { recursive: true });
const out = `dist-apk/Sunday-Night-v${version}.apk`;
copyFileSync(built, out);
console.log(`\n${out} (version ${version}, code ${versionCode})`);
