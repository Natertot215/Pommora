/** The `100%` floor comes first: a bare `max-content` collapses onto the widest row in a wider host. */
export const growToContent = (
  maxWidth: string,
): { minWidth: string; width: string; maxWidth: string } => ({
  minWidth: '100%',
  width: 'max-content',
  maxWidth,
})
