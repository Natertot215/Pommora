/** Hold a number inside a range. The one definition every surface reads — a bound written per
 *  caller is how two of them come to disagree about which end wins when the range is inverted. */
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
