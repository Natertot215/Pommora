// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree and stepped past what the disk holds, the order it lands in, or the refusal that says why it cannot be placed.

import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
import { basename, isAtOrUnder, join, relative, titleFromPath } from '../Paths/posix'
import { createDisambiguated, freeName } from '../Paths/names'
import { pathExists } from '../Files/atomicWrite'
import { landingRefusal } from '../Nexus/folderEntity'
import { fail, fault, ok, type Result } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import type { RestoreDestination } from '../Nexus/mutateRequest'
import type { NexusPages } from '../Nexus/heldPages'
import type { EntityRecord } from '../Nexus/record'
import { findContainerById } from '../Nexus/treePatch'
import { type Slot, spliceBeside } from '../Nexus/order'
import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
import { contextWorldOf } from '../Contexts/contextResolve'
import type { ArtifactRecord, Place } from './record'
import { type BundleStore, storeOf } from './bundle'

interface Placement {
  dir: string
  finalName: string
  /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells).*/
  finalTitle?: string
}

/** The siblings it lands among, held as the tree holds them, and the one writer of their order. */
interface SiblingOrder {
  siblings: readonly { id: string }[]
  write: (root: string, ids: string[]) => Promise<unknown>
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
type Resolution = { place: Placement; order?: SiblingOrder } | { refuse: Refusal }

/** An id `byId` holds anywhere but inside the restoring bundle is live, and a twin (null) always is; only an archived page's own file sits inside its bundle, since the map holds no Set ids. */
const heldElsewhere = (held: EntityRecord | null | undefined, restoring: string): boolean =>
  held !== undefined && !(held && isAtOrUnder(held.path, restoring))

/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. Every name and title choice the tree can make is made here, and `freeOnDisk` steps it only past what the tree can't see.*/
export function resolveRecord(
  record: ArtifactRecord,
  baseName: string,
  tree: NexusTree,
  byId: NexusPages['byId'],
  restoring: string,
): Resolution {
  const recordId = record.entity === 'context' ? record.registry.id : record.id
  if (recordId && heldElsewhere(byId.get(recordId), restoring)) return { refuse: 'id-live' }

  if (record.entity === 'context') {
    const finalTitle = freeName(
      record.registry.title,
      tree.contexts.map((g) => g.def.title),
    )
    return { place: { dir: CONTEXTS_DIR_REL, finalName: finalTitle, finalTitle } }
  }

  if (record.entity === 'space') {
    const parent = record.parent
    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
    const group = contextWorldOf(tree.contexts).groupById.get(parent.id)
    if (!group) return { refuse: 'parent-gone' }
    const finalTitle = freeName(
      baseName,
      group.spaces.map((s) => s.title),
    )
    return {
      place: { dir: contextDirRel(group.def.title), finalName: finalTitle, finalTitle },
      order: {
        siblings: group.spaces,
        write: (root, ids) => setSpaceOrder(root, group.def.id, ids),
      },
    }
  }

  switch (record.parent.kind) {
    case 'unaddressable':
      return { refuse: 'unaddressable' }
    case 'context':
      return { refuse: 'cannot-hold' }
    case 'root': {
      if (record.entity !== 'collection') return { refuse: 'cannot-hold' }
      const finalName = freeName(
        baseName,
        tree.collections.map((c) => c.title),
      )
      return {
        place: { dir: '', finalName },
        order: { siblings: tree.collections, write: setCollectionOrder },
      }
    }
    case 'container': {
      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainerById(tree, record.parent.id)
      if (!parent)
        return byId.has(record.parent.id) ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [
        ...parent.pages.map((p) => p.title),
        ...(parent.sets ?? []).map((s) => s.title),
      ]
      const key = record.entity === 'page' ? 'page_order' : 'set_order'
      const order: SiblingOrder = {
        siblings: record.entity === 'page' ? parent.pages : (parent.sets ?? []),
        write: (root, ids) => setChildOrder(join(root, parent.path), key, ids),
      }
      if (record.entity === 'page') {
        const finalTitle = freeName(titleFromPath(baseName), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle }, order }
      }
      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) }, order }
    }
  }
}

const REFUSAL_TEXT: Record<Refusal, string> = {
  'parent-gone': 'The place this belonged to no longer exists.',
  'cannot-hold': 'The place this belonged to can no longer hold it.',
  unaddressable: 'Where this belonged was never recorded.',
  'id-live': 'Something in the nexus already carries this identity.',
}

export const NO_DESTINATION = 'That kind cannot be given a destination.'

function withDestination(
  record: ArtifactRecord,
  destination: Exclude<RestoreDestination, { kind: 'archive' }>,
  tree: NexusTree,
): Result<ArtifactRecord> {
  switch (record.entity) {
    case 'space':
      if (destination.kind !== 'context') return fail('invalid-path', 'A Space lives in a Context.')
      if (!contextWorldOf(tree.contexts).groupById.has(destination.id))
        return fail('not-found', 'That Context no longer exists.')
      return ok({ ...record, parent: { kind: 'context', id: destination.id }, place: undefined })
    case 'page':
    case 'set':
      if (destination.kind !== 'container')
        return fail('invalid-path', 'Pages and Sets live in Collections and Sets.')
      if (!findContainerById(tree, destination.id))
        return fail('not-found', 'That place no longer exists.')
      return ok({ ...record, parent: { kind: 'container', id: destination.id }, place: undefined })
    default:
      return fault(NO_DESTINATION)
  }
}

export function slotOf(
  place: Place | undefined,
  liveIds: readonly string[],
): { anchor: string | null; where: Slot } {
  if (place?.above && liveIds.includes(place.above)) return { anchor: place.above, where: 'above' }
  if (place?.below && liveIds.includes(place.below)) return { anchor: place.below, where: 'below' }
  return { anchor: null, where: place && !place.below ? 'first' : 'last' }
}

/** The tree's free title stepped further past what the disk holds there that the tree can't see — an outside file, an excluded folder, the asset directory — in the item's own form, so a restore lands beside it, never over it. */
async function freeOnDisk(
  root: string,
  entity: ArtifactRecord['entity'],
  { dir, finalName, finalTitle }: Placement,
): Promise<Result<Placement>> {
  const parent = join(root, dir)
  const leaf = (title: string): string => (entity === 'page' ? `${title}.md` : title)
  const taken = async (title: string): Promise<boolean> =>
    ((entity === 'collection' || entity === 'set') &&
      (await landingRefusal(root, parent, title)) !== null) ||
    (await pathExists(join(parent, leaf(title))))
  const named = await createDisambiguated(
    finalTitle ?? finalName,
    async (title) =>
      (await taken(title)) ? fail('exists', `"${title}" already exists.`) : ok(title),
    taken,
  )
  if (!named.ok) return named
  return ok({
    dir,
    finalName: leaf(named.value),
    ...(finalTitle === undefined ? {} : { finalTitle: named.value }),
  })
}

export async function placeRecord(
  root: string,
  stored: ArtifactRecord,
  destination: RestoreDestination | undefined,
  bundle: { abs: string; artifact: string },
  tree: NexusTree,
  byId: NexusPages['byId'],
): Promise<
  Result<{
    record: ArtifactRecord
    placement: Placement
    writeOrder?: () => Promise<unknown>
    landedAs?: string
    into?: BundleStore
  }>
> {
  const baseName = basename(bundle.artifact)
  const restoring = relative(root, bundle.abs)
  if (destination?.kind === 'archive') {
    if ((stored.entity !== 'page' && stored.entity !== 'set') || !stored.archive)
      return fault(NO_DESTINATION)
    // The bundle it names was removed, so no realpath answers for it; `join` collapses any `..` before the store's prefix test.
    const into = storeOf(root, join(root, stored.archive))
    if (into?.kind !== 'archive') return fault(NO_DESTINATION)
    if (stored.id && heldElsewhere(byId.get(stored.id), restoring))
      return fault(REFUSAL_TEXT['id-live'])
    return ok({
      record: stored,
      placement: {
        dir: stored.archive,
        finalName: baseName,
        ...(stored.entity === 'page' ? { finalTitle: titleFromPath(baseName) } : {}),
      },
      into,
    })
  }
  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
  if (!rehomed.ok) return rehomed
  const record = rehomed.value
  const resolution = resolveRecord(record, baseName, tree, byId, restoring)
  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
  const named = await freeOnDisk(root, record.entity, resolution.place)
  if (!named.ok) return named
  const placement = named.value
  const title = placement.finalTitle ?? placement.finalName
  const asked = record.entity === 'context' ? record.registry.title : titleFromPath(baseName)
  const landedAs = title === asked ? undefined : title
  const { order } = resolution
  if (record.entity === 'context' || !record.id || !order)
    return ok({ record, placement, landedAs })
  const ids = order.siblings.map((n) => n.id)
  const { anchor, where } = slotOf(record.place, ids)
  const next = spliceBeside(ids, anchor, record.id, where)
  return ok({ record, placement, landedAs, writeOrder: () => order.write(root, next) })
}
