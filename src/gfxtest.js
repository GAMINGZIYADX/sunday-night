// The graphics test, for a device where the game draws wrong (?gfxtest in
// any build). It runs the real game in a small frame once per setting below
// (?probe=1, see Game._probeFrame), shows what each run drew, how fast it
// ran and the graphics chip's details, and offers it all as text to copy.
// A tool for the author, so its words live here rather than in config.js.
import { autoQuality, gpuName } from './engine/quality.js';

const RUNS = [
  ['Full, as the game uses it', 'quality=full'],
  ['Full, no shadows', 'quality=full&shadows=0'],
  ['Full, no edge smoothing', 'quality=full&msaa=0'],
  ['Full, no shadows or edge smoothing', 'quality=full&shadows=0&msaa=0'],
  ['Full, no tone mapping', 'quality=full&tonemap=0'],
  ['Full, resolution 1x', 'quality=full&ratio=1'],
  ['Full on WebGL 1', 'quality=full&webgl1=1'],
  ['Light, as the game uses it', 'quality=light'],
  ['Light + edge smoothing', 'quality=light&msaa=1'],
  ['Light + shadows', 'quality=light&shadows=1'],
];

function chipInfo() {
  const out = { auto: autoQuality(), gpu: gpuName() };
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const hi = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    Object.assign(out, {
      version: gl.getParameter(gl.VERSION),
      glsl: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      highpFragment: hi ? `${hi.precision} bits` : 'none',
      maxSamples: gl.MAX_SAMPLES ? gl.getParameter(gl.MAX_SAMPLES) : '-',
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      fragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      extensions: (gl.getSupportedExtensions() || []).length,
    });
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (e) {
    out.error = String(e);
  }
  Object.assign(out, {
    screen: `${screen.width}x${screen.height} @${devicePixelRatio}`,
    cores: navigator.hardwareConcurrency,
    memory: navigator.deviceMemory,
    browser: navigator.userAgent,
  });
  return out;
}

const h = (tag, style, text) => {
  const e = document.createElement(tag);
  if (style) e.style.cssText = style;
  if (text !== undefined) e.textContent = text;
  return e;
};

// One run: the game in a frame until it reports (or 60 s pass). The frame
// sits where it is seen (browsers pause frames scrolled out of view).
function run(query, host, keep) {
  return new Promise((resolve) => {
    const frame = h('iframe', 'width:320px;height:180px;border:0;display:block;background:#000');
    frame.src = `${location.pathname}?probe=1&${query}${keep ? '&keep=1' : ''}`;
    const done = (result) => {
      clearTimeout(timer);
      removeEventListener('message', onMsg);
      if (!keep) frame.remove();
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

export async function runGfxTest() {
  document.title = 'Sunday Night: graphics test';
  const page = h(
    'div',
    'position:fixed;inset:0;overflow:auto;background:#f7ecd9;color:#4a3a33;font:14px system-ui,sans-serif;padding:16px;user-select:text',
  );
  page.append(h('h2', 'margin:0 0 6px', 'Graphics test'));
  page.append(
    h('p', 'margin:0 0 12px', 'Runs the bedroom ten ways. Keep this page open until it says Done (about a minute), then press Copy results.'),
  );
  const info = chipInfo();
  page.append(h('pre', 'white-space:pre-wrap;background:#fdf7ec;padding:10px;border-radius:8px;margin:0 0 12px', JSON.stringify(info, null, 1)));
  const status = h('p', 'font-weight:bold', 'Running…');
  const copy = h(
    'button',
    'font:inherit;padding:10px 18px;border-radius:10px;border:0;background:#e2a29d;color:#fff;margin:0 0 12px',
    'Copy results',
  );
  const grid = h('div', 'display:flex;flex-wrap:wrap;gap:12px');
  page.append(status, copy, grid);
  const stage = h('div', 'position:fixed;right:8px;bottom:8px;z-index:2;box-shadow:0 4px 16px rgba(0,0,0,.4)');
  document.getElementById('app').replaceChildren(page, stage);

  const lines = [JSON.stringify(info)];
  copy.onclick = () => {
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).then(
      () => (copy.textContent = 'Copied'),
      () => (copy.textContent = 'Copy failed: select the text below'),
    );
  };
  for (const [i, [name, query]] of RUNS.entries()) {
    const cell = h('div', 'width:320px');
    cell.append(h('div', 'font-weight:bold;margin:0 0 4px', `${i + 1}. ${name}`));
    grid.append(cell);
    status.textContent = `Running ${i + 1} of ${RUNS.length}: ${name}…`;
    // The first run stays live (as the screen shows it) next to its snapshot
    // (as the game reads it back): they differ if the fault is in the display.
    const r = await run(query, i === 0 ? cell : stage, i === 0);
    if (r?.failed) {
      cell.append(h('div', 'color:#b00;white-space:pre-wrap', `could not start: ${r.failed}`));
      lines.push(`${i + 1}. ${name}: could not start: ${r.failed}`);
    } else if (r) {
      const img = h('img', 'width:320px;height:180px;display:block;margin-top:4px');
      img.src = r.image;
      cell.append(img);
      const verdict = r.white ? 'WHITE' : 'drawn';
      const text = `${verdict}, ${r.fps} fps, ${r.size.join('x')}, mean rgb ${r.mean.join(',')}, webgl${r.webgl2 ? 2 : 1}, msaa ${r.antialias}, shadows ${r.shadows}`;
      cell.append(h('div', `color:${r.white ? '#b00' : '#4a3a33'}`, text));
      lines.push(`${i + 1}. ${name}: ${text}`);
      // Shader errors and other complaints, the most telling part on a bad driver.
      for (const e of r.errors) {
        cell.append(h('div', 'color:#b00;font-size:11px;white-space:pre-wrap;word-break:break-all', e));
        lines.push(`   ! ${e}`);
      }
    } else {
      cell.append(h('div', 'color:#b00', 'no answer within 60 s'));
      lines.push(`${i + 1}. ${name}: no answer`);
    }
  }
  status.textContent = 'Done. Press Copy results and send them.';
  page.append(h('pre', 'white-space:pre-wrap;margin-top:12px', lines.join('\n')));
}
