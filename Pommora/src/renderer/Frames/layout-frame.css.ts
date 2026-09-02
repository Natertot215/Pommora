import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'

const c = colorVars.color

// KNOBS — the LayoutFrame grid + tiles
const GRID = {
  gapX: 8,
  gapY: 8,
  edgeY: 8,
  tileRadius: 8,
  tileBorder: 2,
  tileAspect: 1.5,
}

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: `${GRID.gapY}px ${GRID.gapX}px`,
  padding: `${GRID.edgeY}px 0`,
})

/** The glyph is opaque, not a white-alpha label tone: an alpha tone doubles where the glyph's own
 *  strokes overlap and its soft edges read as aliasing — an opaque hex composites clean. */
export const tile = style({
  aspectRatio: `${GRID.tileAspect}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `${GRID.tileBorder}px solid ${c.border.base}`,
  borderRadius: `${GRID.tileRadius}px`,
  background: 'none',
  padding: 0,
  cursor: 'default',
  color: c.solid.grey,
})

export const tileSelected = style({ borderColor: 'var(--accent-stroke-hot)' })
