// Option-level CRUD for Select / Multi-Select properties. setOptions is registry-only (add / recolor
// / reorder) and rides the mutateRegistry chain; the page-touching ops (rename / remove / clear) ride
// the serializeSchemaOp chain, cascading each edit across every assigning collection's pages. Errors
// flow as Result, never thrown.

import { mutateRegistry, readRegistry } from '../io/propertiesRegistry'
import { rewritePageSerialized } from '../io/atomicWrite'
import { indexWrittenPage } from '../indexSeed'
import { validateOptionValues } from '../properties/schema'
import { collectionFolders } from './assignment'
import { keyHolderFiles } from './keyHolders'
import { serializeSchemaOp } from './schemaChain'
import { sweepAdmits } from './util'
import { replacePageValue, stripPageValue } from './pageValue'
import { ok, fail, type Result } from '@shared/result'
import {
  renameOption as renameInArray,
  renameStatusOption as renameStatusInArray,
  type Option,
} from '@shared/optionModel'
import type { PropertyDefinition, PropertyType, StatusGroup } from '@shared/properties'
import { propertyKey } from '@shared/propertyValue'
import { clearSchemaJournal, writeSchemaJournal, type SchemaJournal } from './propertyJournal'

/** These ops edit `select_options`, so they apply to Select / Multi-Select only. A Status property's
 *  options live in `status_groups` (its own per-group ops below); other types have none. Reject anything
 *  else up front — writing select_options onto a status def corrupts it and orphans its page values. */
function requireOptionType(type: PropertyType): Result<null> {
  return type === 'select' || type === 'multi_select'
    ? ok(null)
    : fail('invalid-property', 'Options can only be edited on Select or Multi-Select properties.')
}

/** Replace a Select / Multi-Select property's options wholesale. Validates unique titles and writes
 *  the array verbatim — an emptied array stays empty (no re-seed; the >=1 floor is gone), matching
 *  createProperty and editProperty, which seed only a field that is absent. Rides serializeSchemaOp (like
 *  the page-touching ops) so it can't land inside a concurrent renameOption's cascade and desync the
 *  registry from pages; the actual registry write still goes through mutateRegistry inside. */
export function setOptions(
  root: string,
  propertyId: string,
  options: Option[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
      const typeCheck = requireOptionType(current.type)
      if (!typeCheck.ok) return { result: typeCheck }
      const check = validateOptionValues(options)
      if (!check.ok) return { result: check }
      const next = { ...current, select_options: options }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

/** Replace a Status property's `status_groups` wholesale — the registry-only path behind add / recolor
 *  / reorder (the Status analog of setOptions). Validates unique option values PROPERTY-WIDE (a page's
 *  the value is referenced across all groups), then writes verbatim. Rides serializeSchemaOp so
 *  it can't interleave with a concurrent page cascade. */
export function setStatusGroups(
  root: string,
  propertyId: string,
  groups: StatusGroup[],
): Promise<Result<null>> {
  return serializeSchemaOp(() =>
    mutateRegistry<Result<null>>(root, (registry) => {
      const current = registry.defs[propertyId]
      if (!current) return { result: fail('not-found', 'Property not found.') }
      if (current.type !== 'status') {
        return {
          result: fail('invalid-property', 'Status groups can only be set on a Status property.'),
        }
      }
      const check = validateOptionValues(groups.flatMap((g) => g.options))
      if (!check.ok) return { result: check }
      const next = { ...current, status_groups: groups }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(null),
      }
    }),
  )
}

/** Every option value a def holds, whichever shape its type stores them in — the read the
 *  crash replay shares with nobody else restating it. */
export function optionValues(def: PropertyDefinition): string[] {
  if (def.type === 'status')
    return (def.status_groups ?? []).flatMap((g) => g.options.map((o) => o.value))
  return (def.select_options ?? []).map((o) => o.value)
}

/** Drop one option value from a def's registry entry, whichever shape holds it — the remove
 *  ops' registry finish, shared with the crash replay so both run the identical edit. A value
 *  already gone is a completed finish, not a failure. */
export function dropOptionFromDef(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return mutateRegistry<Result<null>>(root, (registry) => {
    const current = registry.defs[propertyId]
    if (!current) return { result: fail('not-found', 'Property not found.') }
    const next =
      current.type === 'status'
        ? {
            ...current,
            status_groups: (current.status_groups ?? []).map((g) => ({
              ...g,
              options: g.options.filter((o) => o.value !== value),
            })),
          }
        : {
            ...current,
            select_options: (current.select_options ?? []).filter((o) => o.value !== value),
          }
    return {
      next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
      result: ok(null),
    }
  })
}

/** What a page cascade needs about the property it is rewriting: the key the values sit under,
 *  and the type the rewrite must speak. Resolved from the authoritative def, never re-read. */
type CascadeTarget = { type: PropertyType; key: string }

/** The opening move every page-touching option op makes: resolve the property, refuse a type the
 *  op doesn't apply to, and hand back the frontmatter key its values live under. */
async function resolveForCascade(
  root: string,
  propertyId: string,
  requireType: (type: PropertyType) => Result<null>,
): Promise<Result<CascadeTarget>> {
  const def = (await readRegistry(root)).defs[propertyId]
  if (!def) return fail('not-found', 'Property not found.')
  const typeCheck = requireType(def.type)
  if (!typeCheck.ok) return typeCheck
  return ok({ type: def.type, key: propertyKey(def) })
}

/** Strip `value` from every page holding the target's key — the shared tail of clear and remove
 *  on both Select and Status, which differ only in the type check that resolved the target. */
function stripCascade(root: string, target: CascadeTarget, value: string): Promise<number> {
  return cascadePages(root, target.key, (content) =>
    stripPageValue(content, target.key, value, target.type),
  )
}

/** These ops edit a Status property's `status_groups`; reject anything else up front. */
function requireStatusType(type: PropertyType): Result<null> {
  return type === 'status'
    ? ok(null)
    : fail('invalid-property', 'Status options can only be edited on a Status property.')
}

/** Rename a status option (value=title, like Select's renameOption) and cascade the new value onto every
 *  assigning page's stored label. Validates unique values property-wide before any page is touched. */
export function renameStatusOption(
  root: string,
  propertyId: string,
  oldValue: string,
  newTitle: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const record: SchemaJournal = {
      op: 'option-rename',
      id: propertyId,
      from: oldValue,
      to: newTitle,
    }
    if ((await readRegistry(root)).defs[propertyId]) await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<string>>(root, (registry) => {
      const def = registry.defs[propertyId]
      if (!def) return { result: fail('not-found', 'Property not found.') }
      const typeCheck = requireStatusType(def.type)
      if (!typeCheck.ok) return { result: typeCheck }
      const nextGroups = renameStatusInArray(def.status_groups ?? [], oldValue, newTitle)
      const check = validateOptionValues(nextGroups.flatMap((g) => g.options))
      if (!check.ok) return { result: check }
      const next = { ...def, status_groups: nextGroups }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok(propertyKey(def)),
      }
    })
    if (!edit.ok) {
      await clearSchemaJournal(root, record)
      return edit
    }
    const skipped = await cascadePages(root, edit.value, (content) =>
      replacePageValue(content, edit.value, oldValue, newTitle, 'status'),
    )
    if (!skipped) await clearSchemaJournal(root, record)
    return ok(null)
  })
}

/** Clear a status option's value from every page, keeping the option in its group. Registry
 *  untouched, and unjournaled for it — see clearOption. */
export function clearStatusOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const r = await resolveForCascade(root, propertyId, requireStatusType)
    if (!r.ok) return r
    await stripCascade(root, r.value, value)
    return ok(null)
  })
}

/** Remove a status option: strip its value from every page, then drop it from its group. Pages first,
 *  so a def-edit failure never leaves the option gone with its page values orphaned; a skipped
 *  holder defers the drop with the record, as removeOption does. */
export function removeStatusOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const r = await resolveForCascade(root, propertyId, requireStatusType)
    if (!r.ok) return r
    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value }
    await writeSchemaJournal(root, record)
    const skipped = await stripCascade(root, r.value, value)
    if (skipped) return ok(null)
    const dropped = await dropOptionFromDef(root, propertyId, value)
    await clearSchemaJournal(root, record)
    return dropped
  })
}

/** Rewrite the pages holding `key` through `rewrite` (null = the page doesn't hold it, skip) —
 *  the key's queried holders when an index answers, else the corpus, both intersected with the
 *  Collection folders whose schemas govern values. Each page's read-modify-write runs under its
 *  file lock — the SAME lock the cell-write path takes — so a cascade and a concurrent cell
 *  edit on one page can't clobber each other. Per file, not all-or-nothing across pages: a
 *  partly-applied rename/strip is recoverable by re-running and each page stays individually
 *  valid. Shared by rename (replace) and remove/clear (strip). Returns how many holders it
 *  could not read — the rewrite callback only runs on a read that landed, so its silence is
 *  the skip signal; a journaled caller holds its record while any remain. */
export async function cascadePages(
  root: string,
  key: string,
  rewrite: (content: string) => string | null,
): Promise<number> {
  const folders = await collectionFolders(root)
  let unreadable = 0
  for (const file of await keyHolderFiles(root, key, folders)) {
    let read = false
    const wrote = await rewritePageSerialized(file, (content) => {
      read = true
      return sweepAdmits(content) ? rewrite(content) : null
    })
    if (!read) unreadable++
    if (wrote) await indexWrittenPage(root, file)
  }
  return unreadable
}

/** Rename an option (value=label → newTitle) and cascade the new value onto every page that held the
 *  old one. The registry edit rides mutateRegistry and validates unique titles — a collision fails
 *  before any page is touched; the page cascade rides this serializeSchemaOp. */
export function renameOption(
  root: string,
  propertyId: string,
  oldValue: string,
  newTitle: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    // Journal BEFORE the commit (registry-first order): a crash between commit and cascade is
    // recoverable only from this record. Def-gated so an op the registry will refuse outright
    // journals nothing; a record stranded by a refusal or throw is disposed of by the replay's
    // holds-to-and-not-from gate.
    const record: SchemaJournal = {
      op: 'option-rename',
      id: propertyId,
      from: oldValue,
      to: newTitle,
    }
    if ((await readRegistry(root)).defs[propertyId]) await writeSchemaJournal(root, record)
    const edit = await mutateRegistry<Result<CascadeTarget>>(root, (registry) => {
      const def = registry.defs[propertyId]
      if (!def) return { result: fail('not-found', 'Property not found.') }
      const typeCheck = requireOptionType(def.type)
      if (!typeCheck.ok) return { result: typeCheck }
      const nextOptions = renameInArray(def.select_options ?? [], oldValue, newTitle)
      const check = validateOptionValues(nextOptions)
      if (!check.ok) return { result: check }
      const next = { ...def, select_options: nextOptions }
      return {
        next: { ...registry, defs: { ...registry.defs, [propertyId]: next } },
        result: ok({ type: def.type, key: propertyKey(def) }),
      }
    })
    if (!edit.ok) {
      await clearSchemaJournal(root, record)
      return edit
    }
    const skipped = await cascadePages(root, edit.value.key, (content) =>
      replacePageValue(content, edit.value.key, oldValue, newTitle, edit.value.type),
    )
    if (!skipped) await clearSchemaJournal(root, record)
    return ok(null)
  })
}

/** Clear an option's value from every page, keeping the option in the def. Page-only fan-out on the
 *  serializeSchemaOp chain; the registry is untouched — which is why it is also unjournaled: its
 *  crash residue disagrees with nothing (every remaining value is still a legal option), the same
 *  razor that keeps removeProperty outside the journal. */
export function clearOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const r = await resolveForCascade(root, propertyId, requireOptionType)
    if (!r.ok) return r
    await stripCascade(root, r.value, value)
    return ok(null)
  })
}

/** Remove an option: strip its value from every page, then drop it from the def. Pages first (as
 *  deleteProperty does) so a def edit failure never leaves the option gone with its values orphaned.
 *  A strip that could not read every holder defers the registry drop with it — the record stays,
 *  and the next open's replay re-runs both once the pages read. */
export function removeOption(
  root: string,
  propertyId: string,
  value: string,
): Promise<Result<null>> {
  return serializeSchemaOp(async () => {
    const r = await resolveForCascade(root, propertyId, requireOptionType)
    if (!r.ok) return r
    const record: SchemaJournal = { op: 'option-remove', id: propertyId, value }
    await writeSchemaJournal(root, record)
    const skipped = await stripCascade(root, r.value, value)
    if (skipped) return ok(null)
    const dropped = await dropOptionFromDef(root, propertyId, value)
    await clearSchemaJournal(root, record)
    return dropped
  })
}
