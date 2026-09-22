// Every array carries the full membership it governs — a partial write alphabetizes the untouched siblings, and one built from a filtered view permanently re-ranks every row the filter was hiding.

import { NEW_SLOT, type MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { Personalization, Placement } from '@pommora/core/Settings/personalization'
import { findContainerWhere } from '../Nexus/treePatch'

export const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

export function spliceBeside(
  ids: string[],
  anchorId: string | null,
  item: string,
  where: 'above' | 'below',
): string[] {
  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
  if (at === -1) return [...ids, item]
  const insert = where === 'below' ? at + 1 : at
  return [...ids.slice(0, insert), item, ...ids.slice(insert)]
}

export function orderWithSlot(
  siblingIds: string[],
  anchorId: string | null,
  where: 'above' | 'below' | 'first' | 'last',
): string[] {
  const ids = siblingIds.filter((id) => id !== NEW_SLOT)
  if (where === 'first') return [NEW_SLOT, ...ids]
  if (where === 'last' || anchorId === null) return [...ids, NEW_SLOT]
  return spliceBeside(ids, anchorId, NEW_SLOT, where)
}

function mergedRanking(
  existing: string[] | undefined,
  allIds: string[],
  excludeId: string,
): string[] {
  const base = existing ?? []
  const inBase = new Set(base)
  return [
    ...base.filter((id) => id !== excludeId),
    ...allIds.filter((id) => !inBase.has(id) && id !== excludeId),
  ]
}

export function tieOrderWith(
  existing: string[] | undefined,
  allIds: string[],
  newId: string,
  anchorId: string | null,
  where: 'above' | 'below' | 'first',
): string[] {
  const ranked = mergedRanking(existing, allIds, newId)
  return where === 'first' ? [newId, ...ranked] : spliceBeside(ranked, anchorId, newId, where)
}

// Bottom is the append the bare request already makes.
function atTop<R extends MutateRequest & { order?: string[] }>(
  req: R,
  placement: Placement | undefined,
  siblingIds: string[] | undefined,
): R {
  return placement === 'top' && siblingIds
    ? { ...req, order: orderWithSlot(siblingIds, null, 'first') }
    : req
}

export function placeNew(tree: NexusTree, req: MutateRequest, p: Personalization): MutateRequest {
  const container = (path: string) => findContainerWhere(tree, (n) => n.path === path)
  switch (req.op) {
    case 'createPage':
      return atTop(
        req,
        p.newPagePlacement,
        container(req.parentPath)?.pages.map((n) => n.id),
      )
    case 'createContainer': {
      const parent = req.kind === 'set' ? container(req.parentPath) : null
      return atTop(
        req,
        p.newFolderPlacement,
        parent ? (parent.sets ?? []).map((n) => n.id) : undefined,
      )
    }
    case 'createSpace': {
      const group = tree.contexts.find((g) => g.def.id === req.contextId)
      return atTop(
        req,
        p.newSpacePlacement,
        group?.spaces.map((n) => n.id),
      )
    }
    default:
      return req
  }
}
