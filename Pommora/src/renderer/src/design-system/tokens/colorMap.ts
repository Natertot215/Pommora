// The color-exchange layer — maps an external color name (a legacy Notion select color / the
// Swift AreaColor palette) onto one of the app's render palettes. `chipColorFor` is the
// chip-palette accessor; other exchanges add a sibling accessor here rather than re-deriving the
// mapping.
//
// `import type` keeps this module runtime-pure (the vanilla-extract `chip.css` is never loaded
// here), so it stays unit-testable while the name list still single-sources from the chip palette.

import { LEGACY_CHIP_COLOR_MAP, SOLID_COLORS } from '@shared/types'
import type { ChipColorName } from './chip.css'

const MAP: Record<string, ChipColorName> = LEGACY_CHIP_COLOR_MAP

// The render-palette keys (ChipColorName minus 'default') — runtime-pure via SOLID_COLORS
// (chip.css is never loaded here). An option's stored color IS a solid key now, so a key already
// in the palette passes through before consulting the legacy Notion map, which only covers old
// on-disk names.
const PALETTE: ReadonlySet<string> = new Set(SOLID_COLORS)

export function chipColorFor(color: string | undefined): ChipColorName {
  if (color && PALETTE.has(color)) return color as ChipColorName
  return (color && MAP[color]) || 'default'
}

// User-facing display names that DON'T match the palette key. The on-disk key is unchanged — this is
// display only. `lightBlue` reads as "Cobalt" (Nathan's term); everything else Title-cases its key.
const COLOR_LABELS: Partial<Record<ChipColorName, string>> = { lightBlue: 'Cobalt' }

export function colorLabel(name: ChipColorName): string {
  return COLOR_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1)
}
