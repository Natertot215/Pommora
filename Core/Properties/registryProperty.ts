import { clamp } from '@pommora/uix/Utilities/clamp'
import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { validateDefinition, validateName } from './schema'
import { mintPropertyId } from '../Nexus/ids'
import { freeName } from '../Paths/names'
import { exactTitle, normalizeTitle } from '../Paths/caseFold'
import { formatKey, type KeyFormat } from './keyFormat'
import { mapOptions } from './optionModel'
import {
  defaultStatusSeed,
  defaultSelectSeed,
  KEY_REFUSAL,
  optionGroupsOf,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type PropertyDraft,
  withOptionGroups,
} from './properties'
import { ok, fail, type Result } from '../Contract/result'
import { renameFrontmatterKey } from '../Files/pageFile'
import { collectionFolders } from './assignment'
import { confirmedKeyHolders, keyHolderFiles } from './keyHolders'
import { sweepCount, sweepGovernedRoots, type SweepPlan } from './governedSweep'
import { rekeyHeld, type KeyCollision } from '../Files/rootValues'
import {
  clearSchemaJournal,
  readSchemaJournal,
  schemaCascade,
  writeSchemaJournal,
  type SchemaCascade,
  type SchemaJournal,
} from './propertyJournal'

const withOptionKeys = (def: PropertyDefinition): PropertyDefinition =>
  withOptionGroups(
    def,
    mapOptions(optionGroupsOf(def), (o) => ({ ...o, key: formatKey(o.label, def.value_format) })),
  )

// Seeds only when the field is undefined; an EMPTY array is a deliberate state, or emptying a select's options then making any unrelated edit would resurrect the seed.
function seeded(def: PropertyDefinition): PropertyDefinition {
  switch (PROPERTY_TYPES[def.type].options) {
    case 'status':
      return def.status_groups === undefined
        ? withOptionKeys({ ...def, status_groups: defaultStatusSeed() })
        : def
    case 'select':
      return def.select_options === undefined
        ? withOptionKeys({ ...def, select_options: defaultSelectSeed() })
        : def
    case undefined:
      return def
  }
}

function freeLabel(
  label: string,
  format: KeyFormat | undefined,
  defs: PropertyDefinition[],
  owed: readonly string[],
): string {
  const labels = defs.map((d) => d.label)
  const keys = new Set([...defs.map((d) => d.key), ...owed].map(normalizeTitle))
  let free = freeName(label, labels)
  while (keys.has(normalizeTitle(formatKey(free, format)))) {
    labels.push(free)
    free = freeName(free, labels)
  }
  return free
}

export async function createProperty(
  root: string,
  def: PropertyDraft,
): Promise<Result<{ id: string }>> {
  let key = ''
  const journal = await readSchemaJournal(root)
  const owed = journal?.op === 'rename' ? [journal.from] : []
  const created = await mutateRegistry<Result<{ id: string }>>(root, (registry) => {
    const defs = Object.values(registry.defs)
    const label = freeLabel(exactTitle(def.label), def.key_format, defs, owed)
    key = formatKey(label, def.key_format)
    const candidate = seeded({ ...def, label, key, id: def.id || mintPropertyId() })
    const v = validateDefinition(candidate, defs)
    if (!v.ok) return { result: v }
    return {
      next: {
        order: [...registry.order.filter((id) => id !== candidate.id), candidate.id],
        defs: { ...registry.defs, [candidate.id]: candidate },
      },
      result: ok({ id: candidate.id }),
    }
  })
  // A landed create wearing a journaled delete's key or id supersedes the record, or a later replay would strip the living property. Only after commit: a refused create must not spend a record it never displaced.
  if (
    created.ok &&
    journal?.op === 'delete' &&
    (journal.key === key || journal.id === created.value.id)
  )
    await clearSchemaJournal(root, journal)
  return created
}

const NEW_KEY_IS_FRESHER: KeyCollision = 'prefer-new'

async function renamePlan(
  root: string,
  from: string,
  to: string,
): Promise<{ files: string[]; plan: SweepPlan }> {
  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
  const files = await keyHolderFiles(root, from, await collectionFolders(root))
  const text = (content: string): string | null =>
    renameFrontmatterKey(content, from, to, NEW_KEY_IS_FRESHER)
  return { files, plan: { text, sidecars: (raw) => rekeyHeld(raw, from, to, NEW_KEY_IS_FRESHER) } }
}

export async function renameSweep(root: string, from: string, to: string): Promise<number> {
  const { files, plan } = await renamePlan(root, from, to)
  return (await sweepGovernedRoots(root, files, plan)).skipped.length
}

export type PropertyRename = { from: string; to: string } & SchemaCascade

async function bothKeyHolders(root: string, from: string, to: string): Promise<string[]> {
  const folders = await collectionFolders(root)
  const fromHolders = await confirmedKeyHolders(root, from, folders)
  if (fromHolders.length === 0) return []
  const toHolders = new Set(await confirmedKeyHolders(root, to, folders))
  return fromHolders.filter((f) => toHolders.has(f))
}

type Retitle = Pick<PropertyDefinition, 'label'> | Pick<PropertyDefinition, 'key_format'>

const retitled = (def: PropertyDefinition, change: Retitle): PropertyDefinition => {
  const next = { ...def, ...change }
  return { ...next, key: formatKey(next.label, next.key_format) }
}

async function rekeyPlan(
  root: string,
  propertyId: string,
  change: Retitle,
): Promise<Result<{ prior: PropertyDefinition; moved: PropertyDefinition } | null>> {
  const { defs } = await readRegistry(root)
  const prior = defs[propertyId]
  if (!prior) return NO_PROPERTY
  const moved = retitled(prior, change)
  if (moved.label === prior.label && moved.key_format === prior.key_format) return ok(null)
  const named = validateName(moved, Object.values(defs), propertyId)
  if (!named.ok) return named
  // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
  const clashes = moved.key === prior.key ? [] : await bothKeyHolders(root, prior.key, moved.key)
  if (clashes.length)
    return fail('invalid-property', KEY_REFUSAL.held(prior.key, moved.key, clashes.length))
  return ok({ prior, moved })
}

export async function keyFormatHolders(
  root: string,
  propertyId: string,
  key_format: KeyFormat,
): Promise<Result<number>> {
  const planned = await rekeyPlan(root, propertyId, { key_format })
  if (!planned.ok) return planned
  if (!planned.value || planned.value.moved.key === planned.value.prior.key) return ok(0)
  const { files, plan } = await renamePlan(root, planned.value.prior.key, planned.value.moved.key)
  return ok(await sweepCount(root, files, plan))
}

/** Validated before the journal and again on the registry it commits to, since a create can land between the two. The journal is staged BEFORE the commit: registry-first ordering means a crash between commit and sweep is recoverable from nowhere else, so the old key survives only there. */
function rekeyProperty(
  root: string,
  propertyId: string,
  change: Retitle,
): Promise<Result<PropertyRename | null>> {
  return serializeSchemaOp(root, async () => {
    const planned = await rekeyPlan(root, propertyId, change)
    if (!planned.ok) return planned
    if (!planned.value) return ok(null)
    const { prior, moved } = planned.value
    const moves = moved.key !== prior.key
    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.key, to: moved.key }
    if (moves) await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<{ from: string; def: PropertyDefinition }>>(
      root,
      (registry) => {
        const current = registry.defs[propertyId]
        if (!current) return { result: NO_PROPERTY }
        const def = retitled(current, change)
        const v = validateName(def, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        return {
          next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
          result: ok({ from: current.key, def }),
        }
      },
    )
    if (!edit.ok) {
      if (moves) await clearSchemaJournal(root, record)
      return edit
    }
    const { from, def } = edit.value
    const skipped = from === def.key ? 0 : await renameSweep(root, from, def.key)
    if (moves && !skipped) await clearSchemaJournal(root, record)
    return ok({ from, to: def.key, ...schemaCascade({ skipped, hosts: [] }, record) })
  })
}

export const renameProperty = (
  root: string,
  propertyId: string,
  label: string,
): Promise<Result<PropertyRename | null>> =>
  rekeyProperty(root, propertyId, { label: exactTitle(label) })

export const setKeyFormat = (
  root: string,
  propertyId: string,
  key_format: KeyFormat,
): Promise<Result<PropertyRename | null>> => rekeyProperty(root, propertyId, { key_format })

/** Every definition edit but the label, the key, and the formats, which ride the rename paths since each can move keys in every file. */
export function editProperty(
  root: string,
  propertyId: string,
  changes: Omit<
    Partial<PropertyDefinition>,
    'id' | 'label' | 'key' | 'key_format' | 'value_format'
  >,
): Promise<Result<null>> {
  return serializeSchemaOp(root, () =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: NO_PROPERTY }
      const next = seeded({ ...current, ...changes, id: propertyId })
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

export function removeFromRegistry(root: string, propertyId: string): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    if (!registry.defs[propertyId]) return { result: NO_PROPERTY }
    const defs = { ...registry.defs }
    delete defs[propertyId]
    return {
      next: { order: registry.order.filter((id) => id !== propertyId), defs },
      result: ok(null),
    }
  })
}

export function reorderRegistry(
  root: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    if (!(propertyId in registry.defs)) return { result: NO_PROPERTY }
    const order = registry.order.filter((id) => id !== propertyId)
    order.splice(clamp(toIndex, 0, order.length), 0, propertyId)
    return { next: { ...registry, order }, result: ok(null) }
  })
}
