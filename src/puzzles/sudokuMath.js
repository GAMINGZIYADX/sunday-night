// Tiny 4x4 sudoku helpers (digits 1-4, 2x2 boxes). Grids are arrays of 16
// numbers, row by row, with 0 meaning "empty".

export const SIZE = 4;

export function canPlace(grid, index, value) {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  for (let i = 0; i < SIZE; i++) {
    if (i !== c && grid[r * SIZE + i] === value) return false;
    if (i !== r && grid[i * SIZE + c] === value) return false;
  }
  const br = r - (r % 2);
  const bc = c - (c % 2);
  for (let rr = br; rr < br + 2; rr++) {
    for (let cc = bc; cc < bc + 2; cc++) {
      const j = rr * SIZE + cc;
      if (j !== index && grid[j] === value) return false;
    }
  }
  return true;
}

// Counts solutions, stopping once `limit` is reached.
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  let first = null;
  const walk = () => {
    if (count >= limit) return;
    const idx = g.indexOf(0);
    if (idx === -1) {
      count++;
      if (!first) first = g.slice();
      return;
    }
    for (let v = 1; v <= SIZE; v++) {
      if (canPlace(g, idx, v)) {
        g[idx] = v;
        walk();
        g[idx] = 0;
        if (count >= limit) return;
      }
    }
  };
  // A given grid that already breaks the rules has no solutions.
  for (let i = 0; i < g.length; i++) {
    if (g[i] && !canPlace(g, i, g[i])) return { count: 0, solution: null };
  }
  walk();
  return { count, solution: first };
}

export function solve(grid) {
  return countSolutions(grid, 1).solution;
}

export function isValidComplete(grid) {
  if (grid.length !== 16 || grid.some((v) => v < 1 || v > 4)) return false;
  return grid.every((v, i) => canPlace(grid, i, v));
}
