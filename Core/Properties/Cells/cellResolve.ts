import { type PropertyDefinition, statusOptions } from '@pommora/core/Properties/properties'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import type { ValueContext } from '../valueContext'

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
  ctx: ValueContext,
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

export const buildSetIcons = (source: CollectionNode | SetNode): Map<string, string | undefined> =>
  buildSetMap(source, (s) => s.icon)

export const buildSetPaths = (source: CollectionNode | SetNode): Map<string, string> =>
  buildSetMap(source, (s) => s.path)
