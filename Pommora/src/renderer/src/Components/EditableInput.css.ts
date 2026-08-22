import { style } from '@vanilla-extract/css'

// Auto-sizing field: the input overlays a hidden mirror span in ONE grid cell, so the field
// shrink-wraps to its text through CSS reflow — never a per-keystroke layout read. Font + padding
// inherit from the caller's surface (the option chip), so the mirror measures in the same metrics.

/** The in-place caret's own reset. An unstyled <input> wears the UA's box — a white fill, a border
 *  and a focus ring in the system accent — which is chrome around a field that is meant to read as
 *  the text it replaced. Stripped to nothing, it inherits the surface's metrics and leaves the
 *  selection to the native highlight. */
export const bare = style({
  border: 'none',
  outline: 'none',
  padding: 0,
  background: 'transparent',
  color: 'inherit',
})

export const autoSizeWrap = style({ display: 'inline-grid' })

export const autoSizeMirror = style({
  gridArea: '1 / 1',
  visibility: 'hidden',
  whiteSpace: 'pre',
  pointerEvents: 'none',
})

export const autoSizeInput = style({ gridArea: '1 / 1', width: '100%', minWidth: 0 })
