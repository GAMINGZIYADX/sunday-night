// Fills {NAME}-style placeholders in a text from config.js.
export function fill(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
