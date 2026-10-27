// The graphics test, for a device where the game draws wrong (?gfxtest in
// any build). It runs the real game in a small frame once per setting below
// (?probe=1, see Game._probeFrame), shows what each run drew, how fast it
// ran and the graphics chip's details, and offers it all as text to copy.
// A tool for the author, so its words live here rather than in config.js.
//
// A bad driver can crash 3D outright, and then the browser keeps 3D off for
// the page until it is restarted. So the runs go from safest to riskiest,
// progress is saved after each, and after a crash the page asks for a browser
// restart and carries on from the next run.
import { autoQuality, gpuName } from './engine/quality.js';
import { readJSON, writeJSON } from './engine/save.js';

const KEY = 'sundayNight.gfxtest.v1';
const RUNS = [
  ['Light, as the game uses it', 'quality=light'],
  ['Light + edge smoothing', 'quality=light&msaa=1'],
  ['Full, no shadows or edge smoothing', 'quality=full&shadows=0&msaa=0'],
  ['Full, no shadows', 'quality=full&shadows=0&msaa=1'],
  ['Full on WebGL 1, no shadows', 'quality=full&shadows=0&msaa=0&webgl1=1'],
  ['Light + shadows', 'quality=light&shadows=1&msaa=0'],
  ['Full with shadows, no edge smoothing', 'quality=full&shadows=1&msaa=0'],
  ['Full with shadows and edge smoothing (other phones)', 'quality=full&shadows=1&msaa=1'],
];
const RESTART =
  'Chrome now keeps 3D off for this page until it restarts. Close Chrome completely (swipe it away in the recent apps), open the same link again, and the test carries on from the next run.';

function chipInfo() {
  const out = { auto: autoQuality(), gpu: gpuName() };
  const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
  if (!gl) out.webgl = 'off (blocked after a crash, or not available)';
  else {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const hi = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    Object.assign(out, {
      version: gl.getParameter(gl.VERSION),
      glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      highpFragment: hi ? `${hi.precision} bits` : 'none',
      maxSamples: gl.MAX_SAMPLES ? gl.getParameter(gl.MAX_SAMPLES) : '-',
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      extensions: (gl.getSupportedExtensions() || []).length,
    });
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return Object.assign(out, {
    screen: `${screen.width}x${screen.height} @${devicePixelRatio}`,
    cores: navigator.hardwareConcurrency,
    memory: navigator.deviceMemory,
    browser: navigator.userAgent,
  });
}

const h = (tag, style, text) => {
  const e = document.createElement(tag);
  if (style) e.style.cssText = style;
  if (text !== undefined) e.textContent = text;
  return e;
};
const button = (text, onclick) => {
  const b = h('button', 'font:inherit;padding:10px 18px;border-radius:10px;border:0;background:#e2a29d;color:#fff;margin:0 8px 12px 0', text);
  b.onclick = onclick;
  return b;
};

// One run: the game in a frame until it reports (or 60 s pass). The frame
// sits where it is seen (browsers pause frames scrolled out of view).
function run(query, host) {
  return new Promise((resolve) => {
    const frame = h('iframe', 'width:320px;height:180px;border:0;display:block;background:#000');
    frame.src = `${location.pathname}?probe=1&${query}`;
    const done = (result) => {
      clearTimeout(timer);
      removeEventListener('message', onMsg);
      frame.remove();
      resolve(result);
    };
    const onMsg = (e) => {
      if (e.source === frame.contentWindow && e.data?.gfxProbe !== undefined) done(e.data);
    };
    const timer = setTimeout(() => done(null), 60000);
    addEventListener('message', onMsg);
    host.append(frame);
  });
}

// What a run's report says, in one line (and whether 3D is gone after it).
function describe(r) {
  if (!r) return { text: 'no answer within 60 s' };
  if (r.lost) return { text: '3D CRASHED (context lost)', crashed: true, errors: r.errors };
  if (r.failed) return { text: `could not start: ${r.failed}`, crashed: /WebGL/.test(r.failed) };
  const text = `${r.white ? 'WHITE' : 'drawn'}, ${r.fps} fps, ${r.size.join('x')}, mean rgb ${r.mean.join(',')}, webgl${r.webgl2 ? 2 : 1}, msaa ${r.antialias}, shadows ${r.shadows}`;
  return { text, image: r.image, errors: r.errors };
}

export async function runGfxTest() {
  document.title = 'Sunday Night: graphics test';
  const page = h(
    'div',
    'position:fixed;inset:0;overflow:auto;background:#f7ecd9;color:#4a3a33;font:14px system-ui,sans-serif;padding:16px;user-select:text;-webkit-user-select:text',
  );
  const stage = h('div', 'position:fixed;right:8px;bottom:8px;z-index:2;box-shadow:0 4px 16px rgba(0,0,0,.4)');
  document.getElementById('app').replaceChildren(page, stage);

  const state = readJSON(KEY) || { results: [] };
  const now = chipInfo();
  if (!state.info || (now.version && !state.info.version)) state.info = now;
  // A run that started but never reported: the page itself went down with it.
  if (state.running !== undefined && state.running !== null) {
    state.results[state.running] = { text: 'the page closed or crashed during this run', crashed: true };
    state.running = null;
  }
  const save = () => writeJSON(KEY, state);
  save();

  const lines = () => [
    JSON.stringify(state.info),
    ...RUNS.map(
      ([name], i) =>
        state.results[i] && [`${i + 1}. ${name}: ${state.results[i].text}`, ...(state.results[i].errors || []).map((e) => `   ! ${e}`)].join('\n'),
    ).filter(Boolean),
  ];
  const out = h('textarea', 'width:100%;height:160px;font:12px monospace;margin-top:12px');
  const status = h('p', 'font-weight:bold');
  const copy = button('Copy results', () => {
    out.value = lines().join('\n');
    out.select();
    const ok = () => (copy.textContent = 'Copied');
    const viaSelection = () => (document.execCommand('copy') ? ok() : (copy.textContent = 'Select the text below and copy it'));
    if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(ok, viaSelection);
    else viaSelection();
  });
  const restart = button('Start over', () => {
    writeJSON(KEY, null);
    location.reload();
  });
  const grid = h('div', 'display:flex;flex-wrap:wrap;gap:12px');
  page.append(
    h('h2', 'margin:0 0 6px', 'Graphics test'),
    h(
      'p',
      'margin:0 0 12px',
      `Runs the bedroom ${RUNS.length} ways, from the safest settings up. Keep this page open until it says Done, then press Copy results.`,
    ),
    h('pre', 'white-space:pre-wrap;background:#fdf7ec;padding:10px;border-radius:8px;margin:0 0 12px', JSON.stringify(state.info, null, 1)),
    status,
    copy,
    restart,
    grid,
    out,
  );

  const show = (i) => {
    const res = state.results[i];
    const cell = h('div', 'width:320px');
    cell.append(h('div', 'font-weight:bold;margin:0 0 4px', `${i + 1}. ${RUNS[i][0]}`));
    if (res.image) {
      const img = h('img', 'width:320px;height:180px;display:block');
      img.src = res.image;
      cell.append(img);
    }
    cell.append(h('div', `color:${/WHITE|CRASHED|could not|no answer|closed/.test(res.text) ? '#b00' : '#4a3a33'}`, res.text));
    for (const e of res.errors || []) cell.append(h('div', 'color:#b00;font-size:11px;white-space:pre-wrap;word-break:break-all', e));
    grid.append(cell);
  };
  state.results.forEach((r, i) => r && show(i));
  out.value = lines().join('\n');

  for (let i = 0; i < RUNS.length; i++) {
    if (state.results[i]) continue;
    if (!now.version) {
      status.textContent = `3D is off in this browser right now. ${RESTART}`;
      return;
    }
    status.textContent = `Running ${i + 1} of ${RUNS.length}: ${RUNS[i][0]}…`;
    state.running = i;
    save();
    const res = describe(await run(RUNS[i][1], stage));
    state.results[i] = res;
    state.running = null;
    save();
    show(i);
    out.value = lines().join('\n');
    if (res.crashed) {
      status.textContent = `Run ${i + 1} crashed the 3D graphics. ${RESTART}`;
      return;
    }
  }
  status.textContent = 'Done. Press Copy results and send them.';
}
