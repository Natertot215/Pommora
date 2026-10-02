import { clamp } from '@pommora/uix/Utilities/clamp'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { join, relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { cachedValues, patchCacheBlock } from './propertyCache'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { projectBaseline } from '../Nexus/remintLedger'
import { damagedFolders } from '../Nexus/treePatch'
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
import { parkLinks } from '../Trash/holdings'
import { frozenWorld } from '../Nexus/heldPages'
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
  const frozen = frozenWorld(tree)
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
  const tree = await liveTreeOf(root)
  const damaged = damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection')
  return [...tree.collections, ...damaged].map((c) => join(root, c.path))
}

export function reorderAssignment(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(() => reorderInner(collectionFolder, propertyId, toIndex))
}
