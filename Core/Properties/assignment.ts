import { clamp } from '@pommora/uix/Utilities/clamp'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { join, relative } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { cachedValues, patchCacheBlock } from './propertyCache'
import { heldTreeOf, liveTreeOf } from '../Nexus/liveTree'
import { type EntityRecord, recordById } from '../Nexus/record'
import { damagedFolders } from '../Nexus/treePatch'
import { readRegistry, serializeSchemaOp } from './propertiesRegistry'
import { byFoldedName, type PropertyDefinition } from './properties'
import { readLiveSetting } from '../Settings/settings'
import {
  encodeValue,
  type Frozen,
  heldSpelling,
  isBlankValue,
  namesGonePage,
  reconcilePropertyValue,
} from './propertyValue'
import { parkLinks } from '../Trash/holdings'
import { frozenWorld } from '../Nexus/heldPages'
import { landValue, sweepRootsById } from './governedSweep'
import { writeTarget } from './governedWrite'
import { heldValue } from './pageValue'
import { ok, fail, type Result } from '../Contract/result'

export const assignedIds = (raw: Record<string, unknown> | null): string[] =>
  Array.isArray(raw?.properties)
    ? raw.properties.filter((id): id is string => typeof id === 'string')
    : []

export async function assignedDefs(
  root: string,
  collectionFolder: string | null,
): Promise<ReadonlyMap<string, PropertyDefinition>> {
  if (collectionFolder === null) return new Map()
  const held = heldTreeOf(root)
  if (held) {
    const node = held.collections.find((c) => join(root, c.path) === collectionFolder)
    if (node) return byFoldedName(node.properties ?? [])
  }
  const registry = (await readRegistry(root)).defs
  const assigned = assignedIds(await readJsonObject(sidecarPath(collectionFolder, 'collection')))
  return byFoldedName(assigned.flatMap((id) => registry[id] ?? []))
}

/** Puts each value `frozen` still admits back on the page or Space its ID names wherever that root holds none, and answers the IDs that took theirs. */
export async function refillValues(
  root: string,
  def: PropertyDefinition,
  roots: Record<string, EntityRecord>,
  values: Record<string, unknown>,
  frozen: Frozen,
): Promise<Set<string>> {
  const resolveCase = await readLiveSetting(root, 'resolveCaseConflicts')
  return sweepRootsById(root, roots, values, (raw, value) => {
    const restored = reconcilePropertyValue(def, value, frozen).value
    const encoded = isBlankValue(restored) ? undefined : encodeValue(restored)
    if (encoded === undefined) return null
    if (!isBlankValue(reconcilePropertyValue(def, heldValue(raw, def.name, false), {}).value))
      return null
    return landValue(
      raw,
      writeTarget(raw, def.name, resolveCase),
      resolveCase ? encoded : heldSpelling(encoded, value),
    )
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
  const live = recordById(tree)
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

export async function collectionFolders(root: string): Promise<string[]> {
  const tree = await liveTreeOf(root)
  const damaged = damagedFolders(tree.unreadable).filter((u) => u.kind === 'collection')
  return [...tree.collections, ...damaged].map((c) => join(root, c.path))
}

export function reorderAssignment(
  root: string,
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(root, () => reorderInner(collectionFolder, propertyId, toIndex))
}
