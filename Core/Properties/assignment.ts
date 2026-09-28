import { clamp } from '@pommora/uix/Utilities/clamp'
import { isPlainObject } from '../Contract/validators'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { join, relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { noteSidecarWrite } from '../Nexus/valuesChanged'
import type { CollectionNode } from '../Nexus/tree'
import { projectBaseline } from '../Nexus/remintLedger'
import type { EntityRecord } from '../Nexus/record'
import { NO_DEFS } from '../Contexts/contextResolve'
import { readRegistry } from './propertiesRegistry'
import type { PropertyDefinition } from './properties'
import {
  encodeValue,
  type Frozen,
  isBlankValue,
  namesGonePage,
  reconcilePropertyValue,
} from './propertyValue'
import { parkLinks, restoreWorld } from '../Trash/holdings'
import { sweepRootsById } from './governedSweep'
import { serializeSchemaOp } from './schemaChain'
import { ok, fail, type Result } from '../Contract/result'

export const assignedIds = (raw: Record<string, unknown> | null): string[] =>
  Array.isArray(raw?.properties)
    ? raw.properties.filter((id): id is string => typeof id === 'string')
    : []

export async function assignedDefs(
  root: string,
  collectionFolder: string | null,
): Promise<ReadonlyMap<string, PropertyDefinition>> {
  if (collectionFolder === null) return NO_DEFS
  const held = heldTreeOf(root)
  if (held) {
    const node = held.collections.find((c) => join(root, c.path) === collectionFolder)
    if (node) return new Map((node.properties ?? []).map((d) => [d.name, d]))
  }
  const registry = (await readRegistry(root)).defs
  const assigned = assignedIds(await readJsonObject(sidecarPath(collectionFolder, 'collection')))
  return new Map(
    assigned.flatMap((id) => (registry[id] ? [[registry[id].name, registry[id]] as const] : [])),
  )
}

export function cachedValues(
  sidecar: Record<string, unknown> | null,
  propertyId: string,
): Record<string, unknown> | null {
  const block = isPlainObject(sidecar?.property_cache) ? sidecar.property_cache[propertyId] : null
  return isPlainObject(block) && isPlainObject(block.values) ? block.values : null
}

// The one writer of a sidecar's `property_cache` block — an absent block value removes the entry, and an emptied cache leaves no key behind.
export function patchCacheBlock(
  sidecar: Record<string, unknown>,
  propertyId: string,
  blockValue?: Record<string, unknown>,
): Record<string, unknown> {
  const cache = { ...(isPlainObject(sidecar.property_cache) ? sidecar.property_cache : {}) }
  if (blockValue) cache[propertyId] = blockValue
  else delete cache[propertyId]
  const next: Record<string, unknown> = { ...sidecar }
  if (Object.keys(cache).length) next.property_cache = cache
  else delete next.property_cache
  return next
}

/** Edits the values each Collection the tree lists as caching one of `propertyIds` holds, through `edit`, which answers a block's next values or null to leave it; answers how many sidecars it couldn't edit. */
export async function editCaches(
  root: string,
  collections: readonly CollectionNode[],
  propertyIds: ReadonlySet<string>,
  edit: (values: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<number> {
  let skipped = 0
  for (const node of collections) {
    const ids = (node.cached ?? []).filter((id) => propertyIds.has(id))
    if (!ids.length) continue
    const folder = join(root, node.path)
    let wrote = false
    const written = await patchSidecar(folder, 'collection', (cur) => {
      let next: Record<string, unknown> | null = null
      for (const id of ids) {
        const values = cachedValues(next ?? cur, id)
        const edited = values && edit(values)
        if (edited)
          next = patchCacheBlock(
            next ?? cur,
            id,
            Object.keys(edited).length ? { values: edited } : undefined,
          )
      }
      wrote = next !== null
      return next
    }).catch(() => null)
    if (!written?.ok) skipped++
    else if (wrote) noteSidecarWrite(folder)
  }
  return skipped
}

/** Puts each value `frozen` still admits back on the page or Space its ID names wherever that root holds none, and answers the IDs that took theirs. */
export function refillValues(
  root: string,
  def: PropertyDefinition,
  roots: Record<string, EntityRecord>,
  values: Record<string, unknown>,
  frozen: Frozen,
): Promise<Set<string>> {
  return sweepRootsById(root, roots, values, (raw, value) => {
    const restored = reconcilePropertyValue(def, value, frozen).value
    const encoded = isBlankValue(restored) ? undefined : encodeValue(restored)
    if (encoded === undefined) return null
    if (!isBlankValue(reconcilePropertyValue(def, raw[def.name], {}).value)) return null
    return { ...raw, [def.name]: encoded }
  })
}

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
  const under = `${relative(root, collectionFolder)}/`
  const tree = await liveTreeOf(root)
  const live = projectBaseline(tree).entries
  const members = Object.fromEntries(
    Object.keys(cached).flatMap((id) =>
      live[id]?.kind === 'page' && live[id].path.startsWith(under) ? [[id, live[id]]] : [],
    ),
  )
  const frozen = await restoreWorld(root, tree)
  // A cached Link naming a page gone leaves the cache: one whose page the Trash holds joins its bundle, one naming nothing is dropped.
  const gone =
    def.type === 'link'
      ? Object.keys(members).filter((id) => namesGonePage(cached[id], frozen))
      : []
  const spent = await refillValues(root, def, members, cached, frozen)
  await parkLinks(
    root,
    gone.map((id) => ({ page: id, property: propertyId, value: String(cached[id]) })),
  )
  const written = await patchSidecar(collectionFolder, 'collection', (cur) => {
    const left = { ...(cachedValues(cur, propertyId) ?? {}) }
    for (const id of [...spent, ...gone]) delete left[id]
    return patchCacheBlock(cur, propertyId, Object.keys(left).length ? { values: left } : undefined)
  })
  return written.ok ? ok(null) : written
}

// A chained fn awaiting another chained fn would deadlock the schema chain, so these are unchained internals a chained op composes in its own slot.
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
  return serializeSchemaOp(async () => {
    const a = await assignInner(root, collectionFolder, propertyId)
    if (!a.ok || toIndex === undefined) return a
    return reorderInner(collectionFolder, propertyId, toIndex)
  })
}

export async function collectionFolders(root: string): Promise<string[]> {
  return (await liveTreeOf(root)).collections.map((c) => join(root, c.path))
}

export const collectionFolderOf = (folders: string[], absFile: string): string | null =>
  folders.find((f) => absFile.startsWith(`${f}/`)) ?? null

export function reorderAssignment(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(() => reorderInner(collectionFolder, propertyId, toIndex))
}
