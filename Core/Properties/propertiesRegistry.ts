import { nexusConfig, nexusDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { fail, valueOr } from '../Contract/result'
import { readJsonStrict, readKept, updateNexusFile } from '../Files/atomicWrite'
import { cachedParse } from '../Files/walkCache'
import { mergeKeys } from '../Files/jsonMerge'
import type { Json } from '../Files/stableJson'
import { isPlainObject } from '../Contract/validators'
import { PROPERTY_TYPES, propertyDefinition, type PropertyDefinition } from './properties'
import { resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
import { admissible, validateName, withUniqueOptions } from './validation'

export const NO_PROPERTY = fail('not-found', 'Property not found.')

export type PropertyRegistry = Record<string, PropertyDefinition>

type RegistryFile = { order: string[]; defs: PropertyRegistry }

const registryPath = (root: string): string => nexusConfig(root, NEXUS_CONFIG_FILES.properties)

function normalizeRegistry(obj: Record<string, unknown>): {
  registry: RegistryFile
  unadmitted: Record<string, unknown>
} {
  const rawDefs = isPlainObject(obj.defs) ? obj.defs : {}
  const defs: PropertyRegistry = {}
  const unadmitted: Record<string, unknown> = {}
  for (const id of Object.keys(rawDefs).sort()) {
    const value = rawDefs[id]
    const parsed = propertyDefinition.safeParse(value)
    // The first definition by id to hold a label or a key in any casing is the one admitted.
    if (
      parsed.success &&
      admissible(parsed.data) &&
      validateName(parsed.data, Object.values(defs)).ok
    )
      defs[id] = withUniqueOptions(parsed.data)
    // Only a plausible def (a plain object) rides through writes; a scalar under an id key is corrupt noise.
    else if (isPlainObject(value)) unadmitted[id] = value
  }
  const order = [
    ...new Set(
      (Array.isArray(obj.order) ? obj.order : []).filter(
        (x): x is string => typeof x === 'string' && x in defs,
      ),
    ),
  ]
  return { registry: { order, defs }, unadmitted }
}

export const registryFrom = (raw: Record<string, unknown>): RegistryFile =>
  normalizeRegistry(raw).registry

export async function readRegistry(root: string): Promise<RegistryFile> {
  const path = registryPath(root)
  return cachedParse(path, async () => {
    const read = await readJsonStrict(path)
    if (!read.ok && read.error.code !== 'not-found') throw new Error(read.error.message)
    return registryFrom(valueOr(read, {}))
  })
}

/** A read that writes no definition: a damaged file reads as its last parse, and as null when this session never saw it parse. Every reader that gates a registry write stays strict. */
export async function readKeptRegistry(root: string): Promise<RegistryFile | null> {
  const raw = await readKept(registryPath(root)).catch(() => undefined)
  return raw === undefined ? null : registryFrom(raw ?? {})
}

export const orderedDefs = (reg: RegistryFile): PropertyDefinition[] =>
  resolveRowOrder(Object.entries(reg.defs), ([key]) => key, reg.order).map(([, d]) => d)

export const registryOf = (defs: PropertyDefinition[]): PropertyRegistry =>
  Object.fromEntries(defs.map((d) => [d.id, d]))

export const linkDefsOf = (defs: readonly PropertyDefinition[]): PropertyDefinition[] =>
  defs.filter((d) => PROPERTY_TYPES[d.type].connections === 'value')

const OPTION_KEYS = ['select_options', 'status_groups'] as const

function rebuiltOptions(
  stored: PropertyDefinition,
  next: PropertyDefinition,
): Partial<PropertyDefinition> {
  return Object.fromEntries(
    OPTION_KEYS.filter((key) => key in next && next[key] !== stored[key]).map((key) => [
      key,
      next[key],
    ]),
  )
}

export async function mutateRegistry<T>(
  root: string,
  fn: (registry: RegistryFile) => { next?: RegistryFile; result: T },
): Promise<T> {
  let result!: T
  const written = await updateNexusFile(
    registryPath(root),
    (raw) => {
      const { registry, unadmitted } = normalizeRegistry(raw)
      const rawDefs = isPlainObject(raw.defs) ? raw.defs : {}
      const edit = fn(registry)
      result = edit.result
      const next = edit.next
      if (!next) return null
      const defs: Record<string, unknown> = { ...unadmitted }
      for (const [id, d] of Object.entries(next.defs)) {
        const stored = registry.defs[id]
        defs[id] = stored
          ? {
              ...mergeKeys(stored, d, rawDefs[id] as Json, {}, () => 'local'),
              ...rebuiltOptions(stored, d),
              ...(d.key !== stored.key ? { label: d.label } : {}),
            }
          : d
      }
      // Unadmitted ids keep their order membership too, appended, so a repaired def re-lists rather than vanishing from the pane.
      const order = [
        ...next.order,
        ...Object.keys(unadmitted).filter((id) => !next.order.includes(id)),
      ]
      return { ...raw, order, defs }
    },
    false,
  )
  if (!written.ok) throw new Error(written.error.message)
  return result
}

// Every op that writes the registry or a schema sidecar takes the `.nexus` folder's lock once, at its entry, so none lands inside another's cascade; the lock rejects a re-take, so a step a held op composes, a create, an assign, or a removal, takes none.
export const serializeSchemaOp = <T>(root: string, fn: () => Promise<T>): Promise<T> =>
  machine().lock(nexusDir(root), fn)
