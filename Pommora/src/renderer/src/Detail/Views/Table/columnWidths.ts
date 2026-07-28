import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import { defaultStyleFor } from '@shared/columnStyles'
import { declaredType } from '../pipeline/value'

export interface ColumnWidth {
  min: number
  default: number
  max: number
}

// Keyed by declaredType's outputs ('title' | 'context' | a PropertyType) + 'created' (special-cased).
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
  last_edited_time: { min: 90, default: 120, max: 250 },
  created: { min: 90, default: 120, max: 250 },
}

const FALLBACK: ColumnWidth = { min: 80, default: 140, max: UNCAPPED }

// Per-STYLE min overrides (TableView Prospect: each look carries its own column min, so a compact look
// shrinks tighter than a wide one). Keyed [type][look]; where an entry exists it replaces the type's
// base min (default + max stay type-level). checkbox→switch is the live case — the scaled switch plus
// cell padding overflows the checkbox type's own min; status is the scaffold (checkbox < capsule < pill).
const STYLE_MIN: Record<string, Partial<Record<string, number>>> = {
  checkbox: { switch: 70 },
  status: { checkbox: 45, capsule: 65, pill: 80 },
}

/** The {min, default, max} width for a column, keyed by its declared type (`_created_at` special-cased,
 *  unknown → a sane fallback). `contextIds` is what makes a Context column classify as such — omit it
 *  and one takes the fallback instead of the Context width. */
export function widthFor(
  columnId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnWidth {
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return WIDTHS.created
  const t = declaredType(columnId, schema, contextIds)
  return (t !== undefined && WIDTHS[t]) || FALLBACK
}

/** A column's effective min width — the type's base min, replaced by the per-style min wherever the
 *  table defines one (a Switch checkbox needs room the checkbox min can't give; a Pill status wants more
 *  than a Checkbox status). `look` omitted resolves the type's DEFAULT look, so an unstyled status reads
 *  its Pill min; reserved timestamp columns keep the base. */
export function minWidthFor(
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
): number {
  const base = widthFor(columnId, schema, contextIds).min
  if (columnId === RESERVED_PROPERTY_ID.createdAt) return base
  const t = declaredType(columnId, schema, contextIds)
  if (t === undefined) return base
  const resolved = look ?? defaultStyleFor(t).look
  const override = resolved !== undefined ? STYLE_MIN[t]?.[resolved] : undefined
  return override ?? base
}

/** Clamp a (resized) width to a column's [min, max] — the min is style-aware via `minWidthFor`. */
export function clampWidth(
  width: number,
  columnId: string,
  schema: PropertyDefinition[],
  look?: string,
  contextIds: readonly string[] = [],
): number {
  const { max } = widthFor(columnId, schema, contextIds)
  return Math.max(minWidthFor(columnId, schema, look, contextIds), Math.min(max, width))
}
