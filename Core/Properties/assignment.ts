import { clamp } from '@pommora/uix/Utilities/clamp'
import { isPlainObject } from './propertyValue'
import { moveItem } from '@pommora/uix/Utilities/moveItem'
import { join } from '../Paths/posix'
import { sidecarPath } from '../Paths/paths'
import { readJsonObject } from '../Files/atomicWrite'
import { patchSidecar } from '../Files/sidecar'
import { getLiveTree, refreshTree } from '../Nexus/liveTree'
import { NO_DEFS } from '../Contexts/contextResolve'
import { readRegistry } from './propertiesRegistry'
import type { PropertyDefinition } from './properties'
import { restoreCachedValues } from './removeProperty'
import { serializeSchemaOp } from './schemaChain'
import type { CollectionNode, SetNode } from '../Nexus/tree'
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
  const held = getLiveTree()
  if (held?.nexus.rootPath === root) {
    const node = held.collections.find((c) => join(root, c.path) === collectionFolder)
    if (node) return new Map((node.properties ?? []).map((d) => [d.name, d]))
  }
  const registry = (await readRegistry(root)).defs
  const assigned = assignedIds(await readJsonObject(sidecarPath(collectionFolder, 'collection')))
  return new Map(
    assigned.flatMap((id) => (registry[id] ? [[registry[id].name, registry[id]] as const] : [])),
  )
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

// A chained fn awaiting another chained fn would deadlock the schema chain, so these are unchained internals a chained op composes in its own slot.
export async function assignInner(
  root: string,
  collectionFolder: string,
  propertyId: string,
): Promise<Result<null>> {
  // Restore stays OUTSIDE the sidecar lock: it walks every member page, long enough that holding the lock would stall every sibling sidecar write.
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
): Promise<Result<null>> {
  return serializeSchemaOp(() => assignInner(root, collectionFolder, propertyId))
}

export function assignPropertyAt(
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
  const held = getLiveTree()
  const tree = held?.nexus.rootPath === root ? held : await refreshTree(root)
  const out: string[] = []
  const visit = (node: CollectionNode | SetNode): void => {
    if (node.kind === 'collection') out.push(join(root, node.path))
    for (const s of node.sets ?? []) visit(s)
  }
  for (const c of tree.collections) visit(c)
  return out
}

export async function collectionFolderOf(root: string, absFile: string): Promise<string | null> {
  return (await collectionFolders(root)).find((f) => absFile.startsWith(`${f}/`)) ?? null
}

export function reorderAssignment(
  collectionFolder: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return serializeSchemaOp(() => reorderInner(collectionFolder, propertyId, toIndex))
}
