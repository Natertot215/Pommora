import { mkdir } from 'node:fs/promises'
import { nexusConfig, nexusDir, NEXUS_CONFIG_FILES } from '../paths'
import { readJsonObject, readJsonStrict, writeJson } from './atomicWrite'
import { serializeOnFile } from './fileLock'
import { isPlainObject } from '@shared/propertyValue'
import { propertyDefinition, type PropertyDefinition } from '@shared/properties'

/** propId → its nexus-wide definition. The shared registry, `.nexus/properties.json`. */
export type PropertyRegistry = Record<string, PropertyDefinition>

/** The on-disk registry file: defs + the nexus-wide cosmetic order. */
export type RegistryFile = { order: string[]; defs: PropertyRegistry }

const registryPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.properties)

/** Normalize a raw registry object: a legacy bare-Record file reads as `{ order: [], defs }`;
 *  plain-object entries that fail the def schema land in `unparsed` (raw, by id) instead of
 *  the defs map, and the order is element-filtered — non-strings and ids without defs dropped. */
function normalizeRegistry(obj: Record<string, unknown>): {
  registry: RegistryFile
  unparsed: Record<string, unknown>
} {
  // File-shape iff `defs` is a plain object AND `order` is an array — both keys our writer
  // always emits. A legacy bare-Record can collide on one but never both-with-these-shapes;
  // no per-VALUE check belongs here, since that's what let one junk entry misclassify a whole
  // real file as legacy.
  const fileShape: { defs: Record<string, unknown>; order: unknown[] } | null =
    isPlainObject(obj.defs) && Array.isArray(obj.order)
      ? { defs: obj.defs, order: obj.order }
      : null
  const rawDefs = fileShape ? fileShape.defs : obj
  const defs: PropertyRegistry = {}
  const unparsed: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(rawDefs)) {
    const parsed = propertyDefinition.safeParse(value)
    if (parsed.success) defs[id] = parsed.data
    // Only a plausible def (a plain object) rides through writes — a scalar under an id key
    // is corrupt noise, and re-writing it is what would break the file-shape check above.
    else if (isPlainObject(value)) unparsed[id] = value
  }
  const order = (fileShape?.order ?? []).filter(
    (x): x is string => typeof x === 'string' && x in defs,
  )
  return { registry: { order, defs }, unparsed }
}

/** Lenient read: absent / corrupt → empty. READ PATH ONLY — `mutateRegistry` below does its
 *  own strict read, so a transiently-unreadable file can never feed a write. */
export async function readRegistry(root: string): Promise<RegistryFile> {
  const obj = await readJsonObject(registryPath(root))
  if (obj === null) return { order: [], defs: {} }
  return normalizeRegistry(obj).registry
}

/** Every def in the nexus-wide cosmetic order — order-listed first, unlisted appended. ONE
 *  ordering rule, so a consumer never re-derives it. */
export function orderedDefs(reg: RegistryFile): PropertyDefinition[] {
  const listed = new Set(reg.order)
  return [
    ...reg.order.map((id) => reg.defs[id]),
    ...Object.entries(reg.defs)
      .filter(([key]) => !listed.has(key))
      .map(([, d]) => d),
  ]
}

/** Overwrite the whole registry file — module-private, so every write rides `mutateRegistry` and
 *  therefore the registry file's lock (a bare write outside it can lose a concurrent mutation's
 *  update). */
async function writeRegistry(
  root: string,
  registry: { order: string[]; defs: Record<string, unknown> },
): Promise<void> {
  await mkdir(nexusDir(root), { recursive: true })
  await writeJson(registryPath(root), registry)
}

/** Read-modify-write of the registry, under that file's own lock. `fn` returns the next registry
 *  to persist (or nothing to leave disk untouched) plus the caller's result. The read is strict:
 *  absent seeds an empty registry, unreadable/corrupt throws, so the file is never replaced by
 *  what a failed read pretended it held. Entries that don't parse as defs ride through the write
 *  untouched, by id — `fn` never sees them, so it can never drop them. */
export function mutateRegistry<T>(
  root: string,
  fn: (registry: RegistryFile) => { next?: RegistryFile; result: T },
): Promise<T> {
  return serializeOnFile(registryPath(root), async () => {
    const read = await readJsonStrict(registryPath(root))
    if (!read.ok && read.error.code !== 'not-found') throw new Error(read.error.message)
    const { registry, unparsed } = normalizeRegistry(read.ok ? read.value : {})
    const { next, result } = fn(registry)
    if (next) {
      const defs: Record<string, unknown> = { ...next.defs }
      for (const [id, raw] of Object.entries(unparsed)) if (!(id in defs)) defs[id] = raw
      // Unparsed ids keep their order membership too, appended, so a repaired def re-lists
      // rather than vanishing from the pane.
      const order = [
        ...next.order,
        ...Object.keys(unparsed).filter((id) => !next.order.includes(id)),
      ]
      await writeRegistry(root, { order, defs })
    }
    return result
  })
}
