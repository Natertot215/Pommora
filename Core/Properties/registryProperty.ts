import { clamp } from '@pommora/uix/Utilities/clamp'
import { mutateRegistry, readRegistry, NO_PROPERTY, serializeSchemaOp } from './propertiesRegistry'
import { validateDefinition, validateName } from './schema'
import { mintPropertyId } from '../Nexus/ids'
import { freeName } from '../Paths/names'
import { exactTitle } from '../Paths/caseFold'
import {
  defaultStatusSeed,
  defaultSelectSeed,
  KEY_REFUSAL,
  PROPERTY_TYPES,
  type PropertyDefinition,
  type PropertyDraft,
} from './properties'
import { ok, fail, type Result } from '../Contract/result'
import { renameFrontmatterKey } from '../Files/pageFile'
import { collectionFolders } from './assignment'
import { confirmedKeyHolders, keyHolderFiles } from './keyHolders'
import { sweepGovernedRoots, type Rewrite } from './governedSweep'
import { rekeyHeld, type KeyCollision } from '../Files/heldKeys'
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
  def: PropertyDraft,
): Promise<Result<{ id: string }>> {
  let landed = ''
  const created = await mutateRegistry<Result<{ id: string }>>(root, (registry) => {
    const defs = Object.values(registry.defs)
    landed = freeName(
      exactTitle(def.label),
      defs.map((d) => d.label),
    )
    const candidate = seeded({ ...def, label: landed, key: landed, id: def.id || mintPropertyId() })
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
    if (journal?.op === 'delete' && (journal.name === landed || journal.id === created.value.id))
      await clearSchemaJournal(root, journal)
  }
  return created
}

const NEW_KEY_IS_FRESHER: KeyCollision = 'prefer-new'

export async function renameSweep(
  root: string,
  oldKey: string,
  def: PropertyDefinition,
): Promise<number> {
  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding both holds the old one too.
  const files = await keyHolderFiles(root, oldKey, await collectionFolders(root))
  const text = (content: string): string | null =>
    renameFrontmatterKey(content, oldKey, def.key, NEW_KEY_IS_FRESHER)
  const rekey: Rewrite = (raw) => rekeyHeld(raw, oldKey, def.key, NEW_KEY_IS_FRESHER)
  const swept = await sweepGovernedRoots(root, files, { text, sidecars: rekey })
  return swept.skipped.length
}

export type PropertyRename = { from: string; to: string } & SchemaCascade

async function bothKeyHolders(root: string, from: string, to: string): Promise<string[]> {
  const folders = await collectionFolders(root)
  const fromHolders = await confirmedKeyHolders(root, from, folders)
  if (fromHolders.length === 0) return []
  const toHolders = new Set(await confirmedKeyHolders(root, to, folders))
  return fromHolders.filter((f) => toHolders.has(f))
}

/** Validated before the journal and again on the registry it commits to, since a create can land between the two. The journal is staged BEFORE the commit: registry-first ordering means a crash between commit and sweep is recoverable from nowhere else, so the old name survives only there. */
export function renameProperty(
  root: string,
  propertyId: string,
  label: string,
): Promise<Result<PropertyRename | null>> {
  const to = exactTitle(label)
  return serializeSchemaOp(root, async () => {
    const { defs } = await readRegistry(root)
    const prior = defs[propertyId]
    if (!prior) return NO_PROPERTY
    if (to === prior.label) return ok(null)
    const named = validateName(to, Object.values(defs), propertyId)
    if (!named.ok) return named
    // A file holding only the new key is adopted, its value going live as a create's would; one holding both would lose its old value.
    const clashes = await bothKeyHolders(root, prior.key, to)
    if (clashes.length)
      return fail('invalid-property', KEY_REFUSAL.held(prior.key, to, clashes.length))
    const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.key, to }
    await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<{ from: string; def: PropertyDefinition }>>(
      root,
      (registry) => {
        const current = registry.defs[propertyId]
        if (!current) return { result: NO_PROPERTY }
        const v = validateName(to, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        const def = { ...current, label: to, key: to }
        return {
          next: { ...registry, defs: { ...registry.defs, [propertyId]: def } },
          result: ok({ from: current.key, def }),
        }
      },
    )
    if (!edit.ok) {
      await clearSchemaJournal(root, record)
      return edit
    }
    const { from, def } = edit.value
    const skipped = await renameSweep(root, from, def)
    if (!skipped) await clearSchemaJournal(root, record)
    return ok({ from, to, ...schemaCascade({ skipped, hosts: [] }, record) })
  })
}

/** Every definition edit but the label and key, which are renameProperty's since the key cascades into every page. */
export function editProperty(
  root: string,
  propertyId: string,
  changes: Omit<Partial<PropertyDefinition>, 'id' | 'label' | 'key'>,
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
