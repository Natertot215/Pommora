// The chip-palette accessor: a stored color IS a solid key, and anything else renders the
// neutral default. `import type` keeps this module runtime-pure (the vanilla-extract `chip.css`
// is never loaded here), so it stays unit-testable while the name list still single-sources
// from the chip palette.

import { SOLID_COLORS } from '@shared/types'
import type { ChipColorName } from './chip.css'

const PALETTE: ReadonlySet<string> = new Set(SOLID_COLORS)

export function chipColorFor(color: string | undefined): ChipColorName {
  return color && PALETTE.has(color) ? (color as ChipColorName) : 'default'
}

// User-facing display names that DON'T match the palette key. The on-disk key is unchanged — this is
// display only. `lightBlue` reads as "Cobalt" (the chosen term); everything else Title-cases its key.
const COLOR_LABELS: Partial<Record<ChipColorName, string>> = { lightBlue: 'Cobalt' }

export function colorLabel(name: ChipColorName): string {
  return COLOR_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1)
}
