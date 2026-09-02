import type { PropertyDefinition } from '@shared/properties'
import { defaultStyleFor } from '@shared/columnStyles'
import { declaredType } from '@renderer/Properties/value'
import { ICON_PX } from '@renderer/DesignSystem/Tokens/size.css'

export interface ColumnWidth {
  min: number
  default: number
  max: number
}

// Keyed by declaredType's outputs ('title' | 'context' | a PropertyType).
// Only `title` is UNCAPPED — a resize past the pane h-scrolls instead of hitting a wall; every
// other type carries a deliberate finite max. Mins stay so a stale saved value can't squash a
// column below legibility.
const UNCAPPED = Number.POSITIVE_INFINITY
const WIDTHS: Record<string, ColumnWidth> = {
  title: { min: 120, default: 280, max: UNCAPPED },
  context: { min: 80, default: 140, max: 350 },
  status: { min: 65, default: 120, max: 250 },
  select: { min: 65, default: 120, max: 350 },
  multi_select: { min: 65, default: 180, max: 350 },
  checkbox: { min: 45, default: 60, max: 80 },
  url: { min: 100, default: 140, max: 350 },
  file: { min: 100, default: 140, max: 250 },
  number: { min: 50, default: 100, max: 350 },
  datetime: { min: 90, default: 140, max: 250 },
  created_time: { min: 90, default: 120, max: 250 },
  last_edited_time: { min: 90, default: 120, max: 250 },
}

const FALLBACK: ColumnWidth = { min: 80, default: 140, max: UNCAPPED }

// Per-look min overrides, keyed [type][look], replacing the type's base min (default + max stay
// type-level). Status, select and multi-select are one option-chip family, so they share OPTION_MIN.
const OPTION_MIN = { compact: 65, standard: 80 } as const
const STYLE_MIN: Record<string, Partial<Record<string, number>>> = {
  checkbox: { switch: 70 },
  status: OPTION_MIN,
  select: OPTION_MIN,
  multi_select: OPTION_MIN,
}

const HEADER_ICON_BUMP = ICON_PX.body + 6

/** The {min, default, max} width for a column, keyed by its declared type (unknown → a sane
 *  fallback). `contextIds` is what makes a Context column classify as such — omit it and one takes
 *  the fallback instead of the Context width. */
export function widthFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnWidth {
  const t = declaredType(columnId, schema, contextIds)
  return (t !== undefined && WIDTHS[t]) || FALLBACK
}

/** A column's effective min width — the type's base min, replaced by the per-style min wherever the
 *  table defines one (a Switch checkbox needs room the checkbox min can't give; a Standard option chip
 *  carries a label where a Compact one carries a glyph). `look` omitted resolves the type's DEFAULT
 *  look, so an unstyled option column reads its Standard min; reserved timestamp columns keep the base. */
export function minWidthFor(
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const bump = iconsShown ? HEADER_ICON_BUMP : 0
  const base = widthFor(columnId, schema, contextIds).min
  const t = declaredType(columnId, schema, contextIds)
  if (t === undefined) return base + bump
  const resolved = look ?? defaultStyleFor(t).look
  const override = resolved !== undefined ? STYLE_MIN[t]?.[resolved] : undefined
  return (override ?? base) + bump
}

/** Clamp a (resized) width to a column's [min, max] — the min is style-aware via `minWidthFor`. */
export function clampWidth(
  width: number,
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
  iconsShown = false,
): number {
  const { max } = widthFor(columnId, schema, contextIds)
  return Math.max(minWidthFor(columnId, schema, look, contextIds, iconsShown), Math.min(max, width))
}
