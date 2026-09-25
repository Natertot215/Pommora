import { nexusConfig, nexusDir } from '../Paths/paths'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { fail, valueOr } from '../Contract/result'
import { readJsonStrict, writeJson } from '../Files/atomicWrite'
import { mergeKeys } from '../Files/jsonMerge'
import type { Json } from '../Files/stableJson'
import { machine } from '../Platform/machine'
import { isPlainObject } from './propertyValue'
import { propertyDefinition, type PropertyDefinition } from './properties'
import { resolveRowOrder } from './rowOrder'

export const NO_PROPERTY = fail('not-found', 'Property not found.')

export type PropertyRegistry = Record<string, PropertyDefinition>

type RegistryFile = { order: string[]; defs: PropertyRegistry }

const registryPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.properties)

function normalizeRegistry(obj: Record<string, unknown>): {
  registry: RegistryFile
  unparsed: Record<string, unknown>
} {
  const rawDefs = isPlainObject(obj.defs) ? obj.defs : {}
  const defs: PropertyRegistry = {}
  const unparsed: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(rawDefs)) {
    const parsed = propertyDefinition.safeParse(value)
    if (parsed.success) defs[id] = parsed.data
    // Only a plausible def (a plain object) rides through writes — a scalar under an id key is corrupt noise, and re-writing it is what would break the file-shape check above.
    else if (isPlainObject(value)) unparsed[id] = value
  }
  const order = [
    ...new Set(
      (Array.isArray(obj.order) ? obj.order : []).filter(
        (x): x is string => typeof x === 'string' && x in defs,
      ),
    ),
  ]
  return { registry: { order, defs }, unparsed }
}

async function readRegistryObject(root: string): Promise<Record<string, unknown>> {
  const read = await readJsonStrict(registryPath(root))
  if (!read.ok && read.error.code !== 'not-found') throw new Error(read.error.message)
  return valueOr(read, {})
}

export async function readRegistry(root: string): Promise<RegistryFile> {
  return normalizeRegistry(await readRegistryObject(root)).registry
}

export const orderedDefs = (reg: RegistryFile): PropertyDefinition[] =>
  resolveRowOrder(Object.entries(reg.defs), ([key]) => key, reg.order).map(([, d]) => d)

export function mutateRegistry<T>(
  root: string,
  fn: (registry: RegistryFile) => { next?: RegistryFile; result: T },
): Promise<T> {
  return machine().lock(registryPath(root), async () => {
    const raw = await readRegistryObject(root)
    const { registry, unparsed } = normalizeRegistry(raw)
    const { next, result } = fn(registry)
    if (next) {
      const rawDefs = isPlainObject(raw.defs) ? raw.defs : {}
      const defs: Record<string, unknown> = { ...unparsed }
      for (const [id, d] of Object.entries(next.defs)) {
        const stored = registry.defs[id]
        defs[id] = stored ? mergeKeys(stored, d, rawDefs[id] as Json, {}, () => 'local') : d
      }
      // Unparsed ids keep their order membership too, appended, so a repaired def re-lists rather than vanishing from the pane.
      const order = [
        ...next.order,
        ...Object.keys(unparsed).filter((id) => !next.order.includes(id)),
      ]
      await machine().mkdir(nexusDir(root))
      await writeJson(registryPath(root), { ...raw, order, defs })
    }
    return result
  })
}
