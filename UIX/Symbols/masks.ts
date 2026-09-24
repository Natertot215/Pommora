import { svgFrame } from './svgFrame'

// Lucide geometry as CSS masks, for glyphs painted where an <Icon> can't mount (a line's ::before).
const lucideMask = (body: string, strokeWidth = 2): string =>
  `url("data:image/svg+xml,${encodeURIComponent(svgFrame(body, { stroke: '#000', strokeWidth }))}")`

export const GRIP_GLYPH = lucideMask(
  '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
)
export const FOLD_CHEVRON_MASK = lucideMask('<path d="m9 18 6-6-6-6"/>', 2.5)
export const CONN_LINK_MASK = lucideMask(
  '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
)
