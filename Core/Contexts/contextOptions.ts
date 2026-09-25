import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { PickOption } from '../Properties/properties'
import { spacesByIdOf } from './contextIdentity'

// The card grid calls this per context value per render, so a STABLE array is cached per (tree, contextId) — keyed on the tree object, so a push invalidates it.
const optionsCache = new WeakMap<NexusTree, Map<string, PickOption[]>>()

export function contextOptionsFor(
  contextId: string,
  tree: NexusTree,
  excludeId?: string,
): PickOption[] {
  let byContext = optionsCache.get(tree)
  if (!byContext) {
    byContext = new Map()
    optionsCache.set(tree, byContext)
  }
  let opts = byContext.get(contextId)
  if (!opts) {
    opts = buildOptions(contextId, tree)
    byContext.set(contextId, opts)
  }
  return excludeId ? opts.filter((o) => o.value !== excludeId) : opts
}

function buildOptions(contextId: string, tree: NexusTree): PickOption[] {
  // Identity comes from the seam, never re-derived here: resolving the glyph locally is what let a picker chip disagree with the sidebar on a personalized nexus.
  return [...spacesByIdOf(tree)]
    .filter(([, s]) => s.contextId === contextId)
    .map(([id, s]) => ({
      value: id,
      label: s.title,
      icon: s.icon,
      ...(s.color ? { color: s.color } : {}),
    }))
}
