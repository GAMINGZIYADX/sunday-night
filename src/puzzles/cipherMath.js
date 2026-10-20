// Generic Caesar shift for A-Z. Anything that is not a letter is left alone.
// shift(text, 3) moves every letter three steps forward (A -> D);
// shift(text, -3) moves it back again.
export function caesarShift(text, amount) {
  const k = ((amount % 26) + 26) % 26;
  return String(text)
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + k) % 26) + 65));
}

export const caesarEncode = (text, shift) => caesarShift(text, shift);
export const caesarDecode = (text, shift) => caesarShift(text, -shift);
