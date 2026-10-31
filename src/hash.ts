/** 32-bit FNV-1a hash over UTF-16 code units.
 * Determinism-critical: keep iteration order and constant multipliers bit-identical. */
export function fnv1a(text: string, seed = 2166136261): number {
  let h = seed;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
