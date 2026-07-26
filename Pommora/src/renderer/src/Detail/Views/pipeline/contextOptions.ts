// The one Context → pickable-Spaces mapping (table cell pickers, the FilterPane's chip
// fields). Spaces list in their per-Context sidebar order; every option carries the Space's
// color + icon so a picker chip renders identically to a cell chip. Pure: no fs, no React.
import type { NexusTree } from '@shared/types'
import { defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'

export interface ContextOption {
  value: string
  label: string
  color?: string
  icon?: string
}

// The card grid calls this per context value per render, so cache a STABLE array per
// (tree, contextId) instead of remapping every call — keyed on the tree object, so a tree
// push naturally invalidates it.
const optionsCache = new WeakMap<NexusTree, Map<string, ContextOption[]>>()

/** A Context's pickable Spaces — id/title/color/icon off the live tree, memoized per tree. */
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
  const fallback = defaultEntityIcon('space')
  return (group?.spaces ?? []).map((s) => ({
    value: s.id,
    label: s.title,
    icon: iconNameOr(s.icon, fallback),
    ...(s.color ? { color: s.color } : {}),
  }))
}
