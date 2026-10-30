import { clamp } from '@pommora/uix/Utilities/clamp'
import { placeAt } from '@pommora/uix/Utilities/moveItem'
import { isAtOrUnder, relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { trashedOwners } from '../Bundles/bundle'
import { storeOf } from '../Paths/bundleLayout'
import { patchSidecar } from '../Files/sidecar'
import { stashedBlock, patchStashBlock } from './propertyStash'
import { liveTreeOf } from '../Nexus/liveTree'
import { assignedIds } from '../Nexus/containerFields'
import { linkWorld, nexusPages } from '../Nexus/heldPages'
import type { CascadeReport } from '../Nexus/cascade'
import { distinct, propertyNote, runNoted } from '../Nexus/owed'
import { containerAt, owningCollection } from '../Nexus/treePatch'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import type { PropertyDraft } from './properties'
import { createProperty, removeFromRegistry } from './registryProperty'
import { parkLinks } from '../Trash/trashedCopies'
import { partitionGone, refillValues } from '../Nexus/governedSweep'
import { ok, fail, type Result } from '../Contract/result'
import type { MutateReply } from '../Nexus/mutateRequest'
import { exactTitle } from '../Paths/caseFold'

/** Puts the values the Collection at `folder` stashes for `propertyId` back on its pages, trashed ones among them, wherever the property reads blank, keeping only what it still owes them; answers how many it couldn't write. */
export async function refillStash(
  root: string,
  folder: string,
  propertyId: string,
  collectionId: string,
): Promise<number> {
  const tree = await liveTreeOf(root)
  const stash = stashedBlock(await readJsonObject(sidecarPath(folder, 'collection')), propertyId)
  if (!stash) return 0
  // No readable definition → the stash stays whole: a def that reappears later still finds everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return 0
  const { values } = stash
  const { byId, archived } = await nexusPages(root, tree)
  const trashed = Object.keys(values).some(
    (id) => storeOf(byId.get(id)?.path ?? '')?.store.kind === 'trash',
  )
    ? await trashedOwners(root, tree)
    : undefined
  const members = new Map(
    Object.keys(values).flatMap((id) => {
      const r = byId.get(id)
      return r?.kind === 'page' && owningCollection(tree, r.path, trashed)?.id === collectionId
        ? [[id, r] as const]
        : []
    }),
  )
  // A page the tree couldn't read under the Collection could be any id it can't place, so while one is, those stay owed.
  const unread = tree.unreadable?.some((u) => isAtOrUnder(u.path, relative(root, folder)))
  const unfound = unread ? Object.keys(values).filter((id) => !byId.has(id)) : []
  const world = linkWorld(tree, archived)
  // A stashed Link naming a page gone leaves the stash: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
  const held = Object.fromEntries([...members.keys()].map((id) => [id, values[id]]))
  const { gone } = partitionGone(def, held, world, stash.above)
  const { taken, skipped } = await refillValues(root, def, members, values, world, stash.above)
  await parkLinks(root, gone)
  const owed = new Set([...members.keys()].filter((id) => !taken.has(id)).concat(unfound))
  for (const { page } of gone) owed.delete(page)
  const written = await patchSidecar(folder, 'collection', (cur) => {
    const block = stashedBlock(cur, propertyId)
    const left = Object.entries(block?.values ?? {}).filter(([id]) => owed.has(id))
    return block && patchStashBlock(cur, propertyId, { ...block, values: Object.fromEntries(left) })
  })
  return skipped + unfound.length + (written.ok ? 0 : 1)
}

// The schema lock rejects a re-taken lock, so these are unwrapped internals a wrapped op composes inside its own hold.
export async function assignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<CascadeReport | undefined>> {
  const collectionId = containerAt(await liveTreeOf(root), relative(root, collectionFolder))?.id
  if (collectionId === undefined) return fail('not-found', 'Unknown Collection.')
  // A re-add on the runner, as a Remove is: the Collection is noted before the assignment, so a refill a crash cuts short or a page it can't write is owed, and Try Again refills it from the stash. The refill stays OUTSIDE the sidecar lock: it rewrites every page it fills, long enough that holding the lock would stall every sibling sidecar write.
  let appended = false
  const ran = await runNoted(root, propertyId, {
    note: (e) => ({
      ...propertyNote(e),
      collections: distinct(propertyNote(e).collections, [collectionId]),
    }),
    list: () =>
      patchSidecar(collectionFolder, 'collection', (cur) => {
        const ids = assignedIds(cur)
        if (ids.includes(propertyId)) return null
        appended = true
        return { ...cur, properties: [...ids, propertyId] }
      }),
    sweep: async () => ({
      skipped: appended ? await refillStash(root, collectionFolder, propertyId, collectionId) : 0,
      hosts: [],
    }),
    settle: (e) => ({
      ...propertyNote(e),
      collections: propertyNote(e).collections?.filter((c) => c !== collectionId),
    }),
    under: propertyId,
  })
  return ran.ok ? ok(ran.value.cascade.warning ? ran.value.cascade : undefined) : ran
}

/** `toIndex` counts the assigned ids the registry holds, as the pane lists them; an id it no longer holds stays where it sits. */
async function reorderInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  const { defs } = await readRegistry(root)
  const written = await patchSidecar(collectionFolder, 'collection', (cur, refuse) => {
    const ids = assignedIds(cur)
    const from = ids.indexOf(propertyId)
    if (from < 0) return refuse(fail('not-found', 'Property not assigned.'))
    const others = ids.filter((id) => id !== propertyId && id in defs)
    const next = others[clamp(toIndex, 0, others.length)]
    const at = next === undefined ? ids.length : ids.indexOf(next)
    return { ...cur, properties: placeAt(ids, from, at, () => propertyId) }
  })
  return written.ok ? ok(null) : written
}

export function assignProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex?: number,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const a = await assignInner(root, collectionFolder, propertyId)
    if (!a.ok) return a
    if (toIndex !== undefined) {
      const moved = await reorderInner(root, collectionFolder, propertyId, toIndex)
      if (!moved.ok) return moved
    }
    return ok(a.value ? { cascade: a.value } : {})
  })
}
/** A new property lands created and assigned in one hold of the schema lock, and a failed assign takes the create back inside it. */
export function addProperty(
  root: string,
  collectionFolder: string,
  draft: PropertyDraft,
): Promise<MutateReply> {
  return serializeSchemaOp(root, async () => {
    const created = await createProperty(root, draft)
    if (!created.ok) return created
    const { id } = created.value
    const assigned = await assignInner(root, collectionFolder, id)
    if (!assigned.ok) {
      await removeFromRegistry(root, id)
      return assigned
    }
    const { label } = created.value
    return ok({
      created: { propertyId: id },
      ...(label === exactTitle(draft.label) ? {} : { landedAs: label }),
    })
  })
}

export function reorderAssignment(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(root, () => reorderInner(root, collectionFolder, propertyId, toIndex))
}
