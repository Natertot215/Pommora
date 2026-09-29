// Every array carries the full membership it governs — a partial write alphabetizes the untouched siblings, and one built from a filtered view permanently re-ranks every row the filter was hiding.

import { NEW_SLOT, type MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import {
  type Personalization,
  type Placement,
  settingOf,
} from '@pommora/core/Settings/personalization'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'
import { containerAt, pageIdsIn } from '../Nexus/treePatch'

export const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

export type Slot = 'above' | 'below' | 'first' | 'last'

export function spliceBeside(
  ids: string[],
  anchorId: string | null,
  item: string,
  where: Slot,
): string[] {
  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
  const before =
    where === 'first'
      ? (ids[0] ?? null)
      : where === 'above'
        ? anchorId
        : where === 'below' && at >= 0
          ? (ids[at + 1] ?? null)
          : null
  return nextOrder(ids, item, before)
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
  where: Slot,
): string[] {
  return spliceBeside(mergedRanking(existing, allIds, newId), anchorId, newId, where)
}

export const placementSlot = (placement: Placement): Slot =>
  placement === 'top' ? 'first' : 'last'

// A parent the tree lacks leaves the request bare, since an order naming only the newborn would drop every sibling from the folder's order.
export function placeAt<R extends MutateRequest & { order?: string[] }>(
  req: R,
  siblingIds: string[] | undefined,
  anchorId: string | null,
  where: Slot,
): R {
  return siblingIds
    ? {
        ...req,
        order: spliceBeside(
          siblingIds.filter((id) => id !== NEW_SLOT),
          anchorId,
          NEW_SLOT,
          where,
        ),
      }
    : req
}

export function placeNew<R extends MutateRequest>(tree: NexusTree, req: R, p: Personalization): R {
  const at = (siblingIds: string[] | undefined, placement: Placement): R =>
    placeAt(req, siblingIds, null, placementSlot(placement))
  const r: MutateRequest = req
  switch (r.op) {
    case 'createPage':
      return at(pageIdsIn(tree, r.parentPath), settingOf(p, 'newPagePlacement'))
    case 'createContainer': {
      const parent = r.kind === 'set' ? containerAt(tree, r.parentPath) : null
      return at(
        parent ? (parent.sets ?? []).map((n) => n.id) : undefined,
        settingOf(p, 'newFolderPlacement'),
      )
    }
    case 'createSpace':
      return at(
        tree.contexts.find((g) => g.def.id === r.contextId)?.spaces.map((n) => n.id),
        settingOf(p, 'newSpacePlacement'),
      )
    default:
      return req
  }
}
