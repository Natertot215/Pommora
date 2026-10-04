import { clamp } from '@pommora/uix/Utilities/clamp'
import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { validateDefinition, validateName } from './schema'
import { mintPropertyId } from '../Nexus/ids'
import { freeName } from '../Paths/names'
import {
  defaultStatusSeed,
  defaultSelectSeed,
  holdsList,
  KEY_REFUSAL,
  normalizePropertyName,
  PROPERTY_TYPES,
  type PropertyDefinition,
} from './properties'
import { ok, fail, type Result } from '../Contract/result'
import { renameFrontmatterKey } from '../Files/pageFile'
import { collectionFolders } from './assignment'
import { confirmedKeyHolders, keyHolderFiles } from './keyHolders'
import { sweepGovernedRoots, type Rewrite } from './governedSweep'
import { rekeyHeld, type KeyCollision } from '../Files/heldKeys'
import { withOrderEntry } from '../Contexts/spaceSidecar'
import { normalizeTitle } from '../Paths/caseFold'
import {
  clearSchemaJournal,
  readSchemaJournal,
  schemaCascade,
  writeSchemaJournal,
  type SchemaCascade,
  type SchemaJournal,
} from './propertyJournal'

// Seeds only when the field is undefined; an EMPTY array is a deliberate state, or emptying a select's options then making any unrelated edit would resurrect the seed.
function seeded(def: PropertyDefinition): PropertyDefinition {
  switch (PROPERTY_TYPES[def.type].options) {
    case 'status':
      return def.status_groups === undefined ? { ...def, status_groups: defaultStatusSeed() } : def
    case 'select':
      return def.select_options === undefined
        ? { ...def, select_options: defaultSelectSeed() }
        : def
    case undefined:
      return def
  }
}

export async function createProperty(
  root: string,
  def: PropertyDefinition,
): Promise<Result<{ id: string }>> {
  let landed = ''
  const created = await mutateRegistry<Result<{ id: string }>>(root, (registry) => {
    const defs = Object.values(registry.defs)
    landed = freeName(
      normalizePropertyName(def.name ?? ''),
      defs.map((d) => d.name),
    )
    const candidate = seeded({ ...def, name: landed, id: def.id || mintPropertyId() })
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
  // A landed create wearing a journaled delete's name or id supersedes the record, or a later replay would strip the living property. Only after commit: a refused create must not spend a record it never displaced.
  if (created.ok) {
    const journal = await readSchemaJournal(root)
    if (
      journal?.op === 'delete' &&
      (normalizeTitle(journal.name) === normalizeTitle(landed) || journal.id === created.value.id)
    )
      await clearSchemaJournal(root, journal)
  }
  return created
}

const NEW_KEY_IS_FRESHER: KeyCollision = 'prefer-new'

export async function renameSweep(
  root: string,
  oldName: string,
  def: PropertyDefinition,
): Promise<number> {
  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too. A list property's spellings join; any other keeps the value its read key holds.
  const files = await keyHolderFiles(root, oldName, await collectionFolders(root))
  const join = holdsList(def)
  const text = (content: string): string | null =>
    renameFrontmatterKey(content, oldName, def.name, NEW_KEY_IS_FRESHER, join)
  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldName, def.name, NEW_KEY_IS_FRESHER, join)
  const swept = await sweepGovernedRoots(root, files, {
    text,
    sidecars: withOrderEntry(rekey, 'properties', oldName, def.name),
  })
  return swept.skipped.length
}

export type PropertyRename = { from: string; to: string } & SchemaCascade

/** Validated before the journal and again on the registry it commits to, since a create can land between the two. The journal is staged BEFORE the commit: registry-first ordering means a crash between commit and sweep is recoverable from nowhere else, so the old name survives only there. */
export function renameProperty(
  root: string,
  propertyId: string,
  name: string,
): Promise<Result<PropertyRename | null>> {
  const to = normalizePropertyName(name)
  return serializeSchemaOp(root, async () => {
    const { defs } = await readRegistry(root)
    const prior = defs[propertyId]
    if (!prior) return NO_PROPERTY
    if (to === prior.name) return ok(null)
    const named = validateName(to, Object.values(defs), propertyId)
    if (!named.ok) return named
    // A change of case alone moves no key: every file's spelling already reads as the new name, and the holders a folded query finds are its own.
    const recased = normalizeTitle(to) === normalizeTitle(prior.name)
    const holders = recased
      ? []
      : await confirmedKeyHolders(root, to, await collectionFolders(root))
    if (holders.length) return fail('invalid-property', KEY_REFUSAL.held(to, holders.length))
    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.name, to }
    await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<{ from: string; def: PropertyDefinition }>>(
      root,
      (registry) => {
        const current = registry.defs[propertyId]
        if (!current) return { result: NO_PROPERTY }
        const v = validateName(to, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        const def = { ...current, name: to }
        return {
          next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
          result: ok({ from: current.name, def }),
        }
      },
    )
    if (!edit.ok) {
      await clearSchemaJournal(root, record)
      return edit
    }
    const { from, def } = edit.value
    const skipped = recased ? 0 : await renameSweep(root, from, def)
    if (!skipped) await clearSchemaJournal(root, record)
    return ok({ from, to, ...schemaCascade({ skipped, hosts: [] }, record) })
  })
}

/** Every definition edit but the name, which is renameProperty's since it cascades into every page. */
export function editProperty(
  root: string,
  propertyId: string,
  changes: Omit<Partial<PropertyDefinition>, 'id' | 'name'>,
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
