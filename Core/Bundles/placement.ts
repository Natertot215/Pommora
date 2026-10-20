// Where a recorded artifact re-enters: the placement resolved against the CURRENT tree and stepped past what the disk holds, the order it lands in, or the refusal that says why it cannot be placed.

import { CONTEXTS_DIR_REL, contextDirRel } from '../Paths/nexusPaths'
import { join, titleFromPath } from '../Paths/posix'
import { createDisambiguated, freeName } from '../Paths/names'
import { pathExists } from '../Files/atomicWrite'
import { landingRefusal } from '../Nexus/folderEntity'
import { fail, fault, ok, type Result } from '../Contract/result'
import type { NexusTree } from '../Nexus/tree'
import type { RestoreDestination } from '../Nexus/mutateRequest'
import { recordById } from '../Nexus/record'
import { containerAt, contextAt, findContainerById } from '../Nexus/treePatch'
import { type Slot, spliceBeside } from '../Nexus/order'
import { setChildOrder, setCollectionOrder, setSpaceOrder } from '../Nexus/reorder'
import { contextWorldOf } from '../Contexts/contextResolve'
import type { Place, RecordFile } from './record'

interface Placement {
  dir: string
  finalName: string
  /** For a page, Space, or Context: the final title restore writes everywhere (folder, registry, re-applied membership keys, the links its arrival re-spells). Recorded titles are labels; this is the decision. */
  finalTitle?: string
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
type Resolution = { place: Placement } | { refuse: Refusal }

/** The property shape is artifact-less — there is nothing to place. */
export type ArtifactRecord = Exclude<RecordFile, { entity: 'property' }>

/** THE decision, against the CURRENT tree — a renamed parent resolves to its renamed path. Every name and title choice the tree can make is made here, and `freeOnDisk` steps it only past what the tree can't see. A live id refusal outranks every other answer — nothing may write over a living identity. */
export function resolveRecord(
  record: ArtifactRecord,
  baseName: string,
  tree: NexusTree,
): Resolution {
  const live = recordById(tree)
  const recordId = record.entity === 'context' ? record.registry.id : record.id
  if (recordId && live[recordId]) return { refuse: 'id-live' }

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
      return { place: { dir: '', finalName } }
    }
    case 'container': {
      if (record.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainerById(tree, record.parent.id)
      if (!parent)
        return live[record.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [
        ...parent.pages.map((p) => p.title),
        ...(parent.sets ?? []).map((s) => s.title),
      ]
      if (record.entity === 'page') {
        const finalTitle = freeName(titleFromPath(baseName), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md`, finalTitle } }
      }
      return { place: { dir: parent.path, finalName: freeName(baseName, siblings) } }
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
  destination: RestoreDestination,
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

function siblingOrder(
  root: string,
  record: Exclude<ArtifactRecord, { entity: 'context' }>,
  dir: string,
  tree: NexusTree,
): { ids: string[]; write: (order: string[]) => Promise<unknown> } | null {
  switch (record.entity) {
    case 'collection':
      return { ids: tree.collections.map((c) => c.id), write: (o) => setCollectionOrder(root, o) }
    case 'space': {
      const group = contextAt(tree, dir)
      return group
        ? { ids: group.spaces.map((s) => s.id), write: (o) => setSpaceOrder(root, group.def.id, o) }
        : null
    }
    case 'page':
    case 'set': {
      const parent = containerAt(tree, dir)
      const key = record.entity === 'page' ? 'page_order' : 'set_order'
      const children = record.entity === 'page' ? parent?.pages : parent?.sets
      return children
        ? { ids: children.map((n) => n.id), write: (o) => setChildOrder(join(root, dir), key, o) }
        : null
    }
  }
}

/** The tree's free title stepped further past what the disk holds there that the tree can't see — an outside file, an excluded folder, the asset directory, either form of the one name a page and a Set share — so a restore lands beside it, never over it. */
async function freeOnDisk(
  root: string,
  entity: ArtifactRecord['entity'],
  { dir, finalName, finalTitle }: Placement,
): Promise<Result<Placement>> {
  const parent = join(root, dir)
  const leaf = (title: string): string => (entity === 'page' ? `${title}.md` : title)
  const forms = (title: string): string[] =>
    entity === 'page' || entity === 'set' ? [title, `${title}.md`] : [title]
  const taken = async (title: string): Promise<boolean> =>
    ((entity === 'collection' || entity === 'set') &&
      (await landingRefusal(root, parent, title)) !== null) ||
    (await Promise.all(forms(title).map((name) => pathExists(join(parent, name))))).includes(true)
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
  baseName: string,
  tree: NexusTree,
): Promise<
  Result<{
    record: ArtifactRecord
    placement: Placement
    writeOrder?: () => Promise<unknown>
    landedAs?: string
  }>
> {
  const rehomed = destination ? withDestination(stored, destination, tree) : ok(stored)
  if (!rehomed.ok) return rehomed
  const record = rehomed.value
  const resolution = resolveRecord(record, baseName, tree)
  if ('refuse' in resolution) return fault(REFUSAL_TEXT[resolution.refuse])
  const named = await freeOnDisk(root, record.entity, resolution.place)
  if (!named.ok) return named
  const placement = named.value
  const title = placement.finalTitle ?? placement.finalName
  const landedAs = title === titleFromPath(baseName) ? undefined : title
  if (record.entity === 'context' || !record.id) return ok({ record, placement, landedAs })
  const siblings = siblingOrder(root, record, placement.dir, tree)
  if (!siblings) return ok({ record, placement, landedAs })
  const { anchor, where } = slotOf(record.place, siblings.ids)
  const order = spliceBeside(siblings.ids, anchor, record.id, where)
  return ok({ record, placement, landedAs, writeOrder: () => siblings.write(order) })
}
