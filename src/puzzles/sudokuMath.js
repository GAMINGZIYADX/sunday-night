// Small sudoku helpers for N x N boards with BOX_R x BOX_C boxes (6x6 with
// 2x3 boxes here). Grids are arrays, row by row, with 0 meaning "empty".

export function shape(size) {
  if (size === 4) return { n: 4, br: 2, bc: 2 };
  if (size === 6) return { n: 6, br: 2, bc: 3 };
  if (size === 9) return { n: 9, br: 3, bc: 3 };
  throw new Error('unsupported sudoku size ' + size);
}

export function sizeOf(grid) {
  return Math.round(Math.sqrt(grid.length));
}

export function canPlace(grid, index, value) {
  const { n, br, bc } = shape(sizeOf(grid));
  const r = Math.floor(index / n);
  const c = index % n;
  for (let i = 0; i < n; i++) {
    if (i !== c && grid[r * n + i] === value) return false;
    if (i !== r && grid[i * n + c] === value) return false;
  }
  const r0 = r - (r % br);
  const c0 = c - (c % bc);
  for (let rr = r0; rr < r0 + br; rr++) {
    for (let cc = c0; cc < c0 + bc; cc++) {
      const j = rr * n + cc;
      if (j !== index && grid[j] === value) return false;
    }
  }
  return true;
}

// Counts solutions, stopping once `limit` is reached.
export function countSolutions(grid, limit = 2) {
  const n = sizeOf(grid);
  const g = grid.slice();
  let count = 0;
  let first = null;
  for (let i = 0; i < g.length; i++) if (g[i] && !canPlace(g, i, g[i])) return { count: 0, solution: null };
  const walk = () => {
    if (count >= limit) return;
    // Most-constrained empty cell first keeps this fast.
    let best = -1;
    let bestOpts = null;
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const opts = [];
      for (let v = 1; v <= n; v++) if (canPlace(g, i, v)) opts.push(v);
      if (!bestOpts || opts.length < bestOpts.length) {
        best = i;
        bestOpts = opts;
        if (opts.length <= 1) break;
      }
    }
    if (best === -1) {
      count++;
      if (!first) first = g.slice();
      return;
    }
    for (const v of bestOpts) {
      g[best] = v;
      walk();
      g[best] = 0;
      if (count >= limit) return;
    }
  };
  walk();
  return { count, solution: first };
}

export function solve(grid) {
  return countSolutions(grid, 1).solution;
}

export function isValidComplete(grid) {
  const n = sizeOf(grid);
  if (grid.some((v) => v < 1 || v > n)) return false;
  return grid.every((v, i) => canPlace(grid, i, v));
}
