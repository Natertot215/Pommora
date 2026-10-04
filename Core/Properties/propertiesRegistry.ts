import { nexusConfig, nexusDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { NEXUS_CONFIG_FILES } from '../Paths/nexusPaths'
import { fail, valueOr } from '../Contract/result'
import { readJsonStrict, readKept, updateNexusFile } from '../Files/atomicWrite'
import { mergeKeys } from '../Files/jsonMerge'
import type { Json } from '../Files/stableJson'
import { isPlainObject } from '../Contract/validators'
import { propertyDefinition, type PropertyDefinition } from './properties'
import { resolveRowOrder } from './rowOrder'
import { keyRefusal, withUniqueOptions } from './schema'
import { normalizeTitle } from '../Connections/connections'

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
  const names = new Set<string>()
  for (const [id, value] of Object.entries(rawDefs)) {
    const parsed = propertyDefinition.safeParse(value)
    const name = parsed.success ? normalizeTitle(parsed.data.name) : ''
    // A name is one key on disk, so the first definition to hold it in any casing is the one admitted.
    if (parsed.success && keyRefusal(parsed.data.name) === null && !names.has(name)) {
      names.add(name)
      defs[id] = withUniqueOptions(parsed.data)
    }
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
  const read = await readJsonStrict(registryPath(root))
  if (!read.ok && read.error.code !== 'not-found') throw new Error(read.error.message)
  return registryFrom(valueOr(read, {}))
}

/** A read that writes no definition: a damaged file reads as its last parse. Every reader that gates a registry write stays strict. */
export async function readKeptRegistry(root: string): Promise<RegistryFile> {
  return registryFrom((await readKept(registryPath(root))) ?? {})
}

export const orderedDefs = (reg: RegistryFile): PropertyDefinition[] =>
  resolveRowOrder(Object.entries(reg.defs), ([key]) => key, reg.order).map(([, d]) => d)

export const registryOf = (defs: PropertyDefinition[]): PropertyRegistry =>
  Object.fromEntries(defs.map((d) => [d.id, d]))

export const linkDefs = async (root: string): Promise<PropertyDefinition[]> =>
  Object.values((await readKeptRegistry(root)).defs).filter((d) => d.type === 'link')

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
  fn: (
    registry: RegistryFile,
    stored: Readonly<Record<string, unknown>>,
  ) => { next?: RegistryFile; result: T },
): Promise<T> {
  let result!: T
  const written = await updateNexusFile(
    registryPath(root),
    (raw) => {
      const { registry, unadmitted } = normalizeRegistry(raw)
      const rawDefs = isPlainObject(raw.defs) ? raw.defs : {}
      const edit = fn(registry, rawDefs)
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

// Schema ops that cascade to pages queue on the `.nexus` folder's lock, which nothing they run takes, so one can't land inside another's cascade; a re-taken lock rejects, so only entry points are wrapped.
export const serializeSchemaOp = <T>(root: string, fn: () => Promise<T>): Promise<T> =>
  machine().lock(nexusDir(root), fn)
