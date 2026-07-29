import { mutateRegistry } from '../io/propertiesRegistry'
import { validateDefinition, validateName } from '../properties/schema'
import { mintPropertyId } from '../ids'
import { defaultStatusSeed, defaultSelectSeed, type PropertyDefinition } from '@shared/properties'
import { ok, fail, type Result } from '@shared/result'
import { parseDocument, isMap } from 'yaml'
import { assembleEnvelope, splitEnvelope } from '../io/pageFile'
import {
  wrapKey,
  normalizePropertyName,
  invalidPropertyName,
  KEY_REFUSAL,
} from '@shared/governedKeys'
import { cascadePages } from './optionOps'
import { serializeSchemaOp } from './schemaChain'

// Seed defaults for a def that has NONE (the field is undefined — a fresh create, or a type-change
// into select/status). An EMPTY array is a deliberate state (the user deleted every option), never
// re-seeded — else emptying a select's options and then any unrelated edit resurrects the seed.
function seeded(def: PropertyDefinition): PropertyDefinition {
  let d = def
  if (d.type === 'status' && d.status_groups === undefined)
    d = { ...d, status_groups: defaultStatusSeed() }
  if ((d.type === 'select' || d.type === 'multi_select') && d.select_options === undefined) {
    d = { ...d, select_options: defaultSelectSeed() }
  }
  return d
}

/** Mint + persist a nexus-wide definition, appending its id to the nexus order.
 *  Duplicate names are allowed — the flat policy; ids keep twins mechanically safe. */
export function createProperty(
  root: string,
  def: PropertyDefinition,
): Promise<Result<{ id: string }>> {
  return mutateRegistry<Result<{ id: string }>>(root, (registry) => {
    const candidate = seeded({
      ...def,
      name: normalizePropertyName(def.name ?? ''),
      id: def.id || mintPropertyId(),
    })
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
}

/** Edit the global definition in place — every assigning Collection sees the change on next read. */
/** Rewrite one property's key across every page that holds it. The new key always wins: the
 *  registry has already switched, so any value written while this runs used the new name and is
 *  the fresher of the two. Returns null for a page holding neither key, so an untouched page is
 *  never rewritten — and never re-dated, because a key-only rename is not a content edit. */
export function renameSweep(root: string, oldName: string, newName: string): Promise<void> {
  const oldKey = wrapKey('property', oldName)
  const newKey = wrapKey('property', newName)
  return cascadePages(root, (content) => {
    const { frontmatter, body } = splitEnvelope(content)
    const doc = parseDocument(frontmatter)
    // A page whose YAML won't parse is skipped, never thrown on. Every sibling cascade reads
    // through splitFrontmatter, which swallows a parse error; this one parses directly to keep a
    // key's position and comments, so it has to refuse the same cases itself. Without this one
    // hand-edited page ends the walk after the registry has already committed, leaving half the
    // nexus on the old key and reporting the rename as a failure it partly performed.
    if (doc.errors.length > 0 || !isMap(doc.contents)) return null
    const pair = doc.contents.items.find((i) => String(i.key) === oldKey)
    if (!pair) return null
    if (doc.get(newKey) === undefined) {
      // Rename the key in place rather than delete-and-set: the pair keeps its position and any
      // comment attached to it, which a re-add would drop.
      ;(pair.key as { value: string }).value = newKey
    } else {
      // Already present ⇒ a write landed under the new name while this ran, and it is the fresher
      // of the two. Drop the stale one.
      doc.delete(oldKey)
    }
    return assembleEnvelope(doc.toString({ lineWidth: 0 }), body)
  })
}

export function editProperty(
  root: string,
  propertyId: string,
  changes: Partial<PropertyDefinition>,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    let renamedFrom: string | null = null
    const edit = await mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
      const changed = { ...changes }
      if (typeof changed.name === 'string') changed.name = normalizePropertyName(changed.name)
      const next = seeded({ ...current, ...changed, id: propertyId })
      if (next.name !== current.name) {
        if (invalidPropertyName(next.name))
          return { result: fail('invalid-property', KEY_REFUSAL.reservedPrefix) }
        const v = validateName(next.name, Object.values(registry.defs), propertyId)
        if (!v.ok) return { result: v }
        renamedFrom = current.name
      }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    })
    if (!edit.ok) return edit
    // Registry first, then one sweep: every write during it resolves the new name, so the new
    // key is always the fresher of the two and no comparison is needed.
    if (renamedFrom !== null) {
      await renameSweep(root, renamedFrom, normalizePropertyName(changes.name as string))
    }
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
