import { mutateRegistry, readRegistry } from '../IO/propertiesRegistry'
import { validateDefinition, validateName } from '../Properties/schema'
import { mintPropertyId } from '../ids'
import {
  defaultStatusSeed,
  defaultSelectSeed,
  hasSelectOptions,
  type PropertyDefinition,
} from '@shared/properties'
import { ok, fail, type Result } from '@shared/result'
import { renameFrontmatterKey, type KeyCollision } from '../IO/pageFile'
import {
  wrapKey,
  normalizePropertyName,
  invalidPropertyName,
  KEY_REFUSAL,
} from '@shared/governedKeys'
import { cascadePages } from './optionOps'
import {
  clearSchemaJournal,
  readSchemaJournal,
  writeSchemaJournal,
  type SchemaJournal,
} from './propertyJournal'
import { serializeSchemaOp } from './schemaChain'

// Seed defaults for a def that has NONE (the field is undefined — a fresh create, or a type-change
// into select/status). An EMPTY array is a deliberate state (the user deleted every option), never
// re-seeded — else emptying a select's options and then any unrelated edit resurrects the seed.
function seeded(def: PropertyDefinition): PropertyDefinition {
  let d = def
  if (d.type === 'status' && d.status_groups === undefined)
    d = { ...d, status_groups: defaultStatusSeed() }
  if (hasSelectOptions(d.type) && d.select_options === undefined) {
    d = { ...d, select_options: defaultSelectSeed() }
  }
  return d
}

/** Mint + persist a nexus-wide definition, appending its id to the nexus order. A title already
 *  taken is refused, case-folded: the title IS the key a property's values write under. */
export async function createProperty(
  root: string,
  def: PropertyDefinition,
): Promise<Result<{ id: string }>> {
  const created = await mutateRegistry<Result<{ id: string }>>(root, (registry) => {
    const candidate = seeded({
      ...def,
      name: normalizePropertyName(def.name ?? ''),
      id: def.id || mintPropertyId(),
    })
    if (!candidate.name) return { result: fail('invalid-property', KEY_REFUSAL.empty) }
    if (invalidPropertyName(candidate.name))
      return { result: fail('invalid-property', KEY_REFUSAL.reservedPrefix) }
    const v = validateDefinition(candidate, Object.values(registry.defs))
    if (!v.ok) return { result: v }
    return {
      next: {
        order: [...registry.order.filter((id) => id !== candidate.id), candidate.id],
        defs: { ...registry.defs, [candidate.id]: candidate },
      },
      result: ok({ id: candidate.id }),
    }
  })
  // A LANDED create wearing a journaled delete's name or id supersedes the record: it's a
  // re-create (or a restore, which funnels through here with the recorded id), and a later
  // replay completing that delete would strip the living property instead of a dead one. Only
  // after the commit — a refused create must not spend the record it never displaced.
  if (created.ok) {
    const journal = await readSchemaJournal(root)
    if (
      journal?.op === 'delete' &&
      (journal.name === normalizePropertyName(def.name ?? '') || journal.id === created.value.id)
    )
      await clearSchemaJournal(root, journal)
  }
  return created
}

/** A property rename commits the registry BEFORE its sweep, so a value written while the sweep runs
 *  already resolved the new name: a key already wearing it is genuinely the fresher of the two. */
const NEW_KEY_IS_FRESHER: KeyCollision = 'prefer-new'

/** Rewrite one property's key across every page that holds it, in place — the key keeps its
 *  position and its comment. A page holding neither key is left untouched. Returns the holders
 *  it could not read, so a journaled caller holds its record while any remain. */
export function renameSweep(root: string, oldName: string, newName: string): Promise<number> {
  const oldKey = wrapKey('property', oldName)
  const newKey = wrapKey('property', newName)
  // Queried by the OLD key: a page holding only the new one needs no rewrite, and one holding
  // both holds the old one too, so the holder set covers every fold the collision arm can meet.
  return cascadePages(root, oldKey, (content) =>
    renameFrontmatterKey(content, oldKey, newKey, NEW_KEY_IS_FRESHER),
  )
}

/** The old and new names a committed rename has to sweep across the pages, or null when the edit
 *  left the name alone. */
type Rename = { from: string; to: string }

/** Stage a rename's record, or null when this edit renames nothing. BEFORE the commit:
 *  registry-first ordering means a crash between commit and sweep is recoverable from nowhere
 *  else — the old name survives only here. The pre-read is advisory (mutateRegistry revalidates);
 *  a record for an edit that then fails is cleared on that path, and one stranded by a throw is
 *  disposed of by the id-gated replay. */
async function stageRename(
  root: string,
  propertyId: string,
  name: string | undefined,
): Promise<SchemaJournal | null> {
  const prior = (await readRegistry(root)).defs[propertyId]
  if (!prior || typeof name !== 'string') return null
  const to = normalizePropertyName(name)
  if (!to || to === prior.name) return null
  const record: SchemaJournal = { op: 'rename', id: propertyId, from: prior.name, to }
  await writeSchemaJournal(root, record)
  return record
}

/** Edit the global definition in place — every assigning Collection sees the change on next read.
 *  A name change commits the registry first, then sweeps the pages once. */
export function editProperty(
  root: string,
  propertyId: string,
  changes: Partial<PropertyDefinition>,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const record = await stageRename(root, propertyId, changes.name)
    const edit = await mutateRegistry<Result<Rename | null>>(root, (registry) => {
      let rename: Rename | null = null
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
      const changed = { ...changes }
      if (typeof changed.name === 'string') changed.name = normalizePropertyName(changed.name)
      const next = seeded({ ...current, ...changed, id: propertyId })
      if (next.name !== current.name) {
        if (!next.name) return { result: fail('invalid-property', KEY_REFUSAL.empty) }
        if (invalidPropertyName(next.name))
          return { result: fail('invalid-property', KEY_REFUSAL.reservedPrefix) }
        const v = validateName(next.name, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        rename = { from: current.name, to: next.name }
      }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(rename),
      }
    })
    if (!edit.ok) {
      if (record) await clearSchemaJournal(root, record)
      return edit
    }
    // Registry first, then one sweep: every write during it resolves the new name, so the new
    // key is always the fresher of the two and no comparison is needed. A holder the sweep
    // could not read holds the record — the next open's replay retries.
    const skipped = edit.value ? await renameSweep(root, edit.value.from, edit.value.to) : 0
    if (record && !skipped) await clearSchemaJournal(root, record)
    return ok(null)
  })
}

/** Bare registry delete — no value scrub or assignment cleanup; `deleteProperty` wraps this. */
export function removeFromRegistry(root: string, propertyId: string): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    if (!registry.defs[propertyId]) return { result: fail('not-found', 'Property not found.') }
    const defs = { ...registry.defs }
    delete defs[propertyId]
    return {
      next: { order: registry.order.filter((id) => id !== propertyId), defs },
      result: ok(null),
    }
  })
}

/** Move propertyId to toIndex in the nexus-wide cosmetic order. Clamped; unknown id fails. */
export function reorderRegistry(
  root: string,
  propertyId: string,
  toIndex: number,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    if (!(propertyId in registry.defs)) return { result: fail('not-found', 'Property not found.') }
    const order = registry.order.filter((id) => id !== propertyId)
    order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, propertyId)
    return { next: { ...registry, order }, result: ok(null) }
  })
}
