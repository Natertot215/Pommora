import { clamp } from '@pommora/uix/Utilities/clamp'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { cachedValues, patchCacheBlock } from './propertyCache'
import { liveTreeOf } from '../Nexus/liveTree'
import { assignedIds } from '../Nexus/containerFields'
import { linkWorld, nexusPages } from '../Nexus/heldPages'
import { owningCollection } from '../Nexus/treePatch'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { PROPERTY_TYPES, type PropertyDraft } from './properties'
import { createProperty, removeFromRegistry } from './registryProperty'
import { gonePageEntry } from '../Nexus/governedRoot'
import { frozenWorld, parkLinks } from '../Trash/trashedCopies'
import { refillValues } from '../Nexus/governedSweep'
import { ok, fail, type Result } from '../Contract/result'
import type { MutateReply } from '../Nexus/mutateRequest'
import { exactTitle } from '../Paths/caseFold'

async function restoreCachedValues(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  const cached = cachedValues(
    await readJsonObject(sidecarPath(collectionFolder, 'collection')),
    propertyId,
  )
  if (!cached) return ok(null)

  // No readable definition → the cache stays whole: a def that reappears later still finds everything waiting.
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return ok(null)
  const rel = relative(root, collectionFolder)
  const tree = await liveTreeOf(root)
  const { byId, archived } = await nexusPages(root, tree)
  const members = new Map(
    Object.keys(cached).flatMap((id) => {
      const r = byId.get(id)
      return r?.kind === 'page' && owningCollection(tree, r.path)?.path === rel
        ? [[id, r] as const]
        : []
    }),
  )
  const frozen = frozenWorld(linkWorld(tree, archived))
  // A cached Link naming a page gone leaves the cache: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
  const gone =
    PROPERTY_TYPES[def.type].connections === 'value'
      ? [...members.keys()].flatMap((id) => {
          const entry = gonePageEntry(cached[id], frozen)
          return entry === null ? [] : [{ page: id, property: propertyId, value: entry }]
        })
      : []
  const spent = await refillValues(root, def, members, cached, frozen)
  await parkLinks(root, gone)
  const written = await patchSidecar(collectionFolder, 'collection', (cur) => {
    const left = { ...(cachedValues(cur, propertyId) ?? {}) }
    for (const id of [...spent, ...gone.map((g) => g.page)]) delete left[id]
    return patchCacheBlock(cur, propertyId, Object.keys(left).length ? { values: left } : undefined)
  })
  return written.ok ? ok(null) : written
}

// The schema lock rejects a re-taken lock, so these are unwrapped internals a wrapped op composes inside its own hold.
export async function assignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  // Restore stays OUTSIDE the sidecar lock: it rewrites every page it fills, long enough that holding the lock would stall every sibling sidecar write.
  let appended = false
  const written = await patchSidecar(collectionFolder, 'collection', (cur) => {
    const ids = assignedIds(cur)
    if (ids.includes(propertyId)) return null
    appended = true
    return { ...cur, properties: [...ids, propertyId] }
  })
  if (!written.ok) return written
  if (!appended) return ok(null)
  return restoreCachedValues(root, collectionFolder, propertyId)
}

async function reorderInner(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  const written = await patchSidecar(collectionFolder, 'collection', (cur, refuse) => {
    const ids = assignedIds(cur)
    const from = ids.indexOf(propertyId)
    if (from < 0) return refuse(fail('not-found', 'Property not assigned.'))
    return { ...cur, properties: moveItem(ids, from, clamp(toIndex, 0, ids.length - 1)) }
  })
  return written.ok ? ok(null) : written
}

export function assignProperty(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex?: number,
): Promise<Result<null>> {
  return serializeSchemaOp(root, async () => {
    const a = await assignInner(root, collectionFolder, propertyId)
    if (!a.ok || toIndex === undefined) return a
    return reorderInner(collectionFolder, propertyId, toIndex)
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
  return serializeSchemaOp(root, () => reorderInner(collectionFolder, propertyId, toIndex))
}
