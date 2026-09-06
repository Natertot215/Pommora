// A plain module, NOT `.css.ts`: vanilla-extract only lets a stylesheet export plain values, so a
// helper that BUILDS a declaration lives beside the stylesheet rather than inside it.

/**
 * How a Frame sizes itself horizontally: fill the host frame first — its floor is the real
 * minimum — then stretch with the longest row up to the caller's ceiling. Without the floor a bare
 * `max-content` collapses the frame onto its widest row inside a wider host, stranding every row
 * and separator at part of the surface's width. The ceiling stays the caller's own knob.
 */
export const growToContent = (
  maxWidth: string,
): { minWidth: string; width: string; maxWidth: string } => ({
  minWidth: '100%',
  width: 'max-content',
  maxWidth,
})
