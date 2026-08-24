// Lucide geometry as CSS masks, for glyphs painted where an <Icon> can't mount (a line's ::before).
const lucideMask = (paths: string, strokeWidth: number): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='${strokeWidth}' stroke-linecap='round' stroke-linejoin='round'%3E${paths}%3C/svg%3E")`

export const GRIP_GLYPH = lucideMask(
  "%3Ccircle cx='9' cy='12' r='1'/%3E%3Ccircle cx='9' cy='5' r='1'/%3E%3Ccircle cx='9' cy='19' r='1'/%3E%3Ccircle cx='15' cy='12' r='1'/%3E%3Ccircle cx='15' cy='5' r='1'/%3E%3Ccircle cx='15' cy='19' r='1'/%3E",
  2,
)
export const FOLD_CHEVRON_MASK = lucideMask("%3Cpath d='m9 18 6-6-6-6'/%3E", 2.5)
export const CODE_CHEVRON_MASK = lucideMask("%3Cpath d='m9 18 6-6-6-6'/%3E", 2)
export const CONN_LINK_MASK = lucideMask(
  "%3Cpath d='M9 17H7A5 5 0 0 1 7 7h2'/%3E%3Cpath d='M15 7h2a5 5 0 1 1 0 10h-2'/%3E%3Cline x1='8' x2='16' y1='12' y2='12'/%3E",
  2,
)
