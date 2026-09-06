import type { NexusTree } from '@pommora/core/Nexus/tree'
import { spacesByIdOf } from './contextIdentity'

export interface ContextOption {
  value: string
  label: string
  color?: string
  icon?: string
}

// The card grid calls this per context value per render, so a STABLE array is cached per (tree, contextId) — keyed on the tree object, so a push invalidates it.
const optionsCache = new WeakMap<NexusTree, Map<string, ContextOption[]>>()

export function contextOptionsFor(contextId: string, tree: NexusTree): ContextOption[] {
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
  return opts
}

function buildOptions(contextId: string, tree: NexusTree): ContextOption[] {
  const group = tree.contexts?.find((g) => g.def.id === contextId)
  // Identity comes from the seam, never re-derived here: resolving the glyph locally is what let a picker chip disagree with the sidebar on a personalized nexus.
  const byId = spacesByIdOf(tree)
  return (group?.spaces ?? []).flatMap((s) => {
    const identity = byId.get(s.id)
    return identity
      ? [
          {
            value: s.id,
            label: identity.title,
            icon: identity.icon,
            ...(identity.color ? { color: identity.color } : {}),
          },
        ]
      : []
  })
}
