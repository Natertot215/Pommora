// Resolved cell + group-header text for the table render: option VALUES become their schema
// label, Context ULIDs become Context titles — so no raw id ever reaches screen.

import { type PropertyDefinition, statusOptions } from '@shared/properties'
import type { CollectionNode, ResolvedGroup, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import type { ResolveContext } from '@renderer/Views/TableView/resolveContext'

/** A select/status option for a stored value, via the column's schema def — undefined if the column
 *  isn't a select/status or the value is unknown. Chip cells read `color` and (Compact) `icon`; text
 *  resolution reads `label`. */
export function findOption(
  columnId: string,
  value: string,
  schema: PropertyDefinition[],
): { value: string; label: string; color?: string; icon?: string } | undefined {
  const def = schema.find((d) => d.id === columnId)
  return (
    def?.select_options?.find((o) => o.value === value) ??
    statusOptions(def).find((o) => o.value === value)
  )
}

export function optionLabel(
  columnId: string,
  value: string,
  schema: PropertyDefinition[],
): string | undefined {
  return findOption(columnId, value, schema)?.label
}

export function groupLabel(
  group: ResolvedGroup,
  view: SavedView,
  ctx: ResolveContext,
  setNames: Map<string, string>,
): string {
  if (group.kind === 'ungrouped') return ''
  if (group.kind === 'structural-set') return setNames.get(group.key) ?? group.key
  const groupPropId = view.group?.kind === 'property' ? view.group.property_id : undefined
  if (!groupPropId) return group.key
  // 'true'/'false' are the checkbox bucket keys minted by bucketKey, not arbitrary strings.
  const rawFallback = group.key === 'true' ? 'On' : group.key === 'false' ? 'Off' : group.key
  return optionLabel(groupPropId, group.key, ctx.schema) ?? rawFallback
}

function buildSetMap<T>(source: CollectionNode | SetNode, pick: (s: SetNode) => T): Map<string, T> {
  const m = new Map<string, T>()
  const walk = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      m.set(s.id, pick(s))
      walk(s.sets)
    }
  }
  walk(source.sets)
  return m
}

export const buildSetNames = (source: CollectionNode | SetNode): Map<string, string> =>
  buildSetMap(source, (s) => s.title)

/** Set id → its per-entity icon across a container's Set subtree — undefined means the folder
 *  default. */
export const buildSetIcons = (source: CollectionNode | SetNode): Map<string, string | undefined> =>
  buildSetMap(source, (s) => s.icon)

/** Set id → its real path — the band-drag reparent commit needs paths for moveSet (a ResolvedGroup
 *  carries only the id). */
export const buildSetPaths = (source: CollectionNode | SetNode): Map<string, string> =>
  buildSetMap(source, (s) => s.path)
