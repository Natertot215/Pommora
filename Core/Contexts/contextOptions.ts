import type { NexusTree } from '../Nexus/tree'
import type { PickOption } from '../Properties/properties'
import type { ResolvedColumn } from '../Views/viewRow'
import { spacesByIdOf } from './contextIdentity'

// The card grid calls this per context value per render, so a STABLE array is cached per Context, on the Space identities it is built from.
const optionsCache = new WeakMap<object, Map<string, PickOption[]>>()

/** A Context column's Spaces as options; undefined for any other column, or with no tree. */
export function contextOptionsFor(
  { id: contextId, type }: ResolvedColumn,
  tree: NexusTree | null,
  excludeId?: string,
): PickOption[] | undefined {
  if (type !== 'context' || !tree) return undefined
  const spaces = spacesByIdOf(tree)
  let byContext = optionsCache.get(spaces)
  if (!byContext) {
    byContext = new Map()
    optionsCache.set(spaces, byContext)
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
