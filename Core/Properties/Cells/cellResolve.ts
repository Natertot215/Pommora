import { optionsOf, type PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'

export function findOption(columnId: string, value: string, schema: PropertyDefinition[]) {
  const def = schema.find((d) => d.id === columnId)
  return optionsOf(def).find((o) => o.value === value)
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
