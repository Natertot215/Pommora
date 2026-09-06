// Not a `.css.ts`: vanilla-extract stylesheets may only export plain values, never a builder.

/** The `100%` floor comes first because a bare `max-content` collapses the frame onto its widest
 *  row inside a wider host, stranding every row and separator at part of the surface's width. */
export const growToContent = (
  maxWidth: string,
): { minWidth: string; width: string; maxWidth: string } => ({
  minWidth: '100%',
  width: 'max-content',
  maxWidth,
})
